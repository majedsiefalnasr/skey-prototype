/** activities screen — filled in by the collaboration-suite plan. */
export function createActivities() {
  const view = () => document.querySelector('.activities-view')
  return {
    id: 'activities',
    get roots() {
      return view() ? [view()] : []
    },
    activate() {},
    deactivate() {},
    dispose() {},
  }
}
