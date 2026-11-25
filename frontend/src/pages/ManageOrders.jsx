import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import axios from 'axios'
import { money, fulfilment, apiError } from '../utils/orders'

// FF02: Controlled search and select inputs.
// FF04: Query parameters and REST API retrieval.

export default function ManageOrders() {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    axios.get('/api/manage/orders', {
      params: filters,
      signal: controller.signal
    })
      .then(response => setData(response.data))
      .catch(error => {
        if (!axios.isCancel(error)) setError(apiError(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [filters])

  function applyFilters(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setFilters({ search, status })
  }

  function reset() {
    setSearch('')
    setStatus('')
    setError('')
    setLoading(true)
    setFilters({ search: '', status: '' })
  }

  const summary = data?.summary || {}
  const orders = data?.orders || []

  return (
    <section className="management-page order-management-page">
      <div className="section-heading">
        <p className="eyebrow">CHOCOFIXCO BACKEND</p>
        <h1>Order Management</h1>
        <p>View customer orders and manage fulfilment.</p>
      </div>

      <p><Link href="/backend">← Back to Backend</Link></p>

      <div className="order-summary-grid">
        {[
          ['Total Orders', summary.total_orders ?? 0],
          ['Pending Orders', summary.pending_orders ?? 0],
          ['Non-cancelled Order Value', money(summary.active_order_value)]
        ].map(([label, value]) => (
          <div className="order-summary-card" key={label}>
            <span>{label}</span><strong>{value}</strong>
          </div>
        ))}
      </div>

      <form className="order-search-form" onSubmit={applyFilters}>
        <div>
          <label htmlFor="search">Search orders</label>
          <input id="search" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Order number, name or email" />
        </div>

        <div>
          <label htmlFor="status">Order status</label>
          <select id="status" value={status}
            onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {(data?.statuses || []).map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <button className="management-button">Search</button>
        <button type="button" className="btn btn-outline-secondary"
          onClick={reset}>Reset</button>
      </form>

      {error && <div className="alert alert-danger"
        role="alert">{error}</div>}

      {loading ? <p>Loading orders...</p> : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                {['Order', 'Customer', 'Date', 'Fulfilment', 'Items',
                  'Total', 'Order Status', 'Payment', 'Action'].map(label =>
                  <th key={label}>{label}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.order_id}>
                  <td>#{order.order_id}</td>
                  <td><strong>{order.full_name}</strong>
                    <small className="d-block">{order.email}</small></td>
                  <td>{order.collection_date || 'Not set'}</td>
                  <td>{fulfilment(order.fulfilment_method)}</td>
                  <td>{order.total_quantity}</td>
                  <td>{money(order.total_amount)}</td>
                  <td>{order.order_status}</td>
                  <td>{order.payment_status}</td>
                  <td>
                    <Link className="cf-order-view-button"
                      href={'/manage/orders/' + order.order_id}>
                      View / Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {!orders.length && (
                <tr><td colSpan={9}>No matching orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
