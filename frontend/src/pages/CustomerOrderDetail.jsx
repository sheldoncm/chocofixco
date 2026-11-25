import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import axios from 'axios'
import { money, fulfilment, apiError } from '../utils/orders'

// LEARNING NOTE: DYNAMIC ROUTES AND PROPS
// Wouter passes the order ID through route parameters.
// The backend independently verifies order ownership.

export default function CustomerOrderDetail(props) {
  const id = props.params.id

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    axios.get('/api/customer/orders/' + id, {
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
  }, [id])

  if (loading) {
    return <p className="management-page">Loading order...</p>
  }

  if (!data) {
    return (
      <section className="management-page">
        <h1>Order unavailable</h1>
        <p role="alert">{error || 'Order not found.'}</p>
        <Link href="/account/orders">Back to My Orders</Link>
      </section>
    )
  }

  const { order, items } = data
  const delivery = order.fulfilment_method === 'Delivery'

  const details = [
    ['Order reference', '#' + order.order_id],
    ['Order date', String(order.order_date).slice(0, 10)],
    ['Fulfilment', fulfilment(order.fulfilment_method)],
    [delivery ? 'Delivery date' : 'Collection date',
      String(order.collection_date || '').slice(0, 10)],
    ...(delivery ? [
      ['Delivery address', order.delivery_address],
      ['Postal code', order.postal_code]
    ] : []),
    ['Order status', order.order_status],
    ['Payment status', order.payment_status],
    ['Delivery fee', money(order.delivery_fee)],
    ['Grand total', money(order.total_amount)]
  ]

  return (
    <section className="order-confirmation">
      <p className="boutique-label">MY ORDERS</p>
      <h1>Order #{order.order_id}</h1>

      <div className="confirmation-details">
        {details.map(([label, value]) => (
          <p key={label}>
            <strong>{label}:</strong> {value}
          </p>
        ))}
      </div>

      <h2 className="mt-4">Your Chocolates</h2>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Chocolate</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.product_id}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{money(item.unit_price)}</td>
                <td>{money(
                  Number(item.unit_price) * Number(item.quantity)
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/account/orders" className="boutique-button">
        Back to My Orders
      </Link>
    </section>
  )
}
