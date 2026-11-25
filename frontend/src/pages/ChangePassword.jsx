import { useState } from 'react'
import { useSetAtom } from 'jotai'
import { Link, useLocation } from 'wouter'
import axios from 'axios'
import FormInput from '../components/FormInput'
import { userAtom, flashAtom } from '../state/auth'

// LEARNING NOTE: REUSABLE FORM COMPONENTS
// FormInput is reused for all three password fields.
// Controlled inputs and validation protect form integrity.
// PUT updates the authenticated user's password.

export default function ChangePassword() {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const setUser = useSetAtom(userAtom)
  const setFlash = useSetAtom(flashAtom)
  const [, navigate] = useLocation()

  function change(event) {
    const { name, value } = event.target
    setForm(previous => ({ ...previous, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (form.new_password !== form.confirm_password) {
      setError('New passwords do not match.')
      return
    }

    setBusy(true)

    try {
      await axios.put('/api/auth/password', form)

      setUser(null)
      setFlash({
        type: 'success',
        message: 'Password updated. Please sign in again.'
      })

      navigate('/login')
    } catch (error) {
      setError(
        error.response?.data?.error ||
        'Unable to change your password.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Change Password</h1>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={submit}>
          <FormInput
            id="current_password"
            label="Current password"
            type="password"
            value={form.current_password}
            onChange={change}
            autoComplete="current-password"
            required
          />

          <FormInput
            id="new_password"
            label="New password (minimum 8 characters)"
            type="password"
            value={form.new_password}
            onChange={change}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <FormInput
            id="confirm_password"
            label="Confirm new password"
            type="password"
            value={form.confirm_password}
            onChange={change}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <button
            type="submit"
            className="btn auth-button w-100"
            disabled={busy}
          >
            {busy ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <p className="mt-3">
          <Link href="/account">Back to My Account</Link>
        </p>
      </div>
    </section>
  )
}
