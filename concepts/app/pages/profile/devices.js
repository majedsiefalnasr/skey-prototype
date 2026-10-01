// Sessions & devices section: a plain static login-log table. No
// sort/filter/group is warranted for a fixed, small fixture (see design
// spec's UX decisions) so this intentionally does not use
// components/data-list.

export function renderLoginLogTable(rows, encodeHtml) {
  const body = rows
    .map(
      row =>
        `<tr><td>${encodeHtml(row.timestamp)}</td><td>${encodeHtml(row.device)}</td><td>${encodeHtml(row.ip)}</td><td>${encodeHtml(row.status)}</td></tr>`
    )
    .join('')
  return `<table class="profile-login-log w-full text-[13px] [&_th]:text-start [&_th]:text-muted [&_th]:font-semibold [&_th]:[padding:7px_9px] [&_td]:[padding:7px_9px] [&_td]:[border-top:1px_solid_var(--line)]"><thead><tr><th>Time</th><th>Device</th><th>IP address</th><th>Status</th></tr></thead><tbody>${body}</tbody></table>`
}
