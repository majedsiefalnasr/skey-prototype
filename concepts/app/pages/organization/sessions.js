import {canPerformOrganizationAction} from './access.js'

export const ORGANIZATION_SESSION_STATE_KEY = 'skey-proto-organization-session-actions'

export function readOrganizationSessionState(storage) {
  try {
    const saved = JSON.parse(storage.getItem(ORGANIZATION_SESSION_STATE_KEY) || '{}')
    return {
      revokedApplicationIds: Array.isArray(saved.revokedApplicationIds) ? saved.revokedApplicationIds : [],
      terminatedDatabaseIds: Array.isArray(saved.terminatedDatabaseIds) ? saved.terminatedDatabaseIds : [],
      auditEvents: Array.isArray(saved.auditEvents) ? saved.auditEvents : [],
    }
  } catch {
    return {revokedApplicationIds: [], terminatedDatabaseIds: [], auditEvents: []}
  }
}

export function createOrganizationSessionActions({root, role, data, storage, toast, encodeHtml, rerender, trapFocus, releaseFocus}) {
  const dialog = document.getElementById('organization-session-dialog')
  const form = document.getElementById('organization-session-form')
  const title = document.getElementById('organization-session-title')
  const description = document.getElementById('organization-session-description')
  const target = document.getElementById('organization-session-target')
  const reason = document.getElementById('organization-session-reason')
  const error = document.getElementById('organization-session-error')
  const confirm = document.getElementById('organization-session-confirm')
  let pending = null

  function close() {
    if (!dialog.classList.contains('open')) return
    dialog.classList.remove('open')
    pending = null
    releaseFocus()
  }

  function open(kind, id) {
    const rows = kind === 'terminate' ? data.databaseSessions : data.applicationSessions
    const row = rows.find(candidate => candidate.id === id)
    const action = kind === 'terminate' ? 'terminate-database-session' : 'revoke-session'
    if (!row || !canPerformOrganizationAction(role, action, row)) return
    pending = {kind, row, action}
    form.reset()
    error.textContent = ''
    const terminating = kind === 'terminate'
    title.textContent = terminating ? 'Terminate database session' : 'Revoke application session'
    description.textContent = terminating
      ? 'The selected database workload will be interrupted immediately.'
      : 'The selected user will be signed out from this device immediately.'
    confirm.textContent = terminating ? 'Terminate session' : 'Revoke session'
    target.innerHTML = terminating
      ? `<strong class="block">${encodeHtml(row.id)} · ${encodeHtml(row.workload)}</strong><small class="text-muted">${encodeHtml(row.account)} · ${encodeHtml(row.query)}</small>`
      : `<strong class="block">${encodeHtml(row.user)}</strong><small class="text-muted">${encodeHtml(row.device)} · ${encodeHtml(row.branch)}</small>`
    dialog.classList.add('open')
    trapFocus(dialog.querySelector('.dlg'))
  }

  function submit(event) {
    event.preventDefault()
    if (!pending) return
    const operationalReason = reason.value.trim()
    if (!operationalReason) {
      error.textContent = 'Enter an operational reason before continuing.'
      reason.focus()
      return
    }
    if (!canPerformOrganizationAction(role, pending.action, pending.row)) {
      error.textContent = 'This session is protected or outside your permitted scope.'
      return
    }

    const state = readOrganizationSessionState(storage)
    const terminating = pending.kind === 'terminate'
    const idKey = terminating ? 'terminatedDatabaseIds' : 'revokedApplicationIds'
    if (!state[idKey].includes(pending.row.id)) state[idKey].push(pending.row.id)
    const now = new Date()
    // The audit table sorts by timestamp string, newest first (real
    // data-list engine, not array-insertion order like the old hand-
    // rolled table) — real wall-clock "now" can predate the fixture
    // rows' hardcoded dates (e.g. under Playwright's fixed test clock),
    // which would sort a freshly-created event behind them. Anchoring to
    // one minute after the latest known event (fixture rows + any prior
    // session-action event) guarantees each new entry sorts first,
    // regardless of what "now" the environment reports.
    const latestKnown = [...data.auditRows, ...state.auditEvents].reduce(
      (latest, row) => (row.timestamp > latest ? row.timestamp : latest),
      '0000-00-00 00:00'
    )
    const anchor = new Date(`${latestKnown.replace(' ', 'T')}:00`)
    const effectiveNow = anchor > now ? new Date(anchor.getTime() + 60000) : now
    const timestamp = effectiveNow.toLocaleString('sv-SE', {hour12: false}).slice(0, 16)
    state.auditEvents.unshift({
      id: `audit-session-${now.getTime()}`,
      timestamp,
      actor: 'Majed Sief Alnasr',
      action: terminating ? 'Terminated session' : 'Revoked session',
      object: terminating ? pending.row.id : `${pending.row.user} · ${pending.row.device}`,
      source: 'Organization Center',
      result: 'Success',
      reason: operationalReason.slice(0, 160),
      inManagerScope: pending.row.inManagerScope === true,
    })
    storage.setItem(ORGANIZATION_SESSION_STATE_KEY, JSON.stringify(state))
    close()
    toast({tone: 'ok', title: terminating ? 'Database session terminated' : 'Application session revoked'})
    rerender()
  }

  function clickDialog(event) {
    if (event.target === dialog || event.target.closest('.c-close')) close()
  }

  function keydown(event) {
    if (event.key === 'Escape' && dialog.classList.contains('open')) {
      event.preventDefault()
      close()
    }
  }

  // Delegated on `root` (not attached per-button) because the data-list
  // engine backing the Application/Database sessions tables regenerates
  // its own canvas innerHTML on every internal search/sort/filter/page
  // change — a direct per-button listener would go stale after the first
  // such re-render, since those buttons live inside a "State" column
  // cell the engine redraws independently of organization.js's own
  // render() cycle.
  function clickRoot(event) {
    const button = event.target.closest('[data-organization-session-action]')
    if (!button || !root.contains(button)) return
    open(button.dataset.organizationSessionAction, button.dataset.sessionId)
  }

  function bind() {
    root.addEventListener('click', clickRoot)
    dialog.addEventListener('click', clickDialog)
    form.addEventListener('submit', submit)
    document.addEventListener('keydown', keydown)
  }

  function dispose() {
    root.removeEventListener('click', clickRoot)
    dialog.removeEventListener('click', clickDialog)
    form.removeEventListener('submit', submit)
    document.removeEventListener('keydown', keydown)
  }

  return {bind, open, dispose}
}

