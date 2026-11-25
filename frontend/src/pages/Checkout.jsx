import { useState, useEffect, useRef } from 'react'
import { useSetAtom, useAtomValue } from 'jotai'
import { useLocation, Link } from 'wouter'
import axios from 'axios'
import { confirmationAtom } from '../state/orders'
import { productsAtom } from '../state/products'
import { userAtom } from '../state/auth'
import { money, apiError, singaporeToday } from '../utils/orders'

// FF01: Reactive state and conditional rendering.
// FF02: Controlled forms, radio buttons and POST requests.
// FF03: Shared state across checkout and confirmation.
// FF04: Navigate after a successful API request.

export default function Checkout({ params }) {
  const id = params.id
  const user = useAtomValue(userAtom)
  const customer = user?.role === 'customer' ? user : null

  const [product, setProduct] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const setConfirmation = useSetAtom(confirmationAtom)
  const setProducts = useSetAtom(productsAtom)
  const [, navigate] = useLocation()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    quantity: '1',
    fulfilment_method: 'Collection',
    collection_date: '',
    delivery_address: '',
    postal_code: ''
  })

  useEffect(() => {
    const controller = new AbortController()

    axios.get('/api/order/' + id, {
      signal: controller.signal
    })
      .then(response => setProduct(response.data.product))
      .catch(error => {
        if (!axios.isCancel(error)) setError(apiError(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [id])

  // LEARNING NOTE: SHARED STATE AND DERIVED VALUES
  // Authenticated checkout uses the customer's account identity.
  // Guest checkout continues to use controlled form inputs.

  const customerId = customer?.customer_id

  useEffect(() => {
    if (!customerId) return

    const controller = new AbortController()

    axios.get('/api/customer/addresses', {
      signal: controller.signal
    }).then(response => {
      setAddresses(response.data)
    }).catch(() => {
      // Manual address entry remains available.
    })

    return () => controller.abort()
  }, [customerId])

  function chooseAddress(event) {
    const value = event.target.value
    setSelectedAddress(value)

    const address = addresses.find(
      item => String(item.address_id) === value
    )

    setForm(previous => ({
      ...previous,
      delivery_address: address?.delivery_address || '',
      postal_code: address?.postal_code || ''
    }))
  }

  const customerName = customer ? customer.full_name : form.full_name
  const customerEmail = customer ? customer.email : form.email
  const customerPhone = customer ? (customer.phone || '') : form.phone

  function change(event) {
    const { name, value } = event.target
    if (name === 'delivery_address' || name === 'postal_code') {
      setSelectedAddress('')
    }
    setForm(previous => ({ ...previous, [name]: value }))
  }

  const delivery = form.fulfilment_method === 'Delivery'

  // Derived state: React recalculates the estimate when inputs change.
  // The server independently validates the actual final amount.
  const total = product
    ? (Math.round(Number(product.price) * 100)
      * Number(form.quantity) + (delivery ? 1000 : 0)) / 100
    : 0

  async function submit(event) {
    event.preventDefault()
    if (submitting.current) return

    submitting.current = true
    setBusy(true)
    setError('')

    try {
      const response = await axios.post('/api/order/' + id, {
        ...form,
        full_name: customerName,
        email: customerEmail,
        phone: customerPhone
      })

      setConfirmation(response.data)

      setProducts(previous => previous.map(item =>
        Number(item.product_id) === Number(id)
          ? {
              ...item,
              stock_quantity: Number(item.stock_quantity)
                - Number(form.quantity)
            }
          : item
      ))

      navigate('/order/confirmation/' + response.data.order_id)
    } catch (error) {
      setError(apiError(error))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  if (loading) return <p className="management-page">Loading chocolate...</p>

  if (!product) return (
    <section className="management-page">
      <p role="alert">{error || 'Product not found.'}</p>
      <Link href="/">Return to shop</Link>
    </section>
  )

  return (
    <section className="order-checkout">
      <div className="checkout-heading">
        <p className="boutique-label">CHOCOFIXCO ORDERS</p>
        <h1>Make it a sweet moment.</h1>
        <p>Complete your details to arrange collection or home delivery.</p>
      </div>

      <div className="checkout-layout">
        <div className="checkout-product">
          <img src={product.image_path ||
            '/images/chocofixco-products/12_chocolate-box-assorted.jpg'}
            alt={product.name} />
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <strong>{money(product.price)}</strong>
          <p>Available stock: {product.stock_quantity}</p>
        </div>

        <form className="checkout-form" onSubmit={submit}>
          <h2>Your details</h2>

          {customer ? (
            <p>
              Ordering as {customer.full_name}.{' '}
              <Link href="/account">Edit profile</Link>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <Link href="/login">Sign in</Link>
              {' '}or continue as a guest.
            </p>
          )}


          {error && <div className="alert alert-danger"
            role="alert">{error}</div>}

          <label htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" maxLength={150}
            value={customerName} onChange={change} readOnly={Boolean(customer)} required />

          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" maxLength={255}
            value={customerEmail} onChange={change} readOnly={Boolean(customer)} required />

          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" maxLength={30}
            value={customerPhone} onChange={change} readOnly={Boolean(customer)} />

          <label htmlFor="quantity">Quantity</label>
          <input id="quantity" name="quantity" type="number"
            min="1" max={Math.min(10, Number(product.stock_quantity))}
            value={form.quantity} onChange={change} required />

          <label>Fulfilment method</label>

          <div className="fulfilment-options">
            <label>
              <input type="radio" name="fulfilment_method"
                value="Collection" checked={!delivery}
                onChange={change} />
              Self Collection — Free
            </label>

            <label>
              <input type="radio" name="fulfilment_method"
                value="Delivery" checked={delivery}
                onChange={change} />
              Home Delivery — S$10.00
            </label>
          </div>

          <label htmlFor="collection_date">
            {delivery ? 'Preferred delivery date' : 'Collection date'}
          </label>

          <input id="collection_date" name="collection_date"
            type="date" min={singaporeToday()}
            value={form.collection_date} onChange={change} required />

          {delivery && (
            <>
              {customer && addresses.length > 0 && (
                <>
                  <label htmlFor="saved_address">Saved delivery address</label>
                  <select id="saved_address" className="form-select"
                    value={selectedAddress} onChange={chooseAddress}>
                    <option value="">Enter address manually</option>
                    {addresses.map(address => (
                      <option key={address.address_id}
                        value={address.address_id}>
                        {address.label} — {address.postal_code}
                        {address.is_default ? ' (Default)' : ''}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label htmlFor="delivery_address">Delivery address</label>
              <input id="delivery_address" name="delivery_address"
                minLength={5} maxLength={255}
                value={form.delivery_address} onChange={change}
                autoComplete="street-address" required />

              <label htmlFor="postal_code">Singapore postal code</label>
              <input id="postal_code" name="postal_code"
                inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                value={form.postal_code} onChange={change} required />

              <p>Home delivery fee: S$10.00 per order</p>
            </>
          )}

          <div className="checkout-total">
            <span>Estimated total</span>
            <strong>{money(total)}</strong>
          </div>

          {Number(product.stock_quantity) > 0 ? (
            <button className="checkout-submit" type="submit"
              disabled={busy || user === undefined}>
              {busy ? 'Placing order...' : 'Place Order'}
            </button>
          ) : <p>This chocolate is currently sold out.</p>}

          <p className="checkout-note">
            Payment status will be recorded as Unpaid.
            No online payment is collected.
          </p>
        </form>
      </div>
    </section>
  )
}
