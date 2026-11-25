import { Link } from 'wouter'

// FF01: Props, JSX expressions and conditional rendering.
// LO3: Demonstrate a component accepting props.
//
// Props pass information from a parent component to a child.
// Props are read-only and should not be directly modified.

export default function ProductCard({ product }) {
  const available = Number(product.stock_quantity) > 0

  return (
    <article className="boutique-product-card">
      <div className="boutique-product-image-wrap">
        <img
          src={product.image_path ||
            '/images/chocofixco-products/12_chocolate-box-assorted.jpg'}
          alt={product.name}
          loading="lazy"
        />
      </div>

      <div className="boutique-product-info">
        <div className="boutique-product-title-row">
          <h3>{product.name}</h3>
          <strong>S${Number(product.price).toFixed(2)}</strong>
        </div>

        <p>
          {product.description ||
            'A chocolate treat to enjoy and share.'}
        </p>

        <div className="boutique-product-meta">
          {available ? (
            <span className="boutique-available">
              <span className="stock-dot"></span>
              Available
            </span>
          ) : (
            <span className="boutique-unavailable">
              Sold out
            </span>
          )}

          {available && (
            <Link
              className="boutique-order-button"
              href={`/order/${product.product_id}`}
            >
              Order Now <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
