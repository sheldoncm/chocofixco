import { useState } from 'react'
import { useSetAtom } from 'jotai'
import { Link, useLocation } from 'wouter'
import axios from 'axios'
import FormInput from './FormInput'
import GoogleSignIn from './GoogleSignIn'
import { userAtom, adminAtom, flashAtom } from '../state/auth'

// LEARNING NOTE: REUSABLE FORM COMPONENT
// The same login form serves customers and administrators.
// The admin prop determines the portal and destination.

export default function LoginForm(props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setUser = useSetAtom(props.admin ? adminAtom : userAtom)
  const setFlash = useSetAtom(flashAtom)
  const [, navigate] = useLocation()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post(
        props.admin ? '/api/admin/auth/login' : '/api/auth/login',
        props.admin
          ? { email, password }
          : { email, password }
      )

      const user = response.data.user

      setUser(user)

      setFlash({
        type: 'success',
        message: `Welcome, ${
          user.full_name?.includes('@')
            ? (props.admin ? 'Administrator' : 'Customer')
            : user.full_name?.trim().split(' ')[0] || 'Customer'
        }!`
      })

      navigate(user.role === 'admin' ? '/backend' : '/account')
    } catch (error) {
      setError(
        error.response?.data?.error || 'Unable to sign in.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>{props.admin ? 'Admin Portal' : 'Welcome Back'}</h1>

        <p className="text-muted mb-4">
          {props.admin
            ? 'Authorised administrator access only.'
            : 'Sign in to your ChocoFixCo account.'}
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormInput
            id="email"
            label="Email address"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <FormInput
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <button
            className="btn auth-button w-100"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {!props.admin && <GoogleSignIn />}

        {!props.admin && (
          <p className="mt-4 mb-0">
            New to ChocoFixCo?{' '}
            <Link href="/register">Create an account</Link>
          </p>
        )}

        <p className="mt-3 mb-0">
          <Link href="/">Return to shop</Link>
        </p>
      </div>
    </section>
  )
}
