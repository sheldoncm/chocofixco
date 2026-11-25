import { useState } from 'react'

// FF02: Controlled form inputs and form submission.
// LO2: Process text, number, textarea, checkbox and file inputs.
// LO3: Receive data and callback functions through props.

export default function ProductForm({ product, onSave, onCancel, busy }) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product?.price ?? '',
    stock_quantity: product?.stock_quantity ?? 0,
    image_path: product?.image_path ?? '',
    is_active: product ? Boolean(Number(product.is_active)) : true
  })

  const [file, setFile] = useState(null)

  function handleChange(event) {
    const { name, value, checked, type } = event.target

    // Create a new state object instead of mutating existing state.
    setForm(previous => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    // FormData supports text fields and multipart image uploads.
    const data = new FormData()

    Object.entries(form).forEach(([key, value]) => {
      data.append(key, key === 'is_active' ? (value ? '1' : '0') : value)
    })

    if (file) data.append('product_image', file)

    onSave(data)
  }

  return (
    <form className="card p-4 mb-4" onSubmit={handleSubmit}>
      <h2>{product ? 'Edit Chocolate' : 'Add Chocolate'}</h2>

      <div className="mb-3">
        <label className="form-label" htmlFor="product-name">
          Product name
        </label>
        <input id="product-name" className="form-control"
          name="name" value={form.name} onChange={handleChange}
          required maxLength={150} />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="description">
          Description
        </label>
        <textarea id="description" className="form-control"
          name="description" value={form.description}
          onChange={handleChange} rows={3} />
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="price">
            Price (S$)
          </label>
          <input id="price" className="form-control"
            type="number" name="price" min="0"
            max="99999999.99" step="0.01"
            value={form.price} onChange={handleChange} required />
        </div>

        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="stock">
            Stock quantity
          </label>
          <input id="stock" className="form-control"
            type="number" name="stock_quantity" min="0" step="1"
            max="4294967295"
            value={form.stock_quantity}
            onChange={handleChange} required />
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="image-path">
          Existing image path
        </label>
        <input id="image-path" className="form-control"
          name="image_path" value={form.image_path}
          onChange={handleChange} maxLength={255}
          placeholder="/images/chocofixco-new/choc_bar.jpeg" />
      </div>

      {form.image_path && (
        <img src={form.image_path} alt="Current product"
          className="product-preview mb-3" />
      )}

      <div className="mb-3">
        <label className="form-label" htmlFor="product-image">
          Upload a new image
        </label>
        <input id="product-image" className="form-control"
          type="file" accept="image/jpeg,image/png,image/webp"
          onChange={event => setFile(event.target.files[0] || null)} />
        <small>JPG, PNG or WebP. Maximum 5 MB.</small>
      </div>

      <div className="form-check mb-3">
        <input id="active" className="form-check-input"
          type="checkbox" name="is_active"
          checked={form.is_active} onChange={handleChange} />
        <label className="form-check-label" htmlFor="active">
          Active on storefront
        </label>
      </div>

      <div className="d-flex gap-2">
        <button className="management-button" disabled={busy}>
          {busy ? 'Saving...' : 'Save Product'}
        </button>
        <button type="button" className="btn btn-outline-secondary"
          onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  )
}
