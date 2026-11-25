import { useState, useCallback } from 'react'
import { useSetAtom } from 'jotai'
import { useLocation } from 'wouter'
import axios from 'axios'
import FormInput from './FormInput'
import GoogleSignIn from './GoogleSignIn'
import { userAtom, flashAtom } from '../state/auth'
import { confirmationAtom } from '../state/orders'

// LEARNING NOTE: Conditional rendering based on authentication method.

export default function DeactivateAccount() {
  const [open, setOpen] = useState(false)
  const [methods, setMethods] = useState(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const setUser = useSetAtom(userAtom)
  const setFlash = useSetAtom(flashAtom)
  const setConfirmation = useSetAtom(confirmationAtom)
  const [, navigate] = useLocation()

  const finishDeactivation = useCallback(() => {
    setPassword('')
    setUser(null)
    setConfirmation(null)
    setFlash({
      type: 'success',
      message: 'Your account has been deactivated.'
    })
    navigate('/')
  }, [setUser, setConfirmation, setFlash, navigate])

  async function openDeactivation() {
    setSaving(true)
    setError('')

    try {
      const response = await axios.get('/api/account/methods')
      setMethods(response.data)
      setOpen(true)
    } catch (error) {
      setError(error.response?.data?.error ||
        'Unable to retrieve verification methods.')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await axios.post('/api/account/deactivate', { password })
      finishDeactivation()
    } catch (error) {
      setError(error.response?.data?.error ||
        'Unable to deactivate your account.')
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setOpen(false)
    setPassword('')
    setError('')
  }

  return (
    <div className="cf-deactivate-account">
      <h2>Account Status</h2>
      <p>Deactivate your account and prevent future sign-ins.
        Existing transaction records will be retained.</p>

      {error && <p className="text-danger" role="alert">{error}</p>}

      {!open ? (
        <button type="button" className="cf-user-action"
          onClick={openDeactivation} disabled={saving}>
          Deactivate Account
        </button>
      ) : (
        <>
          <p><strong>Verify your identity to deactivate your account.</strong></p>

          {Boolean(methods?.has_password) && (
            <form onSubmit={deactivate}>
              <FormInput id="deactivate-password"
                label="Confirm your current password"
                type="password" value={password}
                onChange={event => setPassword(event.target.value)}
                required />

              <button type="submit" className="cf-primary-button"
                disabled={saving}>
                Confirm Deactivation
              </button>
            </form>
          )}

          {Boolean(methods?.google_connected) && (
            <div className="mt-3">
              <p>Continuing with your linked Google account
                will confirm and deactivate your account.</p>

              <GoogleSignIn
                deactivation
                onDeactivated={finishDeactivation} />
            </div>
          )}

          {!methods?.has_password && !methods?.google_connected && (
            <p>Please contact customer support to verify your identity.</p>
          )}

          <button type="button" className="cf-reset-button mt-3"
            onClick={cancel} disabled={saving}>
            Cancel
          </button>
        </>
      )}
    </div>
  )
}
