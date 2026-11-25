import { useState } from 'react'
import { useSetAtom } from 'jotai'
import { Link, useLocation } from 'wouter'
import axios from 'axios'
import FormInput from '../components/FormInput'
import BusinessFields from '../components/BusinessFields'
import GoogleSignIn from '../components/GoogleSignIn'
import { userAtom, flashAtom } from '../state/auth'

// LEARNING NOTE: CONTROLLED FORMS AND OBJECT STATE
// Multiple input values are stored in one state object.
// The spread operator preserves existing fields when
// one input changes.

export default function Register() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    account_type: 'individual',
    company_name: '',
    business_registration: ''
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setUser = useSetAtom(userAtom)
  const setFlash = useSetAtom(flashAtom)
  const [, navigate] = useLocation()

  function updateField(event) {
    const { name, value } = event.target

    setForm(previous => ({
      ...previous,
      [name]: value
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post(
        '/api/auth/register', form
      )

      setUser(response.data.user)

      setFlash({
        type: 'success',
        message: response.data.message || 'Your account has been created.'
      })

      navigate('/account')
    } catch (error) {
      setError(
        error.response?.data?.error ||
        'Unable to create your account.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Create an Account</h1>
        <p className="text-muted mb-4">
          Join the ChocoFixCo chocolate community.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <BusinessFields values={form} onChange={updateField} />
          <FormInput
            id="full_name"
            label="Full name"
            value={form.full_name}
            onChange={updateField}
            autoComplete="name"
            maxLength={150}
            required
          />

          <FormInput
            id="email"
            label="Email address"
            type="email"
            value={form.email}
            onChange={updateField}
            autoComplete="email"
            maxLength={255}
            required
          />

          <FormInput
            id="phone"
            label="Mobile number (optional)"
            type="tel"
            value={form.phone}
            onChange={updateField}
            autoComplete="tel"
            maxLength={30}
          />

          <FormInput
            id="password"
            label="Password (minimum 8 characters)"
            type="password"
            value={form.password}
            onChange={updateField}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <FormInput
            id="confirm_password"
            label="Confirm password"
            type="password"
            value={form.confirm_password}
            onChange={updateField}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <button
            className="btn auth-button w-100"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="small text-muted mt-3">
          Returning after deactivating your account?
          Register using your original email and password
          to restore your existing account.
        </p>

        <GoogleSignIn register={true} />
        <p className="small text-muted mt-2">
          Google users can complete business details in My Account.
        </p>

        <p className="mt-4 mb-0">
          Already registered?{' '}
          <Link href="/login">Sign in</Link>
        </p>
      </div>
    </section>
  )
}
