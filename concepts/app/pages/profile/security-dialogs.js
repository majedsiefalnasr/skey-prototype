// Change Password / Set PIN / two-factor authentication / account danger-
// zone dialogs for the profile page's Security and Account sections.
// Prototype-only: validates required/matching fields client-side and shows
// a success toast — there is no real credential or account backend to call
// (per the design spec's Mock data & persistence section).

export function createSecurityDialogs({trapFocus, releaseFocus, toast, currentUser, onAccountStatusChange}) {
  const passwordScrim = document.getElementById('change-password-scrim')
  const passwordForm = document.getElementById('change-password-form')
  const passwordError = document.getElementById('change-password-error')
  const pinScrim = document.getElementById('set-pin-scrim')
  const pinForm = document.getElementById('set-pin-form')
  const pinError = document.getElementById('set-pin-error')
  const enable2faScrim = document.getElementById('enable-2fa-scrim')
  const enable2faForm = document.getElementById('enable-2fa-form')
  const enable2faError = document.getElementById('enable-2fa-error')
  const disable2faScrim = document.getElementById('disable-2fa-scrim')
  const deactivateScrim = document.getElementById('deactivate-account-scrim')
  const deleteScrim = document.getElementById('delete-account-scrim')
  const deleteInput = document.getElementById('delete-account-confirm-input')
  const deleteConfirmBtn = document.getElementById('delete-account-confirm')
  const deleteUsernameLabel = document.getElementById('delete-account-username')

  const allScrims = [passwordScrim, pinScrim, enable2faScrim, disable2faScrim, deactivateScrim, deleteScrim]

  function openDialog(scrim) {
    passwordError.textContent = ''
    pinError.textContent = ''
    enable2faError.textContent = ''
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

  const openEnable2fa = () => {
    enable2faForm.reset()
    openDialog(enable2faScrim)
  }

  const openDisable2fa = () => openDialog(disable2faScrim)

  const openDeactivateAccount = () => openDialog(deactivateScrim)

  const openDeleteAccount = () => {
    deleteInput.value = ''
    deleteConfirmBtn.disabled = true
    deleteUsernameLabel.textContent = currentUser.username
    openDialog(deleteScrim)
  }

  function bind() {
    allScrims.forEach(scrim =>
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

    enable2faForm.addEventListener('submit', e => {
      e.preventDefault()
      const code = document.getElementById('enable-2fa-code').value
      if (!/^\d{6}$/.test(code)) {
        enable2faError.textContent = 'Enter the 6-digit code from your authenticator app.'
        return
      }
      currentUser.twoFactorEnabled = true
      closeDialog(enable2faScrim)
      toast({tone: 'ok', title: 'Two-factor authentication enabled'})
      onAccountStatusChange?.()
    })

    disable2faScrim.querySelector('#disable-2fa-confirm').addEventListener('click', () => {
      currentUser.twoFactorEnabled = false
      closeDialog(disable2faScrim)
      toast({tone: 'ok', title: 'Two-factor authentication turned off'})
      onAccountStatusChange?.()
    })

    deactivateScrim.querySelector('#deactivate-account-confirm').addEventListener('click', () => {
      currentUser.deactivationFrom = new Date().toISOString().slice(0, 10)
      closeDialog(deactivateScrim)
      toast({tone: 'ok', title: 'Account deactivated'})
      onAccountStatusChange?.()
    })

    deleteInput.addEventListener('input', () => {
      deleteConfirmBtn.disabled = deleteInput.value.trim() !== currentUser.username
    })

    deleteConfirmBtn.addEventListener('click', () => {
      if (deleteConfirmBtn.disabled) return
      closeDialog(deleteScrim)
      toast({tone: 'ok', title: 'Account deleted', body: 'This is a prototype — nothing was actually removed.'})
    })
  }

  return {
    openChangePassword,
    openSetPin,
    openEnable2fa,
    openDisable2fa,
    openDeactivateAccount,
    openDeleteAccount,
    bind,
  }
}
