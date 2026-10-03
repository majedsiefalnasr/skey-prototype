/** Owns the Dashboard screen (KPI overview) — a static view, so there is
 * nothing to render on activate: the template is cloned into the content
 * host once at shell construction and toggled by attachAndShowView. */
export function createDashboard() {
  let root = null

  return {
    id: 'dashboard',
    get roots() {
      root = root || document.querySelector('.dashboard-view')
      return root ? [root] : []
    },
    activate() {},
    deactivate() {},
    dispose() {
      root = null
    },
  }
}
