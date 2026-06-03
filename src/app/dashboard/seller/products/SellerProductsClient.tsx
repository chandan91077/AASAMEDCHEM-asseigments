'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, FlaskConical, X, Loader2, PackageCheck, ToggleLeft, ToggleRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { inrToPaise, paiseToInr, UNIT_LABELS } from '@/lib/units'

const CATEGORIES = ['Acids', 'Bases', 'Inorganic Salts', 'Organic Compounds', 'Solvents', 'Sugars', 'Oxidizers', 'Kits', 'Other']
const BASE_UNITS = [
  { value: 'g',    label: 'Weight — price per gram (g)' },
  { value: 'mL',   label: 'Volume — price per milliliter (mL)' },
  { value: 'unit', label: 'Count  — price per unit' },
]

interface Product {
  id: string
  name: string
  sku?: string
  description?: string
  category?: string
  base_unit: string
  base_price_paise: number
  stock_quantity: number
  is_active: boolean
  seller_id?: string
}

const EMPTY_FORM = {
  name: '',
  sku: '',
  description: '',
  category: 'Other',
  base_unit: 'g',
  price_inr: '',        // user enters price in INR; we convert to paise before saving
  stock: '',
}

export default function SellerProductsClient({ products: initial, sellerId }: { products: Product[], sellerId: string }) {
  const [products, setProducts] = useState<Product[]>(initial)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      name: p.name,
      sku: p.sku || '',
      description: p.description || '',
      category: p.category || 'Other',
      base_unit: p.base_unit,
      price_inr: paiseToInr(p.base_price_paise).toString(),
      stock: p.stock_quantity.toString(),
    })
    setShowModal(true)
  }

  function upd(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const priceInr = parseFloat(form.price_inr)
    const stock = parseFloat(form.stock)

    if (!form.name.trim()) { toast.error('Product name is required'); return }
    if (isNaN(priceInr) || priceInr < 0) { toast.error('Enter a valid price'); return }
    if (isNaN(stock) || stock < 0) { toast.error('Enter a valid stock quantity'); return }

    setSaving(true)
    const supabase = createClient()

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      description: form.description.trim() || null,
      category: form.category,
      base_unit: form.base_unit,
      base_price_paise: inrToPaise(priceInr),
      stock_quantity: stock,
      seller_id: sellerId,
      is_active: true,
    }

    if (editing) {
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single()

      if (error) { toast.error(error.message); setSaving(false); return }
      setProducts(ps => ps.map(p => p.id === editing.id ? data : p))
      toast.success('Product updated!')
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select()
        .single()

      if (error) { toast.error(error.message); setSaving(false); return }
      setProducts(ps => [data, ...ps])
      toast.success('Product added to catalog!')
    }

    setSaving(false)
    setShowModal(false)
  }

  async function toggleActive(product: Product) {
    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)

    if (error) { toast.error(error.message); return }
    setProducts(ps => ps.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p))
    toast.success(product.is_active ? 'Product hidden from catalog' : 'Product listed in catalog')
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    setDeleting(product.id)
    const supabase = createClient()
    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) { toast.error(error.message); setDeleting(null); return }
    setProducts(ps => ps.filter(p => p.id !== product.id))
    toast.success('Product deleted')
    setDeleting(null)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e8edf8' }}>My Products</h1>
          <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>{products.length} product{products.length !== 1 ? 's' : ''} listed</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={18} /> Add New Product
        </button>
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <div className="glass-card" style={{ padding: '5rem', textAlign: 'center' }}>
          <FlaskConical size={56} style={{ margin: '0 auto 1rem', display: 'block', color: '#8899bb', opacity: 0.4 }} />
          <h3 style={{ color: '#e8edf8', fontWeight: 700, marginBottom: '0.5rem' }}>No products yet</h3>
          <p style={{ color: '#8899bb', marginBottom: '1.5rem' }}>Add your first chemical product to appear in the buyer catalog.</p>
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add First Product</button>
        </div>
      )}

      {/* Products grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {products.map(product => (
          <div key={product.id} className="glass-card" style={{ padding: '1.5rem', opacity: product.is_active ? 1 : 0.6, transition: 'opacity 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '1rem' }}>
              <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, rgba(14,144,226,0.2), rgba(52,211,153,0.1))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FlaskConical size={22} color="#38aaf6" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e8edf8', lineHeight: 1.3 }}>{product.name}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {product.sku && <span style={{ fontSize: '0.75rem', color: '#8899bb', fontFamily: 'monospace' }}>{product.sku}</span>}
                  {product.category && <span style={{ fontSize: '0.7rem', padding: '1px 8px', background: 'rgba(30,45,77,0.6)', borderRadius: 4, color: '#8899bb' }}>{product.category}</span>}
                  <span className={`badge badge-${product.is_active ? 'approved' : 'rejected'}`} style={{ fontSize: '0.65rem' }}>
                    {product.is_active ? 'Listed' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>

            {product.description && (
              <p style={{ fontSize: '0.85rem', color: '#8899bb', marginBottom: '0.875rem', lineHeight: 1.5 }}>{product.description}</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(14,144,226,0.07)', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#8899bb', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Price</div>
                <div style={{ fontWeight: 700, color: '#38aaf6', fontSize: '0.95rem' }}>
                  ₹{paiseToInr(product.base_price_paise).toFixed(4)}/{product.base_unit}
                </div>
              </div>
              <div style={{ padding: '0.625rem 0.875rem', background: 'rgba(52,211,153,0.07)', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#8899bb', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Stock</div>
                <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.95rem' }}>
                  {Number(product.stock_quantity).toLocaleString('en-IN')} {product.base_unit}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem' }} onClick={() => openEdit(product)}>
                <Edit2 size={14} /> Edit
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem', color: product.is_active ? '#fbbf24' : '#34d399', borderColor: product.is_active ? '#fbbf2440' : '#34d39940' }}
                onClick={() => toggleActive(product)}
              >
                {product.is_active ? <><ToggleRight size={14} /> Hide</> : <><ToggleLeft size={14} /> List</>}
              </button>
              <button
                className="btn-danger"
                style={{ padding: '0.625rem 0.75rem' }}
                onClick={() => handleDelete(product)}
                disabled={deleting === product.id}
              >
                {deleting === product.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 560, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', background: 'linear-gradient(180deg, #0f1629, #0a0f1e)', border: '1px solid rgba(30,45,77,0.7)', borderRadius: '1rem' }}>
            <div style={{ padding: '1.75rem', borderBottom: '1px solid rgba(30,45,77,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#e8edf8' }}>
                {editing ? '✏️ Edit Product' : '➕ Add New Product'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#8899bb', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Name */}
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="input-field" placeholder="e.g. Sodium Chloride (NaCl)" value={form.name} onChange={e => upd('name', e.target.value)} required />
              </div>

              {/* SKU + Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">SKU (optional)</label>
                  <input className="input-field" placeholder="NaCl-001" value={form.sku} onChange={e => upd('sku', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="input-field" value={form.category} onChange={e => upd('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea className="input-field" placeholder="Purity, grade, intended use..." value={form.description} onChange={e => upd('description', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
              </div>

              {/* Base unit */}
              <div className="form-group">
                <label className="form-label">Storage / Pricing Unit</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {BASE_UNITS.map(u => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => upd('base_unit', u.value)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: `2px solid ${form.base_unit === u.value ? '#0e90e2' : 'rgba(30,45,77,0.5)'}`,
                        background: form.base_unit === u.value ? 'rgba(14,144,226,0.1)' : 'transparent',
                        color: form.base_unit === u.value ? '#38aaf6' : '#8899bb',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        fontWeight: form.base_unit === u.value ? 700 : 400,
                        transition: 'all 0.2s',
                      }}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price + Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Price per {form.base_unit} (₹)</label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.0500"
                    value={form.price_inr}
                    onChange={e => upd('price_inr', e.target.value)}
                    required
                  />
                  {form.price_inr && !isNaN(parseFloat(form.price_inr)) && (
                    <span style={{ fontSize: '0.75rem', color: '#8899bb', marginTop: '0.25rem' }}>
                      = {inrToPaise(parseFloat(form.price_inr))} paise stored in DB
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Stock ({form.base_unit})</label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.000001"
                    min="0"
                    placeholder="500000"
                    value={form.stock}
                    onChange={e => upd('stock', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={saving}>
                  {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><PackageCheck size={16} /> {editing ? 'Save Changes' : 'Add Product'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
