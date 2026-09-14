

/** Owns record fields state and its DOM bindings. */
export function createRecordFields({} = {}) {
  let generatedRecordFieldId = 0
  
  function connectRecordLabels(root) {
    root.querySelectorAll('.rec-field').forEach(field => {
      const label = field.querySelector(':scope > label')
      const control = field.querySelector(
        ':scope > input, :scope > select, :scope > textarea'
      )
      if (!label || !control || label.htmlFor) return
      if (!control.id) control.id = `record-field-${generatedRecordFieldId++}`
      label.htmlFor = control.id
    })
  }
  
  function applyRecordValueDirections(root) {
    root.querySelectorAll('input, select, textarea').forEach(control => {
      const fixedDirection = control.matches(
        '[type="number"], [type="date"], [type="time"], [type="tel"]'
      )
      control.dir = fixedDirection ? 'ltr' : 'auto'
    })
  }

  return {connectRecordLabels, applyRecordValueDirections}
}
