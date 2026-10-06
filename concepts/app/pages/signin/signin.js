// Sign-in page (Slack-style minimal concept, promoted into the app).
// A thirteen-pane router inside one card — tenant (1), credentials (2),
// branch, pin, accounts (2+ saved identities), save, savepin, then the
// six demo sub-pages (reset / workspaces / device / request / privacy /
// support) reached through data-si-goto — rendered from
// pages/signin/templates.html. The only local import is core/locale.js's
// encodeHtml (core imports no pages, so no cycle); everything else
// arrives via the factory (same packages the other pages receive).
//
// Demo auth only: admin / skey123 signs in through onSignIn() (main.js
// flips the session control and navigates back); SSO buttons explain
// they are disabled in the prototype. Password auth parks on the save
// step only for identities with no saved PIN; device approval completes
// directly. Saved identities live in the accounts list — one saved
// account short-circuits the view to its PIN pane, two or more open the
// picker.

import {encodeHtml} from '../../core/locale.js'

/* localStorage: saved accounts under `skey-proto-accounts` —
   [{tenant, user, branch, pinHash, savedAt}, ...] — written by this
   module's save step; main.js never touches it. The pre-round-5
   single-record key is migrated on first load and always deleted, so
   forgetting the last account can never resurrect it. */
const ACCOUNTS_KEY = 'skey-proto-accounts'
const LEGACY_CRED_KEY = 'skey-proto-cred'

const accountKey = (tenantName, userName) =>
  `${String(tenantName || '').trim().toLowerCase()}|${String(userName || '').trim().toLowerCase()}`

function saveAccounts(list) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list))
  localStorage.removeItem(LEGACY_CRED_KEY)
}

function loadAccounts() {
  let list = []
  try {
    list = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]')
  } catch {
    list = []
  }
  if (!Array.isArray(list)) list = []
  list = list.filter(record => record && record.pinHash)
  let legacy = null
  try {
    const raw = localStorage.getItem(LEGACY_CRED_KEY)
    legacy = raw ? JSON.parse(raw) : null
  } catch {
    legacy = null
  }
  if (legacy) {
    if (!list.length && legacy.pinHash) {
      list = [legacy]
      saveAccounts(list)
    } else {
      localStorage.removeItem(LEGACY_CRED_KEY)
    }
  }
  return list
}

function findAccount(tenantName, userName) {
  const key = accountKey(tenantName, userName)
  return loadAccounts().find(record => accountKey(record.tenant, record.user) === key) || null
}

function upsertAccount(record) {
  const key = accountKey(record.tenant, record.user)
  const list = loadAccounts()
  const at = list.findIndex(existing => accountKey(existing.tenant, existing.user) === key)
  if (at >= 0) list[at] = record
  else list.push(record)
  saveAccounts(list)
}

