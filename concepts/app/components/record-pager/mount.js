import {createRecordPager} from './pager.js'

/** Owns pagers state and its DOM bindings. */
export function createPagers({} = {}) {
  document.querySelectorAll('.pager').forEach(root => {
    const input = root.querySelector('.pg-i')
    const total = Number(input.max)
    input.dir = 'ltr'
    let index = 1
    const position = root.closest('.design')?.querySelector('.pos')
    const pager = createRecordPager({root, getPosition: () => ({index, total}), onNavigate: value => {
      index = value
      pager.sync()
      if (position) position.textContent = `Record ${index} of ${total}`
    }})
    pager.sync()
    if (position) position.textContent = `Record ${index} of ${total}`
  })

  return {}
}
