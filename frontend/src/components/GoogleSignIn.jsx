import { useEffect, useRef, useState } from 'react'
import { useSetAtom } from 'jotai'
import { useLocation } from 'wouter'
import axios from 'axios'
import { loadGoogle } from '../utils/googleAuth'
import { userAtom, flashAtom } from '../state/auth'

// LEARNING NOTE: REUSABLE COMPONENT, EFFECTS AND STATE
// useEffect connects React to an external Google service.
// useRef identifies the DOM element used by Google's button.
// Jotai shares authentication state across the application.

export default function GoogleSignIn(props) {
  const buttonRef = useRef(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const setUser = useSetAtom(userAtom)
  const setFlash = useSetAtom(flashAtom)
  const deactivation = props.deactivation === true
  const onDeactivated = props.onDeactivated
  const [, navigate] = useLocation()

  useEffect(() => {
    let active = true
    let submitting = false
    const element = buttonRef.current

    async function initialise() {
      try {
        const google = await loadGoogle()
        if (!active) return

        const response = await axios.get(
          deactivation
            ? '/api/account/google/challenge'
            : '/api/auth/google/challenge'
        )

        if (!active || !element) return

        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          nonce: response.data.nonce,
          auto_select: false,

          callback: async result => {
            if (!active || submitting) return
            submitting = true
            setError('')

            try {
              const response = await axios.post(
                deactivation
                  ? '/api/account/google/deactivate'
                  : '/api/auth/google',
                { credential: result.credential }
              )

              if (!active) return

              if (deactivation) {
                onDeactivated?.()
                return
              }

              const user = response.data.user
              setUser(user)

              setFlash({
                type: 'success',
                message: `Welcome, ${user.full_name.split(' ')[0]}!`
              })

              navigate('/account')
            } catch (error) {
              if (active) {
                setError(
                  error.response?.data?.error ||
                  'Google Sign-In was unsuccessful.'
                )
              }
            } finally {
              submitting = false
            }
          }
        })

        element.replaceChildren()

        google.accounts.id.renderButton(element, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: props.register ? 'signup_with' : 'continue_with',
          width: Math.min(400, Math.floor(element.clientWidth))
        })
      } catch {
        if (active) {
          setError('Google Sign-In is temporarily unavailable.')
        }
      }
    }

    initialise()

    return () => {
      active = false
      element?.replaceChildren()
    }
  }, [attempt, props.register, setUser, setFlash, navigate, deactivation, onDeactivated])

  return (
    <div className="google-auth">
      {!deactivation && (
        <div className="google-auth-divider">
          <span>or</span>
        </div>
      )}

      <div ref={buttonRef} className="google-auth-button" />

      {error && (
        <div className="google-auth-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="btn auth-button"
            onClick={() => {
              setError('')
              setAttempt(previous => previous + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
