import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import axios from 'axios'
import BusinessFields from '../components/BusinessFields'
import { adminAtom } from '../state/auth'

// LEARNING NOTE: Controlled forms, REST requests,
// array state, filtering and conditional rendering.

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  role: 'customer',
  account_type: 'individual',
  company_name: '',
  business_registration: '',
  password: ''
}

export default function ManageUsers() {
  const admin = useAtomValue(adminAtom)
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadUsers() {
    const response = await axios.get('/api/manage/users')
    setUsers(response.data)
  }

  useEffect(() => {
    const controller = new AbortController()

    axios.get('/api/manage/users', {
      signal: controller.signal
    }).then(response => {
      setUsers(response.data)
      setLoading(false)
    }).catch(error => {
      if (!axios.isCancel(error)) {
        setError('Unable to retrieve users.')
        setLoading(false)
      }
    })

    return () => controller.abort()
  }, [])

  const filtered = users.filter(user => {
    const matchesSearch =
      `${user.full_name} ${user.email} ${user.company_name || ''}`
        .toLowerCase().includes(search.toLowerCase())

    return matchesSearch &&
      (role === 'all' || user.role === role) &&
      (status === 'all' ||
        Boolean(user.is_active) === (status === 'active'))
  })

  function updateField(event) {
    const { name, value } = event.target
    setForm(previous => ({ ...previous, [name]: value }))
  }

  function openForm(user = null) {
    setEditing(user)
    setForm(user ? {
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      account_type: user.account_type || 'individual',
      company_name: user.company_name || '',
      business_registration: user.business_registration || '',
      password: ''
    } : { ...emptyForm })
    setError('')
    setMessage('')
    setShowForm(true)
  }

  async function saveUser(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (editing) {
        await axios.put(`/api/manage/users/${editing.user_id}`, {
          full_name: form.full_name,
          phone: form.phone,
          account_type: form.account_type,
          company_name: form.company_name,
          business_registration: form.business_registration
        })
      } else {
        await axios.post('/api/manage/users', form)
      }

      setShowForm(false)
      setForm({ ...emptyForm })
      setMessage('Account saved successfully.')
      await loadUsers()
    } catch (error) {
      setError(error.response?.data?.error ||
        'Unable to save account.')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(user) {
    const active = !user.is_active

    if (!window.confirm(
      `${active ? 'Reactivate' : 'Deactivate'} ${user.full_name}?`
    )) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await axios.patch(
        `/api/manage/users/${user.user_id}/status`,
        { is_active: active }
      )

      setUsers(previous => previous.map(item =>
        item.user_id === user.user_id
          ? { ...item, is_active: active ? 1 : 0 }
          : item
      ))

      setMessage(response.data.message)
    } catch (error) {
      setError(error.response?.data?.error ||
        'Unable to change account status.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-workspace">
      <div className="admin-workspace-inner">
        <div className="cf-users-heading">
          <div>
            <p className="boutique-label">ADMINISTRATION</p>
            <h1>User Management</h1>
            <p>Manage customer and administrator accounts.</p>
          </div>
          <button className="cf-primary-button"
            onClick={() => openForm()} disabled={saving}>
            + Create User
          </button>
        </div>

        <div className="cf-user-summary">
          <div><span>Total Users</span><strong>{users.length}</strong></div>
          <div><span>Customers</span><strong>
            {users.filter(user => user.role === 'customer').length}
          </strong></div>
          <div><span>Administrators</span><strong>
            {users.filter(user => user.role === 'admin').length}
          </strong></div>
          <div><span>Inactive</span><strong>
            {users.filter(user => !user.is_active).length}
          </strong></div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success"
          role="status">{message}</div>}

        {showForm && (
          <form className="cf-user-form" onSubmit={saveUser}>
            <h2>{editing ? 'Edit User' : 'Create User'}</h2>

            <div className="cf-user-form-grid">
              <label>Full name
                <input className="form-control" name="full_name"
                  value={form.full_name} onChange={updateField}
                  maxLength={150} required />
              </label>

              <label>Email address
                <input className="form-control" name="email"
                  type="email" value={form.email}
                  onChange={updateField} readOnly={Boolean(editing)}
                  required />
              </label>

              <label>Role
                <select className="form-select" name="role"
                  value={form.role} onChange={updateField}
                  disabled={Boolean(editing)}>
                  <option value="customer">Customer</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>

              {form.role === 'customer' && (
                <label>Mobile number
                  <input className="form-control" name="phone"
                    value={form.phone} onChange={updateField}
                    maxLength={30} />
                </label>
              )}

              {form.role === 'customer' && (
                <BusinessFields values={form} onChange={updateField} />
              )}

              {!editing && (
                <label>Password (minimum 12 characters)
                  <input className="form-control" name="password"
                    type="password" autoComplete="new-password"
                    value={form.password} onChange={updateField}
                    minLength={12} required />
                </label>
              )}
            </div>

            <div className="cf-user-actions">
              <button className="cf-primary-button"
                disabled={saving} type="submit">
                {saving ? 'Saving...' : 'Save User'}
              </button>
              <button className="cf-reset-button" type="button"
                onClick={() => {
                  setShowForm(false)
                  setForm({ ...emptyForm })
                }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="cf-user-panel">
          <div className="cf-user-filters">
            <input className="form-control"
              aria-label="Search users"
              placeholder="Search name or email..."
              value={search}
              onChange={event => setSearch(event.target.value)} />

            <select className="form-select" aria-label="Filter role"
              value={role}
              onChange={event => setRole(event.target.value)}>
              <option value="all">All roles</option>
              <option value="admin">Administrators</option>
              <option value="customer">Customers</option>
            </select>

            <select className="form-select" aria-label="Filter status"
              value={status}
              onChange={event => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="table-responsive">
            <table className="table align-middle cf-user-table">
              <thead>
                <tr>
                  <th>Name / Email</th>
                  <th>Role / Account Type</th>
                  <th>Status</th>
                  <th>Authentication</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.user_id}>
                    <td>
                      <strong>{user.full_name}</strong>
                      <small>{user.email}</small>
                    </td>
                    <td>{user.role === 'admin'
                      ? 'Administrator' : 'Customer'}
                      {user.role === 'customer' && (
                        <small>{user.account_type === 'business'
                          ? `Business: ${user.company_name || ''}`
                          : 'Individual'}</small>
                      )}
                    </td>
                    <td>
                      <span className={`cf-user-status ${
                        user.is_active ? 'active' : 'inactive'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {[
                        user.has_password && 'Password',
                        user.google_connected && 'Google'
                      ].filter(Boolean).join(' / ') || 'None'}
                    </td>
                    <td>
                      <div className="cf-user-actions">
                        <button className="cf-user-action"
                          onClick={() => openForm(user)}
                          disabled={saving}>Edit</button>
                        <button className="cf-user-action"
                          disabled={saving ||
                            user.user_id === admin?.user_id}
                          onClick={() => changeStatus(user)}>
                          {user.is_active
                            ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr><td colSpan={5}>
                    {loading ? 'Loading users...' : 'No matching users.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
