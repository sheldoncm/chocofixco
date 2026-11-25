import { useState, useEffect, useCallback } from 'react'
import { useSetAtom } from 'jotai'
import { Link, useLocation } from 'wouter'
import axios from 'axios'
import FormInput from '../components/FormInput'
import GoogleSecurity from '../components/GoogleSecurity'
import { userAtom, flashAtom } from '../state/auth'

export default function LoginSecurity() {
  const [methods, setMethods] = useState(null)
  const [operation, setOperation] = useState('')
  const [credentials, setCredentials] = useState(null)
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const setUser = useSetAtom(userAtom)
  const setFlash = useSetAtom(flashAtom)
  const [, navigate] = useLocation()

  useEffect(() => {
    const controller = new AbortController()

    axios.get('/api/account/methods', {
      signal: controller.signal
    }).then(response => {
      setMethods(response.data)
    }).catch(error => {
      if (!axios.isCancel(error)) {
        setError('Unable to retrieve login methods.')
      }
    })

    return () => controller.abort()
  }, [])

  const complete = useCallback(message => {
    setUser(null)
    setFlash({ type: 'success', message })
    navigate('/login')
  }, [setUser, setFlash, navigate])

  function start(value) {
    setOperation(value)
    setCredentials(null)
    setPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (operation === 'set-password' &&
        newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (operation === 'unlink') {
      setBusy(true)

      try {
        const response = await axios.post('/api/security/unlink', {
          password
        })

        complete(response.data.message)
      } catch (error) {
        setError(error.response?.data?.error ||
          'Unable to disconnect Google.')
      } finally {
        setBusy(false)
      }

      return
    }

    setCredentials({
      password,
      new_password: newPassword,
      confirm_password: confirmPassword
    })

    setPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Login &amp; Security</h1>
        <p>Manage your account password and sign-in methods.</p>

        {error && <div className="alert alert-danger"
          role="alert">{error}</div>}

        {!methods && !error && <p>Loading security settings...</p>}

        {methods && (
          <>
            <article className="cf-address-card">
              <h2 className="h5">Password</h2>
              <p>{methods.has_password
                ? 'Password sign-in is enabled.'
                : 'No password has been configured.'}</p>

              {methods.has_password ? (
                <Link href="/account/change-password"
                  className="cf-user-action">Change Password</Link>
              ) : (
                <button type="button" className="cf-user-action"
                  disabled={Boolean(operation)}
                  onClick={() => start('set-password')}>
                  Set Password
                </button>
              )}
            </article>

            <article className="cf-address-card">
              <h2 className="h5">Google Sign-In</h2>
              <p>{methods.google_connected
                ? 'Google account connected.'
                : 'Google account not connected.'}</p>

              <button type="button" className="cf-user-action"
                disabled={Boolean(operation) || !methods.has_password}
                onClick={() => start(
                  methods.google_connected ? 'unlink' : 'link'
                )}>
                {methods.google_connected
                  ? 'Disconnect Google' : 'Connect Google'}
              </button>

              {!methods.has_password && (
                <p className="small mt-2 mb-0">
                  Set a password before disconnecting Google.
                </p>
              )}
            </article>
          </>
        )}

        {operation && (
          <article className="cf-address-card">
            <h2 className="h5">
              {operation === 'link' ? 'Connect Google' :
                operation === 'unlink' ? 'Disconnect Google' :
                  'Set Password'}
            </h2>

            {!credentials ? (
              <form onSubmit={submit}>
                {operation !== 'set-password' ? (
                  <FormInput id="security-password"
                    label="Current password" type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    autoComplete="current-password" required />
                ) : (
                  <>
                    <FormInput id="security-new-password"
                      label="New password (minimum 8 characters)"
                      type="password" minLength={8}
                      value={newPassword}
                      onChange={event => setNewPassword(event.target.value)}
                      autoComplete="new-password" required />

                    <FormInput id="security-confirm-password"
                      label="Confirm password" type="password"
                      value={confirmPassword}
                      onChange={event => setConfirmPassword(event.target.value)}
                      autoComplete="new-password" required />
                  </>
                )}

                <button type="submit"
                  className="btn auth-button w-100"
                  disabled={busy}>
                  {operation === 'unlink'
                    ? 'Confirm Disconnect' : 'Continue'}
                </button>
              </form>
            ) : (
              <>
                <p>Verify your identity with Google to complete this change.</p>

                <GoogleSecurity purpose={operation}
                  credentials={credentials}
                  onComplete={complete} />
              </>
            )}

            <button type="button" className="cf-user-action mt-3"
              disabled={busy}
              onClick={() => start('')}>
              {credentials ? 'Start Again / Close' : 'Cancel'}
            </button>
          </article>
        )}

        <Link href="/account">Return to My Account</Link>
      </div>
    </section>
  )
}
