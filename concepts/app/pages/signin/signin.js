// Email-first demo sign-in: directory discovery routes to a workspace;
// only the admin email can authenticate. Saved PINs are keyed by email.
import {encodeHtml} from '../../core/locale.js'

const ACCOUNTS_KEY = 'skey-proto-accounts'
const LEGACY_CRED_KEY = 'skey-proto-cred'

const normalizeEmail = value => String(value || '').trim().toLowerCase()
const ADMIN_EMAIL = 'admin@lastchance.local'
// Discovery is not authorization: only ADMIN_EMAIL can authenticate.
const DEMO_DIRECTORY = new Map([
  [ADMIN_EMAIL, 'lastchance'],
  ['manager@lastchance.local', 'lastchance'],
  ['sara@acme.local', 'acme'],
  ['omar@nilefoods.local', 'nilefoods'],
  ['pending@lastchance.local', null],
])

function saveAccounts(list) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list))
  localStorage.removeItem(LEGACY_CRED_KEY)
}

function loadAccounts() {
  let list
  try { list = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]') } catch { list = [] }
  if (!Array.isArray(list)) list = []
  // Retire old {tenant, user} records without migrating them. Workspace
  // always comes from the directory, never from a stored credential.
  const records = new Map()
  for (const record of list) {
    if (!record || record.user !== undefined || !record.email || typeof record.pinHash !== 'string' || !record.pinHash) continue
    const email = normalizeEmail(record.email)
    const tenant = DEMO_DIRECTORY.get(email)
    if (!tenant) continue
    records.set(email, {...record, email, tenant,
      branch: branchesFor(tenant).includes(record.branch) ? record.branch : null})
  }
  const valid = [...records.values()]
  saveAccounts(valid)
  return valid
}

function findAccount(email) {
  return loadAccounts().find(record => record.email === normalizeEmail(email)) || null
}

function upsertAccount(record) {
  const list = loadAccounts()
  const at = list.findIndex(existing => existing.email === record.email)
  if (at >= 0) list[at] = record
  else list.push(record)
  saveAccounts(list)
}

function forgetAccount(email) {
  saveAccounts(loadAccounts().filter(record => record.email !== normalizeEmail(email)))
}

/* Demo branches per workspace — names match the shell's .branch-submenu
   exactly so a picked branch can drive its aria-checked radio. */
const TENANT_BRANCHES = {
  lastchance: ['Cairo HQ', 'Alexandria', 'Giza'],
  acme: ['Cairo HQ', 'Alexandria'],
}

const branchesFor = name => TENANT_BRANCHES[String(name || '').trim().toLowerCase()] || []

/* Prototype-only PIN digest (djb2) — keeps the raw PIN out of the stored
   record without pretending to be real security for a 6-digit demo code.
   One digest for both the save panes' create and the PIN pane's verify. */
function hashPin(pin) {
  let hash = 5381
  for (const char of String(pin)) hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0
  return hash.toString(36)
}

