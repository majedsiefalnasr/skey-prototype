/** people screen — filled in by the collaboration-suite plan. */
export function createPeople() {
  const view = () => document.querySelector('.people-view')
  return {
    id: 'people',
    get roots() {
      return view() ? [view()] : []
    },
    activate() {},
    deactivate() {},
    dispose() {},
  }
}
