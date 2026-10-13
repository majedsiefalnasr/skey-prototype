/** events screen — filled in by the collaboration-suite plan. */
export function createEvents() {
  const view = () => document.querySelector('.events-view')
  return {
    id: 'events',
    get roots() {
      return view() ? [view()] : []
    },
    activate() {},
    deactivate() {},
    dispose() {},
  }
}
