import { useState } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { Link, useLocation } from 'wouter'
import axios from 'axios'
import FormInput from '../components/FormInput'
import { adminAtom, flashAtom } from '../state/auth'

// LEARNING NOTE: Controlled form state and event handling.

export default function AdminSecurity() {
  const admin = useAtomValue(adminAtom)
  const setAdmin = useSetAtom(adminAtom)
  const setFlash = useSetAtom(flashAtom)
  const [, navigate] = useLocation()

  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateField(name, value) {
    setForm(previous => ({ ...previous, [name]: value }))
  }

  async function save(event) {
    event.preventDefault()
    setError('')

    if (form.new_password !== form.confirm_password) {
      setError('New passwords do not match.')
      return
    }

    setSaving(true)

    try {
      await axios.put('/api/admin/auth/password', form)

      setAdmin(null)
      setFlash({
        type: 'success',
        message: 'Password updated. Please sign in again.'
      })

      navigate('/admin/login')
    } catch (error) {
      setError(error.response?.data?.error ||
        'Unable to update password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Administrator Account</h1>
        <p>Manage your administrator login and security.</p>

        <FormInput id="admin-name" label="Full name"
          value={admin?.full_name || ''} readOnly />

        <FormInput id="admin-email" label="Email address"
          type="email" value={admin?.email || ''} readOnly />

        <hr />

        <h2 className="h5 mb-3">Change Password</h2>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={save}>
          <FormInput id="admin-current-password"
            label="Current password" type="password"
            autoComplete="current-password"
            value={form.current_password}
            onChange={event =>
              updateField('current_password', event.target.value)}
            required />

          <FormInput id="admin-new-password"
            label="New password" type="password"
            autoComplete="new-password"
            minLength={12}
            value={form.new_password}
            onChange={event =>
              updateField('new_password', event.target.value)}
            required />

          <FormInput id="admin-confirm-password"
            label="Confirm new password" type="password"
            autoComplete="new-password"
            value={form.confirm_password}
            onChange={event =>
              updateField('confirm_password', event.target.value)}
            required />

          <button className="btn auth-button w-100"
            type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Update Password'}
          </button>
        </form>

        <Link href="/backend" className="d-block mt-3">
          Return to Dashboard
        </Link>
      </div>
    </section>
  )
}