function forgetAccount(tenantName, userName) {
  const key = accountKey(tenantName, userName)
  saveAccounts(loadAccounts().filter(record => accountKey(record.tenant, record.user) !== key))
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
  const tenant = () => $('#si-tenant')
  const user = () => $('#si-user')
  const pass = () => $('#si-pass')
  const showBtn = () => $('#si-show')
  const signinBtn = () => $('#si-signin')
  const errBox = () => $('[data-si-err]')
  const capsNote = () => $('[data-si-caps]')
  const pinInput = () => $('#si-pin')
  const pinSigninBtn = () => $('#si-pin-signin')
  const pinErr = () => $('#si-pin-err')
  const wsQuery = () => $('#si-ws-q')

  /* The saved account this attempt is authenticating right now — derived
     from the tenant/user fields, which every route into the PIN pane
     syncs first (activate, picker pick, Use PIN instead). */
  const currentAccount = () => findAccount(tenant().value, user().value)

  function refreshWho() {
    const base = `${tenant().value.trim() || '—'}.skeyerp.com`
    const who = user().value.trim()
    const suffix = branch ? ` · ${branch}` : ''
    $('#si-who').textContent = who ? `${who} · ${base}${suffix}` : `${base}${suffix}`
  }

  function refreshUsePin() {
    $('#si-usepin-wrap').hidden = !currentAccount()?.pinHash
  }

  /* A record-prefilled branch is bound to its identity: once the tenant
     or username stops matching, drop it before it can be displayed or
     saved onto someone else's record. */
  function syncBranchSource() {
    if (branchSource === null) return
    if (accountKey(tenant().value, user().value) !== branchSource) {
      branch = null
      branchSource = null
    }
  }

  /* Where "start over" lands: the picker when 2+ accounts are saved,
     otherwise the tenant step (round-5 entry rules). */
  const startOver = () => show(loadAccounts().length >= 2 ? 'accounts' : 1)

  let unsubscribeLocale = null
  /* Which auth pane a "Back to sign in" returns to — the step the user
     actually came from, so sub-pages opened from step 2 go back to 2. */
  let lastAuthPane = '1'
  /* Branch picked for this sign-in attempt (null until the branch pane —
      or a saved credential — decides one). */
  let branch = null
  /* Identity key whose saved record supplied the prefilled branch — a
     record-derived branch belongs to that identity; a tenant/user that
     no longer matches drops it so it can never be saved onto another
     account. Branch-pane picks are attempt-scoped and unaffected. */
  let branchSource = null

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
      if (!resetUser.value) resetUser.value = user().value.trim() || 'admin'
    }
    if (id === 'workspaces') {
      wsQuery().value = ''
      wsQuery().removeAttribute('aria-invalid')
    }
    if (id === 'pin') {
      const record = currentAccount()
      pinInput().value = ''
      pinInput().removeAttribute('aria-invalid')
      pinErr().classList.add('hidden')
      pinErr().textContent = ''
      $('#si-pin-else').classList.add('hidden')
      pinSigninBtn().textContent = t('Sign in with PIN')
      $('#si-pin-forget-wrap').hidden = !record
      if (record) {
        $('#si-pin-who').textContent = record.branch
          ? `${record.user} · ${record.branch} · ${record.tenant}.skeyerp.com`
          : `${record.user} · ${record.tenant}.skeyerp.com`
      } else {
        $('#si-pin-who').textContent = `${user().value.trim() || 'admin'} · ${tenant().value.trim() || '—'}.skeyerp.com`
      }
    }
    if (id === 'save') {
      $('#si-save-who').textContent = `${user().value.trim() || 'admin'} · ${tenant().value.trim() || 'lastchance'}.skeyerp.com`
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
    setTimeout(() => target?.focus(), 60)
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
     PIN; device approval completes directly (round 5). */
  function complete() {
    applyBranch()
    onSignIn?.()
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

  /* Picker rows for 2+ saved accounts: the row picks (fields sync, PIN
     pane), the × forgets just that record. Rendered with t() because
     dynamic strings own no data-i18n. */
  function renderAccounts() {
    const accounts = loadAccounts()
    $('#si-accounts-list').innerHTML = accounts
      .map((record, index) => {
        const host = `${encodeHtml(record.tenant)}.skeyerp.com`
        const initial = encodeHtml((record.user || '?').trim().charAt(0).toUpperCase())
        const secondary = record.branch ? encodeHtml(record.branch) : host
        return `
          <div class="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 hover:border-[var(--accent-line)] focus-within:[box-shadow:0_0_0_3px_var(--accent-soft)]" role="listitem">
            <button type="button" class="flex min-w-0 flex-1 items-start gap-3 border-0 bg-transparent p-0 text-start" data-si-pick="${index}">
              <span class="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--line-2)] text-sm font-semibold text-ink" aria-hidden="true">${initial}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold text-ink" dir="ltr">${encodeHtml(record.user)} · ${host}</span>
                <span class="block truncate text-xs text-muted" dir="ltr">${secondary}</span>
              </span>
            </button>
            <button type="button" class="size-8 shrink-0 rounded-md border border-line bg-surface text-sm font-semibold text-danger hover:border-[var(--accent-line)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]" data-si-remove="${index}" aria-label="${t('Remove account')}" title="${t('Remove account')}">&times;</button>
          </div>`
      })
      .join('')
  }

  /* The one path from the tenant step (Continue) and the workspaces
     search: normalize the tenant, then route around — branch-bearing
     workspaces stop at the branch pane, everything else goes straight to
     credentials. */
  function advanceFromTenant() {
    const value = tenant().value.trim().replace(/\.skeyerp\.com$/i, '')
    if (!value) {
      tenant().setAttribute('aria-invalid', 'true')
      tenant().focus()
      return
    }
    tenant().removeAttribute('aria-invalid')
    tenant().value = value
    const branches = branchesFor(value)
    if (!branches.includes(branch)) {
      branch = branches.length ? branches[0] : null
      branchSource = null
    }
    if (branches.length) {
      renderBranches(branches)
      show('branch')
      return
    }
    show(2)
  }

  /* Dynamic strings own no data-i18n (they are set at runtime), so
     re-resolve them when the application language changes mid-visit. */
  function retranslate() {
    showBtn().textContent = pass().type === 'password' ? t('Show') : t('Hide')
    defaultSigninLabel()
    pinSigninBtn().textContent = t('Sign in with PIN')
    hideError()
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
    $('#si-to2').addEventListener('click', () => advanceFromTenant())
    tenant().addEventListener('input', () => {
      syncBranchSource()
      tenant().removeAttribute('aria-invalid')
    })
    tenant().addEventListener('keydown', e => {
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
    user().addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault()
        pass().focus()
      }
    })
    pass().addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault()
        signinBtn().click()
      }
    })
    signinBtn().addEventListener('click', () => {
      hideError()
      signinBtn().disabled = true
      setTimeout(() => {
        signinBtn().disabled = false
        if (user().value.trim() === 'admin' && pass().value === 'skey123') {
          signinBtn().textContent = `✓ ${t('Sign in with password')}`
          setTimeout(() => {
            defaultSigninLabel()
            postAuth()
          }, 350)
        } else {
          pass().setAttribute('aria-invalid', 'true')
          errBox().textContent = t('Invalid credentials in this demo — try admin / skey123.')
          errBox().classList.remove('hidden')
        }
      }, 800)
    })
    const ssoDisabled = name => {
      hideError()
      errBox().textContent = `${name} — ${t('Single sign-on is not enabled in this demo.')}`
      errBox().classList.remove('hidden')
    }
    $('#si-sso-ms').addEventListener('click', () => ssoDisabled('Microsoft'))
    $('#si-sso-gg').addEventListener('click', () => ssoDisabled('Google'))

    /* RESET PASSWORD — 800ms demo latency, then a success box naming the
       address the link would go to (no email is sent in the prototype). */
    const resetUser = $('#si-reset-user')
    const resetSend = $('#si-reset-send')
    const resetOk = $('[data-si-reset-ok]')
    resetSend.addEventListener('click', () => {
      const id = resetUser.value.trim()
      if (!id) {
        resetUser.setAttribute('aria-invalid', 'true')
        resetUser.focus()
        return
      }
      resetUser.removeAttribute('aria-invalid')
      resetSend.disabled = true
      setTimeout(() => {
        const address = `${id}@${tenant().value.trim() || 'lastchance'}.skeyerp.com`
        resetOk.textContent = t(
          'If an account exists for {user}, a reset link is on its way. (demo — no email is sent)'
        ).replace('{user}', address)
        resetOk.classList.remove('hidden')
        resetSend.disabled = false
      }, 800)
    })
    resetUser.addEventListener('input', () => resetUser.removeAttribute('aria-invalid'))

    /* FIND YOUR WORKSPACES — no result list: type a tenant and submit
       (Enter or the Continue button); the shared advance fills the
       tenant step and routes onward (branch pane when the workspace has
       branches). */
    const wsSubmit = () => {
      const value = wsQuery().value.trim()
      if (!value) {
        wsQuery().setAttribute('aria-invalid', 'true')
        wsQuery().focus()
        return
      }
      wsQuery().removeAttribute('aria-invalid')
      tenant().value = value
      tenant().removeAttribute('aria-invalid')
      syncBranchSource()
      advanceFromTenant()
    }
    wsQuery().addEventListener('input', () => wsQuery().removeAttribute('aria-invalid'))
    wsQuery().addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault()
        wsSubmit()
      }
    })
    $('#si-ws-go').addEventListener('click', wsSubmit)

    /* BRANCH STEP — the radio list is re-rendered per tenant, so the
       change listener is delegated; Continue carries the pick to step 2. */
    $('#si-branch-list').addEventListener('change', event => {
      if (event.target.name === 'skey-signin-branch') {
        branch = event.target.value
        branchSource = null
      }
    })
    $('#si-branch-go').addEventListener('click', () => {
      const checked = $('#si-branch-list input:checked')
      if (checked) {
        branch = checked.value
        branchSource = null
      }
      show(2)
    })

    /* ACCOUNTS PICKER — delegated: the row picks (fields sync, PIN
       pane), the × forgets that record only; the last removal falls
       back to the tenant step. */
    $('#si-accounts-list').addEventListener('click', event => {
      const remove = event.target.closest('[data-si-remove]')
      if (remove) {
        const record = loadAccounts()[Number(remove.dataset.siRemove)]
        if (record) forgetAccount(record.tenant, record.user)
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
      tenant().value = record.tenant
      user().value = record.user
      branch = record.branch || null
      branchSource = accountKey(record.tenant, record.user)
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
      pinSigninBtn().disabled = true
      setTimeout(() => {
        pinSigninBtn().disabled = false
        const pin = pinInput().value
        if (/^\d{6}$/.test(pin) && hashPin(pin) === record.pinHash) {
          pinSigninBtn().textContent = `✓ ${t('Sign in with PIN')}`
          setTimeout(() => {
            pinSigninBtn().textContent = t('Sign in with PIN')
            tenant().value = record.tenant
            user().value = record.user
            branch = record.branch || null
            branchSource = accountKey(record.tenant, record.user)
            complete()
          }, 350)
        } else {
          pinInput().setAttribute('aria-invalid', 'true')
          pinErr().textContent = t('Incorrect PIN — try again, or use your password.')
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
      forgetAccount(record.tenant, record.user)
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
    user().addEventListener('input', () => {
      syncBranchSource()
      refreshWho()
      refreshUsePin()
    })

    /* SAVE STEP — Not now completes the visit without writing anything;
       Save PIN validates, stores the digest, toasts, and completes.
       Same validations and error strings the removed dialog used. */
    const saveGo = $('#si-save-go')
    const saveSubmit = () => {
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
        tenant: tenant().value.trim() || 'lastchance',
        user: user().value.trim() || 'admin',
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

    /* DEVICE CODE — "Simulate approval" completes the demo handshake directly (round 5 skips the save step). */
    $('#si-device-approve').addEventListener('click', event => {
      const button = event.currentTarget
      const ok = $('[data-si-device-ok]')
      button.disabled = true
      ok.textContent = t('Device approved — signing you in…')
      ok.classList.remove('hidden')
      setTimeout(() => {
        complete()
      }, 800)
    })

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
    branchSource = null
    /* Round-5 entry rules: one saved account opens on its PIN pane
       (prefilled), 2+ open the picker, none fall through to the tenant
       step; escaping to another pane never bounces back — only the next
       activation re-offers. */
    const accounts = loadAccounts()
    if (accounts.length === 1) {
      tenant().value = accounts[0].tenant
      user().value = accounts[0].user
      branch = accounts[0].branch || null
      branchSource = accountKey(accounts[0].tenant, accounts[0].user)
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

  function deactivate() {}

  function dispose() {
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
