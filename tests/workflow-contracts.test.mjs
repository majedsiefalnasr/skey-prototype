import test from 'node:test'
import assert from 'node:assert/strict'
import {createRecordPager} from '../concepts/app/components/record-pager/pager.js'

test('pager clamps positions, handles all four arrows, and releases its bindings', () => {
  const input = {value: '2', dataset: {}}
  const buttons = Object.fromEntries(['f', 'p', 'n', 'l'].map(key => [key, {}]))
  const root = {querySelector: selector => selector === '.pg-i' ? input : buttons[selector.slice(-1)]}
  let index = 2
  const pager = createRecordPager({root, getPosition: () => ({index, total: 5}), onNavigate: value => { index = value; pager.sync() }})
  pager.sync()
  buttons.l.onclick()
  assert.equal(index, 5)
  assert.equal(buttons.n.disabled, true)
  buttons.f.onclick()
  assert.equal(index, 1)
  buttons.n.onclick()
  assert.equal(index, 2)
  buttons.p.onclick()
  assert.equal(index, 1)
  input.value = '900'
  input.onchange()
  assert.equal(index, 5)
  pager.dispose()
  assert.equal(input.onchange, null)
  assert.ok(Object.values(buttons).every(button => button.onclick === null))
})
