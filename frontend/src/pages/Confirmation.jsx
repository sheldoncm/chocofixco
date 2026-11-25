import { useAtomValue } from 'jotai'
import { Link } from 'wouter'
import { confirmationAtom } from '../state/orders'
import { money, fulfilment } from '../utils/orders'

// FF03: Read shared state from another component.
// LO4: Checkout and confirmation share the submitted order.

export default function Confirmation({ params }) {
  const order = useAtomValue(confirmationAtom)

  if (!order || String(order.order_id) !== params.id) {
    return (
      <section className="order-confirmation">
        <h1>Order confirmation</h1>
        <p>The confirmation is no longer available in this session.</p>
        <Link className="boutique-button" href="/">Back to Shop</Link>
      </section>
    )
  }

  const delivery = order.fulfilment_method === 'Delivery'

  const details = [
    ['Order reference', '#' + order.order_id],
    ['Chocolate', order.product_name],
    ['Quantity', order.quantity],
    ['Fulfilment', fulfilment(order.fulfilment_method)],
    ['Chocolate subtotal', money(
      Number(order.total_amount) - Number(order.delivery_fee)
    )],
    ['Delivery fee', money(order.delivery_fee)],
    ['Grand total', money(order.total_amount)],
    [delivery ? 'Delivery date' : 'Collection date', order.collection_date],
    ...(delivery ? [
      ['Delivery address', order.delivery_address],
      ['Postal code', order.postal_code]
    ] : []),
    ['Order status', order.order_status],
    ['Payment status', order.payment_status]
  ]

  return (
    <section className="order-confirmation">
      <p className="boutique-label">ORDER RECEIVED</p>
      <h1>Thank you for your order!</h1>
      <p>Your chocolate {delivery ? 'delivery' : 'collection'}
        {' '}order has been recorded.</p>

      <div className="confirmation-details">
        {details.map(([label, value]) => (
          <p key={label}><strong>{label}:</strong> {value}</p>
        ))}
      </div>

      <Link href="/" className="boutique-button">
        Back to Chocolate Shop
      </Link>
    </section>
  )
}
