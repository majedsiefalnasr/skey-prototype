// Sessions & devices section: a plain static login-log table plus a
// device list with per-device sign-out. No sort/filter/group is warranted
// for a fixed, small fixture (see design spec's UX decisions) so this
// intentionally does not use components/data-list.
//
// Device revoke is fake but sticky for the session: revoked ids persist to
// sessionStorage using the same readJSON/writeJSON tolerate-malformed-JSON
// shape prototype/controls.js already established for prototype state.

const DEVICES_STORAGE_KEY = 'skey-proto-profile-devices'

function readRevokedIds(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(DEVICES_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRevokedIds(storage, ids) {
  try {
    storage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(ids))
  } catch {}
}

export function renderLoginLogTable(rows, encodeHtml) {
  const body = rows
    .map(
      row =>
        `<tr><td>${encodeHtml(row.timestamp)}</td><td>${encodeHtml(row.device)}</td><td>${encodeHtml(row.ip)}</td><td>${encodeHtml(row.status)}</td></tr>`
    )
    .join('')
  return `<table class="profile-login-log w-full text-[13px] [&_th]:text-start [&_th]:text-muted [&_th]:font-semibold [&_th]:[padding:7px_9px] [&_td]:[padding:7px_9px] [&_td]:[border-top:1px_solid_var(--line)]"><thead><tr><th>Time</th><th>Device</th><th>IP address</th><th>Status</th></tr></thead><tbody>${body}</tbody></table>`
}

function renderDeviceRow(device, encodeHtml) {
  const badge = device.current
    ? '<span class="badge gray" data-profile-current-device>This device</span>'
    : `<button type="button" class="lbtn out sm" data-profile-device-signout="${encodeHtml(device.id)}">Sign out</button>`
  return `<div class="profile-device-row flex items-center gap-3 [padding:10px_9px] [border-top:1px_solid_var(--line)]" data-profile-device="${encodeHtml(device.id)}">
    <span class="flex-1"><b class="block text-[13.5px] text-ink">${encodeHtml(device.name)}</b><span class="block text-xs text-muted">${encodeHtml(device.location)} · ${encodeHtml(device.lastActive)}</span></span>
    ${badge}
  </div>`
}

export function createDeviceList({root, deviceRows, storage, toast, encodeHtml}) {
  function render() {
    const revoked = new Set(readRevokedIds(storage))
    const visible = deviceRows.filter(device => !revoked.has(device.id))
    root.innerHTML = visible.map(device => renderDeviceRow(device, encodeHtml)).join('')
    root.querySelectorAll('[data-profile-device-signout]').forEach(button =>
      button.addEventListener('click', () => {
        const id = button.dataset.profileDeviceSignout
        const ids = readRevokedIds(storage)
        writeRevokedIds(storage, [...ids, id])
        render()
        toast({tone: 'ok', title: 'Device signed out'})
      })
    )
  }

  return {render}
}
