import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { loadGoogle } from '../utils/googleAuth'

// LEARNING NOTE: Props, external services and effect cleanup.
// The server verifies identity before updating login methods.

export default function GoogleSecurity({
  purpose, credentials, onComplete
}) {
  const buttonRef = useRef(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    let submitting = false
    const element = buttonRef.current

    async function initialise() {
      try {
        const google = await loadGoogle()
        if (!active) return

        const response = await axios.post('/api/security/challenge', {
          purpose,
          password: credentials.password
        })

        if (!active || !element) return

        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          nonce: response.data.nonce,
          auto_select: false,

          callback: async result => {
            if (!active || submitting) return

            submitting = true
            setBusy(true)
            setError('')

            try {
              const response = await axios.post('/api/security/google', {
                credential: result.credential,
                new_password: credentials.new_password,
                confirm_password: credentials.confirm_password
              })

              onComplete(response.data.message)
            } catch (error) {
              if (active) {
                setError(error.response?.data?.error ||
                  'Google verification failed. Start again.')
              }
            } finally {
              submitting = false
              if (active) setBusy(false)
            }
          }
        })

        element.replaceChildren()

        google.accounts.id.renderButton(element, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: Math.min(400, Math.floor(element.clientWidth))
        })
      } catch (error) {
        if (active) {
          setError(error.response?.data?.error ||
            'Unable to initialise Google verification.')
        }
      }
    }

    initialise()

    return () => {
      active = false
      element?.replaceChildren()
    }
  }, [purpose, credentials, onComplete])

  return (
    <div className="google-auth">
      <div ref={buttonRef} className="google-auth-button" />
      {busy && <p>Verifying your Google account...</p>}
      {error && <p className="text-danger" role="alert">{error}</p>}
    </div>
  )
}
