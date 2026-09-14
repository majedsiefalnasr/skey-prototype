/** Binds the existing pager markup to its owner's record position. */
export function createRecordPager({root, getPosition, onNavigate}) {
  const input = root.querySelector('.pg-i')
  const buttons = Object.fromEntries(['f', 'p', 'n', 'l'].map(key => [key, root.querySelector(`.pg-${key}`)]))
  const navigate = value => {
    const {total} = getPosition()
    onNavigate(Math.min(total, Math.max(1, Number(value) || 1)))
  }
  const handlers = {
    f: () => navigate(1),
    p: () => navigate(Number(input.value) - 1),
    n: () => navigate(Number(input.value) + 1),
    l: () => navigate(getPosition().total),
  }
  for (const key of Object.keys(buttons)) buttons[key].onclick = handlers[key]
  const change = () => navigate(input.value)
  input.onchange = change
  function sync() {
    const {index, total} = getPosition()
    input.value = String(index)
    input.dataset.last = String(index)
    buttons.f.disabled = buttons.p.disabled = index === 1
    buttons.n.disabled = buttons.l.disabled = index === total
  }
  return {
    sync,
    dispose() {
      for (const key of Object.keys(buttons)) {
        if (buttons[key].onclick === handlers[key]) buttons[key].onclick = null
      }
      if (input.onchange === change) input.onchange = null
    },
  }
}
