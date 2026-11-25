import { Link } from 'wouter'

// FF04: Client-side navigation in a single page application.
export default function Backend() {
  return (
<section className="management-page backend-dashboard">
    <div className="section-heading">
        <p className="eyebrow">CHOCOFIXCO BACKEND</p>
        <h1>Business Management</h1>
        <p>Manage your chocolate products and customer orders.</p>
    </div>

    <div className="backend-grid">
        <article className="backend-card">
            <div className="backend-card-icon">🍫</div>
            <h2>Product Management</h2>
            <p>Add chocolates, update prices, manage stock and maintain your product catalogue.</p>
            <Link className="management-button" href="/manage/products">
                Manage Products
            </Link>
        </article>

        <article className="backend-card">
            <div className="backend-card-icon">📦</div>
            <h2>Order Management</h2>
            <p>View customer orders, update order statuses and manage fulfilment.</p>
            <Link className="management-button" href="/manage/orders">
                Manage Orders
            </Link>
        </article>
    </div>
</section>
  )
}
