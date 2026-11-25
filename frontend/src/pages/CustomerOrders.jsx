import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import axios from 'axios'
import { money, fulfilment, apiError } from '../utils/orders'

// LEARNING NOTE: REST API, useEffect AND LIST RENDERING
// Retrieve the authenticated customer's orders on mount.
// Store the returned array in React state.
// map() renders each order using its unique database ID.

export default function CustomerOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    axios.get('/api/customer/orders', {
      signal: controller.signal
    })
      .then(response => setOrders(response.data.orders))
      .catch(error => {
        if (!axios.isCancel(error)) setError(apiError(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return (
    <section className="management-page customer-orders">
      <p className="boutique-label">MY ACCOUNT</p>
      <h1>My Orders</h1>

      <p>View your chocolate orders and their current status.</p>

      <Link href="/account">Back to My Account</Link>

      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-4">Loading your orders...</p>
      ) : orders.length === 0 && !error ? (
        <div className="customer-empty-state">
          <h2>No orders yet</h2>
          <p>Your chocolate journey starts here.</p>
          <Link href="/" className="boutique-button">
            Explore Our Chocolates
          </Link>
        </div>
      ) : (
        <div className="table-responsive mt-4">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Order</th>
                <th>Order date</th>
                <th>Fulfilment</th>
                <th>Total</th>
                <th>Order status</th>
                <th>Payment</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.order_id}>
                  <td>#{order.order_id}</td>
                  <td>{String(order.order_date).slice(0, 10)}</td>
                  <td>{fulfilment(order.fulfilment_method)}</td>
                  <td>{money(order.total_amount)}</td>
                  <td>{order.order_status}</td>
                  <td>{order.payment_status}</td>
                  <td>
                    <Link href={'/account/orders/' + order.order_id}>
                      View Order
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
