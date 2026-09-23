// Change Password / Set PIN dialogs for the profile page's Security
// section. Prototype-only: validates required/matching fields client-side
// and shows a success toast — there is no real credential backend to call
// (per the design spec's Mock data & persistence section).

export function createSecurityDialogs({trapFocus, releaseFocus, toast}) {
  const passwordScrim = document.getElementById('change-password-scrim')
  const passwordForm = document.getElementById('change-password-form')
  const passwordError = document.getElementById('change-password-error')
  const pinScrim = document.getElementById('set-pin-scrim')
  const pinForm = document.getElementById('set-pin-form')
  const pinError = document.getElementById('set-pin-error')

  function openDialog(scrim) {
    passwordError.textContent = ''
    pinError.textContent = ''
    scrim.classList.add('open')
    trapFocus(scrim.querySelector('.dlg'))
  }

  function closeDialog(scrim) {
    if (!scrim.classList.contains('open')) return
    scrim.classList.remove('open')
    releaseFocus()
  }

  const openChangePassword = () => {
    passwordForm.reset()
    openDialog(passwordScrim)
  }

  const openSetPin = () => {
    pinForm.reset()
    openDialog(pinScrim)
  }

  function bind() {
    ;[passwordScrim, pinScrim].forEach(scrim =>
      scrim.addEventListener('click', e => {
        if (e.target === scrim || e.target.closest('.c-close')) closeDialog(scrim)
      })
    )

    passwordForm.addEventListener('submit', e => {
      e.preventDefault()
      const next = document.getElementById('new-password').value
      const confirm = document.getElementById('confirm-password').value
      if (next.length < 8) {
        passwordError.textContent = 'New password must be at least 8 characters.'
        return
      }
      if (next !== confirm) {
        passwordError.textContent = 'New password and confirmation do not match.'
        return
      }
      closeDialog(passwordScrim)
      toast({tone: 'ok', title: 'Password changed'})
    })

    pinForm.addEventListener('submit', e => {
      e.preventDefault()
      const next = document.getElementById('new-pin').value
      const confirm = document.getElementById('confirm-pin').value
      if (!/^\d{4,6}$/.test(next)) {
        pinError.textContent = 'PIN must be 4–6 digits.'
        return
      }
      if (next !== confirm) {
        pinError.textContent = 'New PIN and confirmation do not match.'
        return
      }
      closeDialog(pinScrim)
      toast({tone: 'ok', title: 'PIN code saved'})
    })
  }

  return {openChangePassword, openSetPin, bind}
}
