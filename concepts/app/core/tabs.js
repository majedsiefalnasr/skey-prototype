// ADS tab keys: Arrow keys follow the tablist's reading direction and wrap; Home and End go to the ends.
export function nextTab(tab, key) {
  const list = tab.closest('[role="tablist"]')
  const tabs = [...list.querySelectorAll('[role="tab"]')]
  const index = tabs.indexOf(tab)
  const forward = getComputedStyle(list).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
  const backward = forward === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight'
  if (key === 'Home') return tabs[0]
  if (key === 'End') return tabs[tabs.length - 1]
  if (key === forward) return tabs[(index + 1) % tabs.length]
  if (key === backward) return tabs[(index - 1 + tabs.length) % tabs.length]
  return null
}
