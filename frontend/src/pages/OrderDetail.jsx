import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import axios from 'axios'
import { money, fulfilment, apiError } from '../utils/orders'

// FF01: Reusable components and props.
// FF02: Controlled select inputs and PUT update.
// Database transactions remain the responsibility of Express.

function InfoRows({ rows }) {
  return rows.map(([label, value]) => (
    <div className="cf-order-info-row" key={label}>
      <span>{label}</span><strong>{value}</strong>
    </div>
  ))
}

export default function OrderDetail({ params }) {
  const endpoint = '/api/manage/orders/' + params.id
  const [data, setData] = useState(null)
  const [form, setForm] = useState({
    order_status: '', payment_status: ''
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    axios.get(endpoint, { signal: controller.signal })
      .then(response => {
        setData(response.data)
        setForm({
          order_status: response.data.order.order_status,
          payment_status: response.data.order.payment_status
        })
      })
      .catch(error => {
        if (!axios.isCancel(error)) setError(apiError(error))
      })

    return () => controller.abort()
  }, [endpoint])

  async function save(event) {
    event.preventDefault()

    if (form.order_status === 'Cancelled'
        && data.order.order_status !== 'Cancelled'
        && !window.confirm('Cancel this order and restore stock?')) {
      return
    }

    setBusy(true)
    setMessage('')
    setError('')

    try {
      await axios.put(endpoint, form)
      const response = await axios.get(endpoint)
      setData(response.data)
      setForm({
        order_status: response.data.order.order_status,
        payment_status: response.data.order.payment_status
      })
      setMessage('Order updated successfully.')
    } catch (error) {
      setError(apiError(error))
    } finally {
      setBusy(false)
    }
  }

  if (!data) return (
    <section className="management-page">
      <Link href="/manage/orders">← Back to All Orders</Link>
      <p>{error || 'Loading order...'}</p>
    </section>
  )

  const { order, items, statuses, paymentStatuses } = data
  const delivery = order.fulfilment_method === 'Delivery'

  return (
    <section className="cf-order-detail">
      <Link href="/manage/orders" className="cf-order-back">
        ← Back to All Orders
      </Link>

      <div className="cf-order-header">
        <div>
          <p className="cf-admin-eyebrow">CHOCOFIXCO BACKEND</p>
          <h1>Order #{order.order_id}</h1>
          <p>Review customer details and manage fulfilment.</p>
        </div>

        <div className="cf-order-header-status">
          <span className={'cf-order-status-badge ' +
            (order.order_status === 'Cancelled' ? 'cf-order-cancelled'
              : order.order_status === 'Completed' ? 'cf-order-completed'
              : 'cf-order-progress')}>
            {order.order_status}
          </span>
          <span className="cf-order-payment-badge">
            {order.payment_status}
          </span>
        </div>
      </div>

      <div className="cf-order-info-grid">
        <div className="cf-order-card">
          <h2>Customer Information</h2>
          <InfoRows rows={[
            ['Customer Name', order.full_name],
            ['Email Address', order.email],
            ['Phone Number', order.phone || 'Not provided']
          ]} />
        </div>

        <div className="cf-order-card">
          <h2>Order Summary</h2>
          <InfoRows rows={[
            ['Order Reference', '#' + order.order_id],
            [delivery ? 'Delivery Date' : 'Collection Date',
              order.collection_date_display || 'Not set'],
            ['Fulfilment', fulfilment(order.fulfilment_method)],
            ...(delivery ? [
              ['Delivery Address', order.delivery_address],
              ['Postal Code', order.postal_code]
            ] : []),
            ['Total Items', items.reduce(
              (total, item) => total + Number(item.quantity), 0
            )],
            ['Chocolate Subtotal', money(
              Number(order.total_amount) - Number(order.delivery_fee)
            )],
            ['Delivery Fee', money(order.delivery_fee)],
            ['Grand Total', money(order.total_amount)]
          ]} />
        </div>
      </div>

      <div className="cf-order-card cf-order-products">
        <h2>Purchased Chocolates</h2>

        <div className="cf-order-products-header">
          <span>Product</span><span>Quantity</span>
          <span>Unit Price</span><span>Subtotal</span>
        </div>

        {items.map(item => (
          <div className="cf-order-product-row"
            key={item.order_item_id}>
            <div><strong>{item.product_name}</strong></div>
            <span>{item.quantity}</span>
            <span>{money(item.unit_price)}</span>
            <strong>{money(
              Number(item.unit_price) * Number(item.quantity)
            )}</strong>
          </div>
        ))}

        <div className="cf-order-products-total">
          <span>Grand Total (including delivery)</span>
          <strong>{money(order.total_amount)}</strong>
        </div>
      </div>

      <div className="cf-order-card cf-order-update-card">
        <div className="cf-order-update-heading">
          <div>
            <h2>Update Order</h2>
            <p>Manage order progress and payment status.</p>
          </div>
        </div>

        {message && <div className="alert alert-success"
          role="status">{message}</div>}
        {error && <div className="alert alert-danger"
          role="alert">{error}</div>}

        {order.order_status === 'Cancelled' && (
          <div className="cf-order-notice">
            This order has been cancelled. Its stock has already
            been restored, and the order cannot be reopened.
          </div>
        )}

        <form className="cf-order-update-form" onSubmit={save}>
          <div className="cf-order-update-fields">
            <label>
              Order Status
              <select value={form.order_status}
                disabled={order.order_status === 'Cancelled' || busy}
                onChange={e => setForm(previous => ({
                  ...previous, order_status: e.target.value
                }))}>
                {statuses.filter(item =>
                  order.order_status !== 'Completed' || item !== 'Cancelled'
                ).map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label>
              Payment Status
              <select value={form.payment_status} disabled={busy}
                onChange={e => setForm(previous => ({
                  ...previous, payment_status: e.target.value
                }))}>
                {paymentStatuses.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          {form.order_status === 'Cancelled'
            && order.order_status !== 'Cancelled' && (
            <div className="cf-order-danger-notice">
              <strong>Cancellation Warning</strong>
              <p>Cancelling this order will restore purchased
                quantities to stock. This action cannot be reversed.</p>
            </div>
          )}

          <p className="cf-order-help-text">
            Completed orders cannot be cancelled automatically.
            Payment status changes do not process actual payments.
          </p>

          <div className="cf-order-save-actions">
            <Link href="/manage/orders" className="cf-reset-button">
              Back to Orders
            </Link>
            <button className="cf-primary-button" disabled={busy}>
              {busy ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
