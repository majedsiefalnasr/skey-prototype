/** notes screen — filled in by the collaboration-suite plan. */
export function createNotes() {
  const view = () => document.querySelector('.notes-view')
  return {
    id: 'notes',
    get roots() {
      return view() ? [view()] : []
    },
    activate() {},
    deactivate() {},
    dispose() {},
  }
}