export function createSignIn({root, t, onSignIn, subscribe, toast} = {}) {
  const $ = selector => root.querySelector(selector)
  const panes = () => [...root.querySelectorAll('[data-si-pane]')]
  const email = () => $('#si-email')
  let tenantName = ''
  let authenticatedEmail = null
  let focusToken = 0
  let activeFocusCleanup = null
  const pass = () => $('#si-pass')
  const showBtn = () => $('#si-show')
  const signinBtn = () => $('#si-signin')
  const errBox = () => $('[data-si-err]')
  const capsNote = () => $('[data-si-caps]')
  const pinInput = () => $('#si-pin')
  const pinSigninBtn = () => $('#si-pin-signin')
  const pinErr = () => $('#si-pin-err')

  const currentAccount = () => findAccount(email().value)

  function refreshWho() {
    $('#si-who').textContent = `${normalizeEmail(email().value)} · ${tenantName}.skeyerp.com${branch ? ` · ${branch}` : ''}`
    $('#si-auth-email').value = normalizeEmail(email().value)
  }

  function refreshUsePin() {
    $('#si-usepin-wrap').hidden = !currentAccount()?.pinHash
  }

  function clearAttempt() {
    branch = null
    tenantName = ''
    authenticatedEmail = null
    pass().value = ''
    hideError()
  }

  /* Where "start over" lands: the picker when 2+ accounts are saved,
     otherwise the email step. */
  const startOver = () => show(loadAccounts().length >= 2 ? 'accounts' : 1)

  let unsubscribeLocale = null
  /* Which auth pane a "Back to sign in" returns to — the step the user
     actually came from, so sub-pages opened from step 2 go back to 2. */
  let lastAuthPane = '1'
  /* Branch picked for this sign-in attempt (null until the branch pane —
      or a saved credential — decides one). */
  let branch = null
  /* Drops per-pane transient state (success boxes, disabled flow buttons)
     when a pane is (re)entered, so a completed demo flow never replays. */
  function resetPaneState(pane) {
    pane.querySelectorAll('[data-si-ok]').forEach(box => {
      box.classList.add('hidden')
      box.textContent = ''
    })
    pane.querySelectorAll('button[disabled]').forEach(button => {
      button.disabled = false
    })
  }

  function show(paneId) {
    const id = String(paneId)
    activeFocusCleanup?.()
    const token = ++focusToken
    if (['1', '2', 'pin', 'accounts'].includes(id)) authenticatedEmail = null
    if (id === '1') clearAttempt()
    panes().forEach(pane => {
      pane.hidden = pane.dataset.siPane !== id
    })
    if (id === '1' || id === '2') lastAuthPane = id
    const active = panes().find(pane => pane.dataset.siPane === id)
    if (!active) return
    if (id === '2') {
      refreshWho()
      refreshUsePin()
    }
    if (id === 'accounts') renderAccounts()
    if (id === 'reset') {
      const resetUser = $('#si-reset-user')
      resetUser.value = normalizeEmail(email().value)
    }
    if (id === 'request') $('#si-req-email').value = normalizeEmail(email().value)
    if (id === 'pin') {
      const record = currentAccount()
      refreshPinIntro()
      pinInput().value = ''
      pinInput().removeAttribute('aria-invalid')
      pinErr().classList.add('hidden')
      pinErr().textContent = ''
      $('#si-pin-else').classList.add('hidden')
      pinSigninBtn().textContent = t('Sign in with PIN')
      $('#si-pin-forget-wrap').hidden = !record
      if (record) {
        $('#si-pin-who').textContent = record.branch
          ? `${record.email} · ${record.branch} · ${record.tenant}.skeyerp.com`
          : `${record.email} · ${record.tenant}.skeyerp.com`
      } else {
        $('#si-pin-who').textContent = `${normalizeEmail(email().value)} · ${tenantName}.skeyerp.com`
      }
    }
    if (id === 'save') {
      $('#si-save-who').textContent = `${normalizeEmail(email().value)} · ${tenantName}.skeyerp.com`
    }
    if (id === 'savepin') {
      const pin1 = $('#si-save-pin')
      const pin2 = $('#si-save-pin2')
      const err = $('#si-save-pin-err')
      pin1.value = ''
      pin2.value = ''
      pin1.removeAttribute('aria-invalid')
      pin2.removeAttribute('aria-invalid')
      err.classList.add('hidden')
      err.textContent = ''
    }
    resetPaneState(active)
    const selector = active.dataset.siFocus
    const target = (selector && active.querySelector(selector)) || active.querySelector('h1')
    // Cancel even if the user interacts and then leaves the pane before
    // the timer runs. Looking only at activeElement would lose that history.
    let interacted = active.contains(active.ownerDocument.activeElement)
    const markInteraction = () => { interacted = true }
    const events = ['focusin', 'pointerdown', 'keydown', 'input']
    events.forEach(type => active.addEventListener(type, markInteraction, true))
    const timer = setTimeout(() => {
      cleanup()
      if (token !== focusToken || active.hidden || interacted) return
      if (active.contains(active.ownerDocument.activeElement)) return
      target?.focus()
    }, 60)
    function cleanup() {
      clearTimeout(timer)
      events.forEach(type => active.removeEventListener(type, markInteraction, true))
      if (activeFocusCleanup === cleanup) activeFocusCleanup = null
    }
    activeFocusCleanup = cleanup
  }

  function defaultSigninLabel() {
    signinBtn().textContent = t('Sign in with password')
  }

  function hideError() {
    errBox().classList.add('hidden')
    errBox().textContent = ''
    pass().removeAttribute('aria-invalid')
  }

  /* Publishes the picked branch to the shell's branch menu — topbar.js
     reads aria-checked off .branch-submenu [data-branch], so the app
     opens on the branch the user chose during sign-in. */
  function applyBranch() {
    if (!branch) return
    root.ownerDocument.querySelectorAll('.branch-submenu [data-branch]').forEach(button => {
      button.setAttribute('aria-checked', String(button.dataset.branch === branch))
    })
  }

  /* The single completion point every auth path shares: publish the
     branch to the shell, then let main.js flip the session (toast +
     toggle). Password auth routes through postAuth() first, which parks
     on the save step only when the signing-in identity has no saved
     PIN. */
  function complete() {
    if (authenticatedEmail !== ADMIN_EMAIL) return
    applyBranch()
    onSignIn?.({email: authenticatedEmail, tenant: DEMO_DIRECTORY.get(authenticatedEmail)})
  }
  function postAuth() {
    if (currentAccount()?.pinHash) complete()
    else show('save')
  }

  /* Renders the branch radios for the current tenant; keeps a previously
     picked branch when it still belongs to this workspace, otherwise the
     first branch. The list starts empty — only branch-bearing tenants
     ever reach this pane. */
  function renderBranches(branches) {
    const list = $('#si-branch-list')
    list.innerHTML = branches
      .map(
        name => `
          <label class="flex cursor-pointer items-center gap-3 rounded-md border border-line bg-surface px-3 py-2 hover:border-[var(--accent-line)] focus-within:[box-shadow:0_0_0_3px_var(--accent-soft)]">
            <input type="radio" name="skey-signin-branch" value="${name}" class="size-4 accent-[var(--accent)]" ${branch === name ? 'checked' : ''}>
            <span class="text-sm font-medium text-ink" dir="ltr">${name}</span>
          </label>`
      )
      .join('')
  }

  /* Picker rows for 2+ saved accounts: the row picks (identity syncs, PIN
     pane), the × forgets just that record. Rendered with t() because
     dynamic strings own no data-i18n. */
  const eligibilityMessage = 'This demo only supports signing in as admin@lastchance.local. Use another account to continue.'

  function refreshPinIntro() {
    $('#si-pin-intro').textContent = t(currentAccount()?.email === ADMIN_EMAIL
      ? 'You saved this sign-in — enter your 6-digit PIN to continue.'
      : eligibilityMessage)
  }

  function renderAccounts() {
    const accounts = loadAccounts()
    $('#si-accounts-list').innerHTML = accounts
      .map((record, index) => {
        const host = `${encodeHtml(record.tenant)}.skeyerp.com`
        const initial = encodeHtml((record.email || '?').trim().charAt(0).toUpperCase())
        const secondary = record.branch ? encodeHtml(record.branch) : host
        return `
          <div class="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 hover:border-[var(--accent-line)] focus-within:[box-shadow:0_0_0_3px_var(--accent-soft)]" role="listitem">
            <button type="button" class="flex min-w-0 flex-1 items-start gap-3 border-0 bg-transparent p-0 text-start" data-si-pick="${index}">
              <span class="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--line-2)] text-sm font-semibold text-ink" aria-hidden="true">${initial}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold text-ink" dir="ltr">${encodeHtml(record.email)} · ${host}</span>
                <span class="block truncate text-xs text-muted" dir="ltr">${secondary}</span>
                <span class="block text-xs text-muted">${t(record.email === ADMIN_EMAIL ? 'Demo sign-in available' : 'Workspace discovery only')}</span>
              </span>
            </button>
            <button type="button" class="size-8 shrink-0 rounded-md border border-line bg-surface text-sm font-semibold text-danger hover:border-[var(--accent-line)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]" data-si-remove="${index}" aria-label="${t('Remove account')}" title="${t('Remove account')}">&times;</button>
          </div>`
      })
      .join('')
  }

  function emailError(message) {
    email().setAttribute('aria-invalid', 'true')
    $('#si-email-error').dataset.i18n = message
    $('#si-email-error').textContent = t(message)
    $('#si-email-error').hidden = false
    email().focus()
  }

  function renderDiscovery(value) {
    const message = DEMO_DIRECTORY.has(value)
      ? "{email} isn't linked to a workspace yet. Ask your administrator to add you."
      : "We couldn't find a Skey workspace for {email}."
    const [before, after] = t(message).split('{email}')
    const address = root.ownerDocument.createElement('bdi')
    address.dir = 'ltr'
    address.textContent = value
    $('#si-discovery-message').replaceChildren(before, address, after)
    $('#si-discovery').hidden = false
  }

  function advanceFromEmail() {
    const value = normalizeEmail(email().value)
    email().value = value
    clearAttempt()
    $('#si-discovery').hidden = true
    if (!value) return emailError('Enter your work email.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return emailError('Enter an email like name@company.com.')
    email().removeAttribute('aria-invalid')
    $('#si-email-error').hidden = true
    const workspace = DEMO_DIRECTORY.get(value)
    if (!workspace) {
      renderDiscovery(value)
      email().focus()
      return
    }
    tenantName = workspace
    const branches = branchesFor(workspace)
    branch = branches[0] || null
    if (branches.length > 1) {
      renderBranches(branches)
      show('branch')
    } else show('2')
  }

  /* Dynamic strings own no data-i18n (they are set at runtime), so
     re-resolve them when the application language changes mid-visit. */
  function retranslate() {
    showBtn().textContent = pass().type === 'password' ? t('Show') : t('Hide')
    defaultSigninLabel()
    pinSigninBtn().textContent = t('Sign in with PIN')
    refreshPinIntro()
    hideError()
    if (!$('#si-discovery').hidden) renderDiscovery(normalizeEmail(email().value))
    if (panes().find(pane => !pane.hidden)?.dataset.siPane === 'accounts') renderAccounts()
  }

  function bind() {
    /* One delegated listener drives every pane jump: entry links, footer
       links, and the per-sub-page "Back to sign in" (a data-si-goto of
       `back` returns to the auth pane the user came from). */
    root.addEventListener('click', event => {
      const jump = event.target.closest?.('[data-si-goto]')
      if (!jump) return
      event.preventDefault()
      show(jump.dataset.siGoto === 'back' ? lastAuthPane : jump.dataset.siGoto)
    })
    /* The footer language submenu lives outside any menu that would
       Escape-close it (the avatar's does via its owner menu), so close it
       here — focus returns to the summary, matching menu conventions. */
    root.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return
      const menu = root.querySelector('.si-language[open]')
      if (!menu) return
      menu.open = false
      menu.querySelector('summary')?.focus()
    })
    $('#si-to2').addEventListener('click', advanceFromEmail)
    email().addEventListener('input', () => {
      clearAttempt()
      email().removeAttribute('aria-invalid')
      $('#si-email-error').hidden = true
      $('#si-discovery').hidden = true
    })
    email().addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault()
        $('#si-to2').click()
      }
    })
    $('#si-change').addEventListener('click', () => show(1))
    showBtn().addEventListener('click', () => {
      const hidden = pass().type === 'password'
      pass().type = hidden ? 'text' : 'password'
      showBtn().textContent = hidden ? t('Hide') : t('Show')
      pass().focus()
    })
    pass().addEventListener('keyup', e => {
      capsNote().classList.toggle('hidden', !(e.getModifierState && e.getModifierState('CapsLock')))
    })
    pass().addEventListener('input', () => pass().removeAttribute('aria-invalid'))
    pass().addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault()
        signinBtn().click()
      }
    })
    signinBtn().addEventListener('click', () => {
      hideError()
      const attemptEmail = normalizeEmail(email().value)
      const attemptPassword = pass().value
      const attemptToken = focusToken
      signinBtn().disabled = true
      setTimeout(() => {
        if (attemptToken !== focusToken) return
        signinBtn().disabled = false
        if (attemptEmail === ADMIN_EMAIL && tenantName === DEMO_DIRECTORY.get(attemptEmail) && attemptPassword === 'skey123') {
          authenticatedEmail = attemptEmail
          signinBtn().textContent = `✓ ${t('Sign in with password')}`
          setTimeout(() => {
            if (attemptToken !== focusToken) return
            defaultSigninLabel()
            postAuth()
          }, 350)
        } else {
          pass().setAttribute('aria-invalid', 'true')
          errBox().textContent = t(attemptEmail === ADMIN_EMAIL
            ? 'Invalid credentials — use admin@lastchance.local / skey123 in this demo.'
            : eligibilityMessage)
          errBox().classList.remove('hidden')
        }
      }, 800)
    })

    /* RESET PASSWORD — 800ms demo latency, then a success box naming the
       address the link would go to (no email is sent in the prototype). */
    const resetUser = $('#si-reset-user')
    const resetSend = $('#si-reset-send')
    const resetOk = $('[data-si-reset-ok]')
    resetSend.addEventListener('click', () => {
      const id = resetUser.value.trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
        resetUser.setAttribute('aria-invalid', 'true')
        resetUser.focus()
        return
      }
      resetUser.removeAttribute('aria-invalid')
      resetSend.disabled = true
      setTimeout(() => {
        const address = normalizeEmail(id)
        resetOk.textContent = t(
          'If an account exists for {user}, a reset link is on its way. (demo — no email is sent)'
        ).replace('{user}', address)
        resetOk.classList.remove('hidden')
        resetSend.disabled = false
      }, 800)
    })
    resetUser.addEventListener('input', () => resetUser.removeAttribute('aria-invalid'))

    /* BRANCH STEP — the radio list is re-rendered per tenant, so the
       change listener is delegated; Continue carries the pick to step 2. */
    $('#si-branch-list').addEventListener('change', event => {
      if (event.target.name === 'skey-signin-branch') {
        branch = event.target.value
      }
    })
    $('#si-branch-go').addEventListener('click', () => {
      const checked = $('#si-branch-list input:checked')
      if (checked) {
        branch = checked.value
      }
      show(2)
    })

    /* ACCOUNTS PICKER — delegated: the row picks (identity syncs, PIN
       pane), the × forgets that record only; the last removal falls
       back to the email step. */
    $('#si-accounts-list').addEventListener('click', event => {
      const remove = event.target.closest('[data-si-remove]')
      if (remove) {
        const record = loadAccounts()[Number(remove.dataset.siRemove)]
        if (record) forgetAccount(record.email)
        toast?.({tone: 'info', title: t('Account removed from this device.')})
        if (!loadAccounts().length) {
          show(1)
          return
        }
        renderAccounts()
        return
      }
      const pick = event.target.closest('[data-si-pick]')
      if (!pick) return
      const record = loadAccounts()[Number(pick.dataset.siPick)]
      if (!record) return
      tenantName = DEMO_DIRECTORY.get(record.email)
      email().value = record.email
      branch = record.branch || null
      show('pin')
    })

    /* PIN — the saved-account path: 800ms demo latency, digest check
       against the current account's record, then the same onSignIn()
       as password. */
    const pinSubmit = () => {
      const record = currentAccount()
      if (!record) {
        show(1)
        return
      }
      pinErr().classList.add('hidden')
      pinErr().textContent = ''
      $('#si-pin-else').classList.add('hidden')
      pinInput().removeAttribute('aria-invalid')
      const attemptToken = focusToken
      pinSigninBtn().disabled = true
      setTimeout(() => {
        if (attemptToken !== focusToken) return
        pinSigninBtn().disabled = false
        const pin = pinInput().value
        if (record.email === ADMIN_EMAIL && /^\d{6}$/.test(pin) && hashPin(pin) === record.pinHash) {
          pinSigninBtn().textContent = `✓ ${t('Sign in with PIN')}`
          setTimeout(() => {
            if (attemptToken !== focusToken) return
            authenticatedEmail = record.email
            pinSigninBtn().textContent = t('Sign in with PIN')
            tenantName = DEMO_DIRECTORY.get(record.email)
            email().value = record.email
            branch = record.branch || null
            complete()
          }, 350)
        } else {
          pinInput().setAttribute('aria-invalid', 'true')
          pinErr().textContent = t(record.email === ADMIN_EMAIL
            ? 'Incorrect PIN — try again, or use your password.'
            : eligibilityMessage)
          pinErr().classList.remove('hidden')
          $('#si-pin-else').classList.remove('hidden')
          pinInput().focus()
        }
      }, 800)
    }
    pinSigninBtn().addEventListener('click', pinSubmit)
    pinInput().addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        pinSubmit()
      }
    })
    pinInput().addEventListener('input', () => {
      pinInput().removeAttribute('aria-invalid')
      pinErr().classList.add('hidden')
      $('#si-pin-else').classList.add('hidden')
    })
    $('#si-pin-back').addEventListener('click', startOver)
    $('#si-pin-forget').addEventListener('click', () => {
      const record = currentAccount()
      if (!record) return
      forgetAccount(record.email)
      toast?.({tone: 'info', title: t('Account removed from this device.')})
      show(loadAccounts().length ? 'accounts' : 1)
    })
    $('#si-pin-someone').addEventListener('click', () => {
      pinErr().classList.add('hidden')
      pinErr().textContent = ''
      $('#si-pin-else').classList.add('hidden')
      pinInput().value = ''
      pinInput().removeAttribute('aria-invalid')
      startOver()
    })
    $('#si-usepin').addEventListener('click', () => {
      if (!currentAccount()?.pinHash) return
      show('pin')
    })
    /* SAVE STEP — Not now completes the visit without writing anything;
       Save PIN validates, stores the digest, toasts, and completes.
       Same validations and error strings the removed dialog used. */
    const saveGo = $('#si-save-go')
    const saveSubmit = () => {
      if (authenticatedEmail !== ADMIN_EMAIL) return
      const pin = $('#si-save-pin')
      const pin2 = $('#si-save-pin2')
      const err = $('#si-save-pin-err')
      err.classList.add('hidden')
      err.textContent = ''
      pin.removeAttribute('aria-invalid')
      pin2.removeAttribute('aria-invalid')
      if (!/^\d{6}$/.test(pin.value)) {
        pin.setAttribute('aria-invalid', 'true')
        err.textContent = t('PIN must be exactly 6 digits.')
        err.classList.remove('hidden')
        pin.focus()
        return
      }
      if (pin.value !== pin2.value) {
        pin2.setAttribute('aria-invalid', 'true')
        err.textContent = t('PINs do not match.')
        err.classList.remove('hidden')
        pin2.focus()
        return
      }
      upsertAccount({
        tenant: DEMO_DIRECTORY.get(authenticatedEmail),
        email: authenticatedEmail,
        branch,
        pinHash: hashPin(pin.value),
        savedAt: Date.now(),
      })
      toast?.({tone: 'ok', title: t('PIN created — sign in with your PIN next time.')})
      complete()
    }
    $('#si-save-not-now').addEventListener('click', () => complete())
    saveGo.addEventListener('click', saveSubmit)
    for (const input of [$('#si-save-pin'), $('#si-save-pin2')]) {
      input.addEventListener('input', () => {
        input.removeAttribute('aria-invalid')
        $('#si-save-pin-err').classList.add('hidden')
      })
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        saveSubmit()
      })
    }

    /* REQUEST ACCESS — required fields, then an 800ms confirmation. */
    const reqFields = ['#si-req-name', '#si-req-email', '#si-req-org'].map($)
    const reqSend = $('#si-req-send')
    const reqOk = $('[data-si-req-ok]')
    reqSend.addEventListener('click', () => {
      const invalid = reqFields.filter(field => !field.value.trim())
      reqFields.forEach(field => {
        if (!field.value.trim()) field.setAttribute('aria-invalid', 'true')
        else field.removeAttribute('aria-invalid')
      })
      if (invalid.length) {
        invalid[0].focus()
        return
      }
      reqSend.disabled = true
      setTimeout(() => {
        reqOk.textContent = t(
          'Request received — we will email {email} within one business day. (demo)'
        ).replace('{email}', reqFields[1].value.trim())
        reqOk.classList.remove('hidden')
        reqSend.disabled = false
      }, 800)
    })
    reqFields.forEach(field =>
      field.addEventListener('input', () => field.removeAttribute('aria-invalid'))
    )

    if (typeof subscribe === 'function') {
      unsubscribeLocale = subscribe(() => retranslate())
    }
  }

  function activate() {
    pass().value = ''
    hideError()
    defaultSigninLabel()
    retranslate()
    /* A fresh activation starts a fresh attempt: drop any branch left
       over from the previous visit so it can never be pre-checked or
       saved under a different identity. */
    branch = null
    /* Round-5 entry rules: one saved account opens on its PIN pane
       (prefilled), 2+ open the picker, none fall through to the email
       step; escaping to another pane never bounces back — only the next
       activation re-offers. */
    const accounts = loadAccounts()
    if (accounts.length === 1) {
      tenantName = DEMO_DIRECTORY.get(accounts[0].email)
      email().value = accounts[0].email
      branch = accounts[0].branch || null

      lastAuthPane = '1'
      show('pin')
      return
    }
    if (accounts.length >= 2) {
      lastAuthPane = '1'
      show('accounts')
      return
    }
    show(1)
  }

  function deactivate() {
    ++focusToken
    activeFocusCleanup?.()
    authenticatedEmail = null
  }

  function dispose() {
    deactivate()
    unsubscribeLocale?.()
    unsubscribeLocale = null
  }

  bind()

  return {
    id: 'signin',
    roots: [root],
    activate,
    deactivate,
    dispose,
  }
}
