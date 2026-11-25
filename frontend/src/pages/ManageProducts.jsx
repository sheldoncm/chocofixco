import { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { Link } from 'wouter'
import axios from 'axios'
import { productsAtom } from '../state/products'
import ProductForm from '../components/ProductForm'

// FF02: CRUD and immutable array operations.
// FF03: Shared application state using Jotai.
// FF04: REST API requests using Axios.
// LO4: Create, update and delete elements from an array in state.

const endpoint = '/api/manage/products'

function errorMessage(error) {
  const data = error.response?.data
  return typeof data === 'string' && !data.trim().startsWith('<')
    ? data
    : data?.error || 'Unable to complete the operation.'
}

export default function ManageProducts() {
  const [products, setProducts] = useAtom(productsAtom)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editor, setEditor] = useState(null)
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('')
  const [stock, setStock] = useState('')
  const [sort, setSort] = useState('newest')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // READ: Fetch all products, including inactive products.
  useEffect(() => {
    const controller = new AbortController()

    axios.get(endpoint, { signal: controller.signal })
      .then(response => setProducts(response.data.products))
      .catch(error => {
        if (!axios.isCancel(error)) setError(errorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [setProducts])

  async function saveProduct(data) {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      const editing = editor.mode === 'edit'

      // CREATE uses POST; UPDATE uses PUT.
      if (editing) {
        await axios.put(
          endpoint + '/' + editor.product.product_id, data
        )
      } else {
        await axios.post(endpoint, data)
      }

      // Read persisted records to obtain database-generated IDs
      // and the actual stored image path.
      const response = await axios.get(endpoint)
      const records = response.data.products

      if (editing) {
        const updated = records.find(
          item => item.product_id === editor.product.product_id
        )

        // UPDATE: map returns a new array.
        if (updated) {
          setProducts(previous => previous.map(item =>
            item.product_id === updated.product_id ? updated : item
          ))
        } else {
          setProducts(records)
        }
      } else {
        // CREATE: spread syntax creates a new array.
        setProducts(previous => [
          ...previous,
          ...records.filter(record =>
            !previous.some(item =>
              item.product_id === record.product_id
            )
          )
        ])
      }

      setEditor(null)
      setMessage(editing ? 'Product updated.' : 'Product created.')
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm('Delete ' + product.name + '?')) return

    setBusy(true)
    setError('')
    setMessage('')

    try {
      await axios.delete(endpoint + '/' + product.product_id)

      // DELETE: filter removes an item without mutating state.
      setProducts(previous => previous.filter(
        item => item.product_id !== product.product_id
      ))

      setMessage('Product deleted.')
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  // Derived data: filtering does not modify the original array.
  const filtered = products.filter(product => {
    const active = Boolean(Number(product.is_active))
    const quantity = Number(product.stock_quantity)
    const price = Number(product.price)

    return product.name.toLowerCase().includes(search.toLowerCase())
      && (!availability || active === (availability === 'active'))
      && (stock !== 'low' || (quantity > 0 && quantity <= 10))
      && (stock !== 'out' || quantity === 0)
      && (stock !== 'available' || quantity > 0)
      && (minPrice === '' || price >= Number(minPrice))
      && (maxPrice === '' || price <= Number(maxPrice))
  })

  filtered.sort((a, b) => {
    switch (sort) {
      case 'oldest': return a.product_id - b.product_id
      case 'name_asc': return a.name.localeCompare(b.name)
      case 'name_desc': return b.name.localeCompare(a.name)
      case 'price_asc': return Number(a.price) - Number(b.price)
      case 'price_desc': return Number(b.price) - Number(a.price)
      case 'stock_asc': return a.stock_quantity - b.stock_quantity
      case 'stock_desc': return b.stock_quantity - a.stock_quantity
      default: return b.product_id - a.product_id
    }
  })

  const summary = [
    ['Total products', products.length],
    ['Active', products.filter(p => Number(p.is_active) === 1).length],
    ['Inactive', products.filter(p => Number(p.is_active) === 0).length],
    ['Low stock', products.filter(p =>
      p.stock_quantity > 0 && p.stock_quantity <= 10).length]
  ]

  return (
    <section className="management-page react-management">
      <Link href="/backend">← Business Management</Link>

      <div className="section-heading">
        <p className="eyebrow">CHOCOFIXCO BACKEND</p>
        <h1>Manage Chocolates</h1>
        <p>Manage your products, prices and stock.</p>
      </div>

      <div className="row g-3 mb-4">
        {summary.map(([label, value]) => (
          <div className="col-6 col-md-3" key={label}>
            <div className="card p-3">
              <small>{label}</small>
              <h2 className="mb-0">{value}</h2>
            </div>
          </div>
        ))}
      </div>

      {message && <div className="alert alert-success"
        role="status">{message}</div>}

      {error && <div className="alert alert-danger"
        role="alert">{error}</div>}

      {!editor && (
        <button className="management-button mb-4"
          disabled={busy || loading}
          onClick={() => {
            setError('')
            setMessage('')
            setEditor({ mode: 'create' })
          }}>
          + Add Chocolate
        </button>
      )}

      {editor && (
        <ProductForm
          key={editor.product?.product_id ?? 'new'}
          product={editor.product}
          onSave={saveProduct}
          onCancel={() => setEditor(null)}
          busy={busy}
        />
      )}

      <div className="card p-3 mb-4">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Search</label>
            <input className="form-control"
              placeholder="Chocolate name"
              value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="col-md-4">
            <label className="form-label">Availability</label>
            <select className="form-select" value={availability}
              onChange={e => setAvailability(e.target.value)}>
              <option value="">All products</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label">Stock</label>
            <select className="form-select" value={stock}
              onChange={e => setStock(e.target.value)}>
              <option value="">All stock levels</option>
              <option value="available">Available</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>

          <div className="col-md-4">
            <label className="form-label">Minimum price</label>
            <input className="form-control" type="number" min="0"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)} />
          </div>

          <div className="col-md-4">
            <label className="form-label">Maximum price</label>
            <input className="form-control" type="number" min="0"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)} />
          </div>

          <div className="col-md-4">
            <label className="form-label">Sort by</label>
            <select className="form-select" value={sort}
              onChange={e => setSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
              <option value="price_asc">Lowest price</option>
              <option value="price_desc">Highest price</option>
              <option value="stock_asc">Lowest stock</option>
              <option value="stock_desc">Highest stock</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? <p>Loading products...</p> : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => (
                <tr key={product.product_id}>
                  <td>
                    <img className="product-thumbnail"
                      src={product.image_path ||
                        '/images/chocofixco-products/12_chocolate-box-assorted.jpg'}
                      alt={product.name} />
                  </td>
                  <td>{product.name}</td>
                  <td>S${Number(product.price).toFixed(2)}</td>
                  <td>{product.stock_quantity}</td>
                  <td>{Number(product.is_active)
                    ? 'Active' : 'Inactive'}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-dark"
                        disabled={busy || Boolean(editor)}
                        onClick={() => setEditor({
                          mode: 'edit', product
                        })}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger"
                        disabled={busy || Boolean(editor)}
                        onClick={() => deleteProduct(product)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p>No matching products.</p>}
        </div>
      )}
    </section>
  )
}
