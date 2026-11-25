import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAtom } from 'jotai'
import { productsAtom } from '../state/products'
import ProductCard from './ProductCard'

// FF01: State, hooks and list rendering.
// FF02: Read operation in CRUD.
// FF04: REST API integration.
//
// LO2: Demonstrate useState and useEffect.
// LO3: Pass product data to a reusable child component.
//
// useEffect retrieves external data after rendering.
// An empty dependency array runs the effect on mounting.
// The state setter triggers a new render when data arrives.

export default function Collection() {
  const [products, setProducts] = useAtom(productsAtom)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    axios.get('/api/products', {
      signal: controller.signal
    })
      .then(response => {
        setProducts(response.data.map(product => ({
          ...product, is_active: 1
        })))
      })
      .catch(err => {
        if (!axios.isCancel(err)) {
          setError('Unable to load the chocolate collection.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    // Cleanup prevents obsolete requests from updating state.
    return () => controller.abort()
  }, [setProducts])

  return (
    <section id="collection" className="boutique-collection">
      <div className="boutique-section-top">
        <div>
          <p className="boutique-label">
            DISCOVER YOUR FAVOURITES
          </p>
          <h2>Our chocolate <em>collection.</em></h2>
        </div>

        <p>
          From little treats to thoughtful gifts,
          find something sweet for every occasion.
        </p>
      </div>

      <div className="boutique-product-grid">
        {loading && <p role="status">Loading chocolates...</p>}

        {error && <p role="alert">{error}</p>}

        {!loading && !error && products.length === 0 && (
          <p className="boutique-empty">
            Our chocolate collection is being prepared.
          </p>
        )}

        {/* map() converts each database record into a component.
            A stable key helps React identify individual items. */}
        {products.filter(p => Number(p.is_active) === 1).map(product => (
          <ProductCard
            key={product.product_id}
            product={product}
          />
        ))}
      </div>
    </section>
  )
}
