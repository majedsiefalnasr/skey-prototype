// Shared page-navigation contract (Task 10). No page implementation is
// imported here — resolvePage/requestLeave/showPage/onChange are supplied
// by the composition root (main.js -> legacy-app.js today), which is the
// only place that knows about individual pages.
//
// @typedef {'record'|'list'|'customers-list'|'customer-record'|'geo-list'|'geo-record'|'email'|'profile'|'organization'|'foryou'|'launchpad'} PageId
// @typedef {{key?: string, mode?: string, messageId?: string, section?: string}} NavigationData
// @typedef {{
//   id: PageId,
//   roots: HTMLElement[],
//   activate: (data: NavigationData) => void,
//   deactivate: () => void,
//   dispose: () => void
// }} Page
// @typedef {{
//   navigate: (id: PageId, data?: NavigationData) => Promise<boolean>,
//   current: () => PageId|null,
//   dispose: () => void
// }} Navigation

/**
 * @param {object} params
 * @param {(id: string) => (Page|undefined)} params.resolvePage - returns the
 *   cached, already-initialized Page for an id, or undefined for an unknown id.
 * @param {(from: string|null, to: string, data: object|undefined) => (boolean|Promise<boolean>)} params.requestLeave
 *   - adapts the existing guard outcomes for the page currently active
 *   (`from`); missing guards allow navigation.
 * @param {(page: Page) => void} params.showPage - performs the existing
 *   attachment/hiding operation for the target page.
 * @param {(id: string, data?: NavigationData) => void} params.onChange - updates shell/prototype
 *   state after the target page has been activated; receives the navigation
 *   data so the composition root can keep the URL in step (routing v1).
 * @returns {Navigation}
 */
export function createNavigation({resolvePage, requestLeave, showPage, onChange}) {
  let currentId = null
  let requestSeq = 0
  let disposed = false

  function current() {
    return currentId
  }

  async function navigate(id, data) {
    if (disposed) throw new Error('Navigation is disposed')

    const target = resolvePage(id)
    if (!target) throw new Error(`Unknown page: ${id}`)

    const requestId = ++requestSeq
    const fromId = currentId

    if (fromId !== null && fromId !== id) {
      const allowed = await requestLeave(fromId, id, data)
      if (disposed || requestId !== requestSeq) return false
      if (!allowed) return false
    }

    if (fromId !== null && fromId !== id) {
      const fromPage = resolvePage(fromId)
      fromPage?.deactivate()
    }

    showPage(target)
    target.activate(data)
    currentId = id
    onChange(id, data)
    return true
  }

  function dispose() {
    if (disposed) return
    disposed = true
    requestSeq += 1
    if (currentId !== null) {
      resolvePage(currentId)?.dispose()
      currentId = null
    }
  }

  return {navigate, current, dispose}
}
