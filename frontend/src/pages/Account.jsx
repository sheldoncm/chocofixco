import { useState, useEffect } from 'react'
import { useAtom } from 'jotai'
import axios from 'axios'
import { Link } from 'wouter'
import FormInput from '../components/FormInput'
import BusinessFields from '../components/BusinessFields'
import DeactivateAccount from '../components/DeactivateAccount'
import { userAtom } from '../state/auth'

// LEARNING NOTE: READ AND UPDATE OPERATIONS
// GET retrieves account details from the REST API.
// PUT updates existing records.
// useEffect retrieves data when the component mounts.

export default function Account() {
  const [user, setUser] = useAtom(userAtom)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [business, setBusiness] = useState({
    account_type: 'individual',
    company_name: '',
    business_registration: ''
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    axios.get('/api/auth/me', {
      signal: controller.signal
    })
      .then(response => {
        setName(response.data.user.full_name)
        setPhone(response.data.user.phone || '')
        setBusiness({
          account_type: response.data.user.account_type || 'individual',
          company_name: response.data.user.company_name || '',
          business_registration: response.data.user.business_registration || ''
        })
        setLoading(false)
      })
      .catch(error => {
        if (!axios.isCancel(error)) {
          setError('Unable to retrieve your profile.')
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await axios.put('/api/auth/profile', {
        full_name: name,
        phone,
        ...business
      })

      setUser(response.data.user)
      setMessage(response.data.message)
    } catch (error) {
      setError(
        error.response?.data?.error ||
        'Unable to update your profile.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>My Account</h1>
        <p className="text-muted mb-4">
          Manage your personal information.
        </p>

        {error && (
          <div className="alert alert-danger">{error}</div>
        )}

        {message && (
          <div className="alert alert-success" role="status">
            {message}
          </div>
        )}

        <div className="account-actions">
          <Link href="/account/orders">My Orders</Link>
          <Link href="/account/addresses">Saved Addresses</Link>
          <Link href="/account/password">Login &amp; Security</Link>
        </div>

        {loading ? (
          <p>Loading your profile...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <BusinessFields values={business}
              onChange={event => {
                const { name, value } = event.target
                setBusiness(previous => ({ ...previous, [name]: value }))
              }} />
            <FormInput
              id="full_name"
              label="Full name"
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={150}
              required
            />

            <FormInput
              id="email"
              label="Email address"
              type="email"
              value={user?.email || ''}
              readOnly
            />

            <FormInput
              id="phone"
              label="Mobile number"
              type="tel"
              value={phone}
              onChange={event => setPhone(event.target.value)}
              maxLength={30}
            />

            <button
              type="submit"
              className="btn auth-button w-100"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
        <DeactivateAccount />
      </div>
    </section>
  )
}
