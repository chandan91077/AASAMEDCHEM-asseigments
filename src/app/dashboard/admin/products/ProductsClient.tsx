'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Loader2, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Product } from '@/lib/types'
import { UNIT_SHORT, inrToPaise, paiseToInr, COMPATIBLE_UNITS, formatINR, type BaseUnit } from '@/lib/units'

const CATEGORIES = ['Acids', 'Bases', 'Inorganic Salts', 'Organic Compounds', 'Solvents', 'Sugars', 'Oxidizers', 'Kits', 'Other']
const BASE_UNITS: BaseUnit[] = ['g', 'mL', 'unit']

const EMPTY_FORM = { name: '', description: '', sku: '', category: '', base_unit: 'g' as BaseUnit, price_inr: '', stock: '' }

export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  function openCreate() { setEditProduct(null); setForm(EMPTY_FORM); setShowModal(true) }
  function openEdit(p: Product) {
    setEditProduct(p)
    setForm({ name: p.name, description: p.description || '', sku: p.sku || '', category: p.category || '', base_unit: p.base_unit as BaseUnit, price_inr: String(paiseToInr(p.base_price_paise)), stock: String(p.stock_quantity) })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const payload = {
      name: form.name,
      description: form.description,
      sku: form.sku || null,
      category: form.category,
      base_unit: form.base_unit,
      base_price_paise: inrToPaise(parseFloat(form.price_inr)),
      stock_quantity: parseFloat(form.stock),
    }

    if (editProduct) {
      const { data, error } = await supabase.from('products').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editProduct.id).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setProducts(ps => ps.map(p => p.id === editProduct.id ? data : p))
      toast.success('Product updated!')
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setProducts(ps => [data, ...ps])
      toast.success('Product created!')
    }
    setShowModal(false); setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return
    const supabase = createClient()
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setProducts(ps => ps.filter(p => p.id !== id))
    toast.success('Product deleted')
  }

  async function toggleActive(p: Product) {
    const supabase = createClient()
    const { data, error } = await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id).select().single()
    if (error) { toast.error(error.message); return }
    setProducts(ps => ps.map(x => x.id === p.id ? data : x))
  }

  async function assignToSeller(p: Product) {
    const email = window.prompt('Enter seller email to assign this product to:')
    if (!email) return
    const supabase = createClient()
    const { data: profile, error: pe } = await supabase.from('profiles').select('id,email,role').eq('email', email).limit(1).maybeSingle()
    if (pe) { toast.error(pe.message); return }
    if (!profile || profile.role !== 'seller') { toast.error('Seller not found with that email'); return }

    const { data, error } = await supabase.from('products').update({ seller_id: profile.id }).eq('id', p.id).select().single()
    if (error) { toast.error(error.message); return }
    setProducts(ps => ps.map(x => x.id === p.id ? data : x))
    toast.success(`Assigned to seller ${profile.email}`)
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e8edf8' }}>Products</h1>
          <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>{products.length} products in catalog</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input className="input-field" placeholder="Search by name, SKU, or category..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400 }} />
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Base Unit</th>
              <th>Price / Base Unit</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 600, color: '#e8edf8' }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: '0.75rem', color: '#8899bb', marginTop: 2 }}>{p.description.slice(0, 60)}{p.description.length > 60 ? '...' : ''}</div>}
                </td>
                <td style={{ color: '#8899bb', fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.sku || '—'}</td>
                <td style={{ color: '#8899bb' }}>{p.category || '—'}</td>
                <td><span style={{ padding: '2px 8px', background: 'rgba(14,144,226,0.1)', borderRadius: 4, color: '#38aaf6', fontSize: '0.8rem', fontWeight: 600 }}>{p.base_unit}</span></td>
                <td style={{ color: '#34d399', fontWeight: 600 }}>{formatINR(p.base_price_paise)}/{p.base_unit}</td>
                <td style={{ color: '#e8edf8' }}>{Number(p.stock_quantity).toLocaleString('en-IN')} {p.base_unit}</td>
                <td>
                  <button onClick={() => toggleActive(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.is_active ? '#34d399' : '#8899bb' }}>
                    {p.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem' }} onClick={() => openEdit(p)}>
                      <Pencil size={14} />
                    </button>
                      <button className="btn-secondary" style={{ padding: '0.4rem 0.6rem' }} onClick={() => assignToSeller(p)}>
                        Assign
                      </button>
                    <button className="btn-danger" style={{ padding: '0.4rem 0.6rem' }} onClick={() => handleDelete(p.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#8899bb' }}>
                <Package size={40} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
                No products found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#e8edf8' }}>{editProduct ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#8899bb', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="input-field" placeholder="e.g. Sodium Chloride (NaCl)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input className="input-field" placeholder="NaCl-001" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="input-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="input-field" placeholder="Product description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Base Unit *</label>
                  <select className="input-field" value={form.base_unit} onChange={e => setForm(f => ({ ...f, base_unit: e.target.value as BaseUnit }))} required>
                    <option value="g">Grams (g) — Weight</option>
                    <option value="mL">Milliliters (mL) — Volume</option>
                    <option value="unit">Unit/Count — Items</option>
                  </select>
                  <span style={{ fontSize: '0.7rem', color: '#8899bb' }}>
                    Compatible display units: {COMPATIBLE_UNITS[form.base_unit].map(u => UNIT_SHORT[u]).join(', ')}
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹ per {form.base_unit}) *</label>
                  <input className="input-field" type="number" step="0.0001" min="0" placeholder="0.0500" value={form.price_inr} onChange={e => setForm(f => ({ ...f, price_inr: e.target.value }))} required />
                  <span style={{ fontSize: '0.7rem', color: '#8899bb' }}>Stored in paise for precision</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Stock Quantity (in {form.base_unit}) *</label>
                <input className="input-field" type="number" step="0.000001" min="0" placeholder="500000" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : editProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
