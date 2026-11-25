import { Link } from 'wouter'

// LEARNING NOTE: Reusable dashboard cards and props.
// Management links are rendered from an array of objects.

function ManagementCard(props) {
  return (
    <article className="admin-management-card">
      <div className="admin-card-icon">
        <svg width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          {props.icon === 'products' ? (
            <>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </>
          ) : props.icon === 'users' ? (
            <>
              <circle cx="9" cy="7" r="3" />
              <path d="M3 21v-3a6 6 0 0 1 12 0v3" />
              <path d="M16 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v3" />
            </>
          ) : (
            <>
              <path d="m12 3 9 5-9 5-9-5 9-5Z" />
              <path d="M3 8v9l9 5 9-5V8M12 13v9" />
              <path d="m7.5 5.5 9 5" />
            </>
          )}
        </svg>
      </div>

      <h2>{props.title}</h2>
      <p>{props.description}</p>

      <Link href={props.href} className="admin-card-link">
        {props.button}
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}

const managementSections = [
  {
    icon: 'products',
    title: 'Product Management',
    description: 'Manage your chocolate collection, product images, pricing and inventory.',
    href: '/manage/products',
    button: 'Manage Products'
  },
  {
    icon: 'orders',
    title: 'Order Management',
    description: 'Review customer orders, payment status, collection and delivery arrangements.',
    href: '/manage/orders',
    button: 'Manage Orders'
  },
  {
    icon: 'users',
    title: 'User Management',
    description: 'Manage customer accounts, administrators and account access.',
    href: '/manage/users',
    button: 'Manage Users'
  }
]

export default function Backend() {
  return (
    <section className="admin-workspace">
      <div className="admin-workspace-inner">
        <div className="admin-workspace-heading">
          <p className="boutique-label">CHOCOFIXCO · ADMINISTRATION</p>
          <h1>Business Management</h1>
          <p>Manage your chocolate business in one place.</p>
          <Link href="/admin/account" className="cf-user-action">
            My Admin Account
          </Link>
        </div>

        <div className="admin-management-grid">
          {managementSections.map(section => (
            <ManagementCard
              key={section.icon}
              icon={section.icon}
              title={section.title}
              description={section.description}
              href={section.href}
              button={section.button}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
