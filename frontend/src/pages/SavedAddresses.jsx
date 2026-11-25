import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import axios from 'axios'
import { useAtomValue } from 'jotai'
import { userAtom } from '../state/auth'

const emptyAddress = {
  label: 'Home',
  recipient_name: '',
  phone: '',
  delivery_address: '',
  postal_code: '',
  is_default: false
}

// LEARNING NOTE: CRUD with array state, controlled inputs,
// useEffect, reusable components and REST endpoints.

export default function SavedAddresses() {
  const user = useAtomValue(userAtom)
  const [addresses, setAddresses] = useState([])
  const [form, setForm] = useState(emptyAddress)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function refresh() {
    const response = await axios.get('/api/customer/addresses')
    setAddresses(response.data)
  }

  useEffect(() => {
    const controller = new AbortController()

    axios.get('/api/customer/addresses', {
      signal: controller.signal
    }).then(response => {
      setAddresses(response.data)
      setLoading(false)
    }).catch(error => {
      if (!axios.isCancel(error)) {
        setError('Unable to retrieve addresses.')
        setLoading(false)
      }
    })

    return () => controller.abort()
  }, [])

  function change(event) {
    const { name, value, checked, type } = event.target

    setForm(previous => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function openForm(address = null) {
    setEditing(address?.address_id || null)

    setForm(address ? {
      ...address,
      phone: address.phone || '',
      is_default: Boolean(address.is_default)
    } : {
      ...emptyAddress,
      recipient_name: user?.full_name || '',
      phone: user?.phone || ''
    })

    setOpen(true)
    setError('')
    setMessage('')
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (editing) {
        await axios.put(`/api/customer/addresses/${editing}`, form)
      } else {
        await axios.post('/api/customer/addresses', form)
      }

      await refresh()
      setOpen(false)
      setMessage('Address saved successfully.')
    } catch (error) {
      setError(error.response?.data?.error || 'Unable to save address.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(address) {
    if (!window.confirm(`Remove ${address.label} address?`)) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      await axios.delete(`/api/customer/addresses/${address.address_id}`)
      setAddresses(previous => previous.filter(
        item => item.address_id !== address.address_id
      ))
      await refresh()
      setMessage('Address removed.')
    } catch (error) {
      setError(error.response?.data?.error || 'Unable to remove address.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Saved Addresses</h1>
        <p>Manage your delivery address book.</p>

        <Link href="/account">Return to My Account</Link>

        {error && <div className="alert alert-danger mt-3">{error}</div>}
        {message && <div className="alert alert-success mt-3"
          role="status">{message}</div>}

        <button type="button"
          className="btn auth-button w-100 my-3"
          disabled={saving} onClick={() => openForm()}>
          + Add Address
        </button>

        {open && (
          <form onSubmit={save} className="cf-user-form">
            <h2>{editing ? 'Edit Address' : 'New Address'}</h2>

            {[
              ['label', 'Address label', 50],
              ['recipient_name', 'Recipient name', 150],
              ['phone', 'Mobile number', 30],
              ['delivery_address', 'Delivery address', 255],
              ['postal_code', 'Singapore postal code', 6]
            ].map(([name, label, length]) => (
              <label key={name} className="d-block mb-3">
                {label}
                <input className="form-control mt-1"
                  name={name} value={form[name]}
                  onChange={change} maxLength={length}
                  required={name !== 'phone'}
                  pattern={name === 'postal_code'
                    ? '[0-9]{6}' : undefined} />
              </label>
            ))}

            <label className="d-block mb-3">
              <input type="checkbox" name="is_default"
                className="me-2"
                checked={form.is_default} onChange={change} />
              Default delivery address
            </label>

            <div className="cf-user-actions">
              <button className="cf-primary-button"
                type="submit" disabled={saving}>Save Address</button>
              <button className="cf-reset-button"
                type="button" disabled={saving}
                onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        )}

        {loading && <p>Loading addresses...</p>}

        {!loading && !addresses.length && (
          <p>No saved addresses yet.</p>
        )}

        {addresses.map(address => (
          <article key={address.address_id} className="cf-address-card">
            <strong>{address.label}</strong>
            {Boolean(address.is_default) && (
              <span className="cf-user-status active ms-2">Default</span>
            )}

            <p className="mt-2 mb-2">
              {address.recipient_name}<br />
              {address.delivery_address}<br />
              Singapore {address.postal_code}
            </p>

            <div className="cf-user-actions">
              <button className="cf-user-action"
                disabled={saving}
                onClick={() => openForm(address)}>Edit</button>
              <button className="cf-user-action"
                disabled={saving}
                onClick={() => remove(address)}>Remove</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
