'use client'

import { useState, useMemo } from 'react'
import { Search, ShoppingCart, Plus, Minus, Trash2, Send, X, FlaskConical, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Product, CartItem } from '@/lib/types'
import {
  COMPATIBLE_UNITS, UNIT_SHORT, toBaseUnit, calculateLineTotalPaise, formatINR, inrToPaise,
  type DisplayUnit, type BaseUnit,
} from '@/lib/units'

function getAvatarColor(key: string) {
  // deterministic pastel palette from id/name
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash << 5) - hash + key.charCodeAt(i)
  const hue = Math.abs(hash) % 360
  return `linear-gradient(135deg, hsl(${hue}, 60%, 45%), hsl(${(hue + 40) % 360}, 60%, 45%))`
}

const CATEGORIES = ['All', 'Acids', 'Bases', 'Inorganic Salts', 'Organic Compounds', 'Solvents', 'Sugars', 'Oxidizers', 'Kits', 'Other']

interface Props {
  products: Product[]
  userId: string
  userRole: string
}

export default function CatalogClient({ products, userId, userRole }: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedQty, setSelectedQty] = useState<Record<string, { qty: string; unit: string }>>({})

  const filtered = useMemo(() => products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || p.category === category
    return matchSearch && matchCat
  }), [products, search, category])

  function getProductQty(productId: string, baseUnit: BaseUnit) {
    return selectedQty[productId] || { qty: '1', unit: COMPATIBLE_UNITS[baseUnit][0] }
  }

  function updateProductQty(productId: string, baseUnit: BaseUnit, field: 'qty' | 'unit', value: string) {
    setSelectedQty(s => ({
      ...s,
      [productId]: { ...getProductQty(productId, baseUnit), [field]: value }
    }))
  }

  function getPricePreview(product: Product): string {
    const qtyState = getProductQty(product.id, product.base_unit as BaseUnit)
    const qty = parseFloat(qtyState.qty) || 0
    if (qty <= 0) return '₹0.00'
    const baseQty = toBaseUnit(qty, qtyState.unit as DisplayUnit)
    const total = calculateLineTotalPaise(product.base_price_paise, baseQty)
    return formatINR(total)
  }

  function addToCart(product: Product) {
    const qtyState = getProductQty(product.id, product.base_unit as BaseUnit)
    const qty = parseFloat(qtyState.qty) || 0
    if (qty <= 0) { toast.error('Enter a quantity first'); return }
    const baseQty = toBaseUnit(qty, qtyState.unit as DisplayUnit)
    const lineTotal = calculateLineTotalPaise(product.base_price_paise, baseQty)

    const item: CartItem = {
      product,
      displayUnit: qtyState.unit,
      displayQty: qty,
      orderedQtyBase: baseQty,
      lineTotalPaise: lineTotal,
    }

    setCart(c => {
      const existing = c.findIndex(ci => ci.product.id === product.id)
      if (existing >= 0) {
        const updated = [...c]
        updated[existing] = item
        toast.success('Quantity updated in cart')
        return updated
      }
      toast.success(`Added ${product.name} to cart`)
      return [...c, item]
    })
  }

  function removeFromCart(productId: string) {
    setCart(c => c.filter(ci => ci.product.id !== productId))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotalPaise, 0)

  async function submitQuotation() {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    setSubmitting(true)
    const supabase = createClient()

    try {
      // Create quotation
      const { data: quotation, error: qError } = await supabase
        .from('quotations')
        .insert({ user_id: userId, notes: notes || null, total_paise: cartTotal, status: 'pending' })
        .select()
        .single()

      if (qError) throw qError

      // Insert quotation items
      const items = cart.map(item => ({
        quotation_id: quotation.id,
        product_id: item.product.id,
        ordered_qty_base: item.orderedQtyBase,
        display_unit: item.displayUnit,
        display_qty: item.displayQty,
        unit_price_paise: item.product.base_price_paise,
        line_total_paise: item.lineTotalPaise,
      }))

      const { error: iError } = await supabase.from('quotation_items').insert(items)
      if (iError) throw iError

      toast.success('Quotation submitted successfully! 🎉')
      setCart([])
      setNotes('')
      setShowCart(false)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit quotation'
      toast.error(errorMessage)
    }
    setSubmitting(false)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e8edf8' }}>Product Catalog</h1>
          <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>{filtered.length} of {products.length} products shown</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowCart(true)}
          style={{ position: 'relative' }}
        >
          <ShoppingCart size={18} />
          Quotation Cart
          {cart.length > 0 && (
            <span style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, background: '#f87171', borderRadius: '50%', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 420 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#8899bb' }} />
          <input className="input-field" placeholder="Search chemicals, SKU, description..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', border: `1px solid ${category === c ? '#0e90e2' : 'rgba(30,45,77,0.6)'}`, background: category === c ? 'rgba(14,144,226,0.1)' : 'transparent', color: category === c ? '#38aaf6' : '#8899bb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filtered.map(product => {
          const baseUnit = product.base_unit as BaseUnit
          const compatUnits = COMPATIBLE_UNITS[baseUnit]
          const qtyState = getProductQty(product.id, baseUnit)
          const inCart = cart.some(c => c.product.id === product.id)

          return (
            <div key={product.id} className="glass-card" style={{ padding: '1.5rem', transition: 'transform 0.2s, border-color 0.2s', border: inCart ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(30,45,77,0.6)' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>

              {/* Product header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.875rem' }}>
                <div className="product-avatar" style={{ background: getAvatarColor(product.id) }}>
                  {product.name ? product.name.trim().charAt(0).toUpperCase() : <FlaskConical size={18} color="#e8edf8" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e8edf8', lineHeight: 1.3, marginBottom: '0.2rem' }}>{product.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {product.sku && <span style={{ fontSize: '0.7rem', color: '#8899bb', fontFamily: 'monospace' }}>{product.sku}</span>}
                    {product.category && <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'rgba(30,45,77,0.6)', borderRadius: 4, color: '#8899bb' }}>{product.category}</span>}
                  </div>
                </div>
                {inCart && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', flexShrink: 0, marginTop: 4 }} />}
              </div>

              {product.description && (
                <p style={{ fontSize: '0.8rem', color: '#8899bb', marginBottom: '0.875rem', lineHeight: 1.5 }}>
                  {product.description}
                </p>
              )}

              {/* Pricing info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.875rem', padding: '0.625rem 0.875rem', background: 'rgba(14,144,226,0.05)', borderRadius: '0.5rem', border: '1px solid rgba(14,144,226,0.1)' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#8899bb', fontWeight: 600, textTransform: 'uppercase' }}>Base Price</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38aaf6' }}>{formatINR(product.base_price_paise)}<span style={{ fontSize: '0.75rem', color: '#8899bb' }}>/{product.base_unit}</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#8899bb', fontWeight: 600, textTransform: 'uppercase' }}>Stock</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e8edf8' }}>{Number(product.stock_quantity).toLocaleString('en-IN')} {product.base_unit}</div>
                </div>
              </div>

              {/* Qty + unit selector */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'var(--input)', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  <button onClick={() => { const q = Math.max(0.001, (parseFloat(qtyState.qty) || 1) - 1); updateProductQty(product.id, baseUnit, 'qty', String(q)) }} style={{ padding: '0.5rem 0.75rem', background: 'none', border: 'none', color: '#8899bb', cursor: 'pointer', fontSize: '1rem' }}>
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={qtyState.qty}
                    onChange={e => updateProductQty(product.id, baseUnit, 'qty', e.target.value)}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', textAlign: 'center', color: '#e8edf8', fontFamily: 'inherit', fontSize: '0.9rem', width: 0 }}
                  />
                  <button onClick={() => updateProductQty(product.id, baseUnit, 'qty', String((parseFloat(qtyState.qty) || 0) + 1))} style={{ padding: '0.5rem 0.75rem', background: 'none', border: 'none', color: '#8899bb', cursor: 'pointer' }}>
                    <Plus size={14} />
                  </button>
                </div>
                <select
                  className="input-field"
                  value={qtyState.unit}
                  onChange={e => updateProductQty(product.id, baseUnit, 'unit', e.target.value)}
                  style={{ width: 80, padding: '0.5rem', flexShrink: 0 }}
                >
                  {compatUnits.map(u => <option key={u} value={u}>{UNIT_SHORT[u]}</option>)}
                </select>
              </div>

              {/* Price preview */}
              <div style={{ fontSize: '0.8rem', color: '#8899bb', marginBottom: '0.875rem' }}>
                Est.: <span style={{ color: '#34d399', fontWeight: 700 }}>{getPricePreview(product)}</span>
              </div>

              <button
                className={inCart ? 'btn-success' : 'btn-cta-human'}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => addToCart(product)}
              >
                {inCart ? <><ShoppingCart size={16} /> Update in Cart</> : <><Plus size={16} /> Add to Cart</>}
              </button>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#8899bb' }}>
            <FlaskConical size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
            No products found matching your search
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowCart(false)} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 480, maxWidth: '100vw', background: 'linear-gradient(180deg, #0f1629, #0a0f1e)', borderLeft: '1px solid rgba(30,45,77,0.6)', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(30,45,77,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e8edf8' }}>Quotation Cart</h2>
                <p style={{ fontSize: '0.8rem', color: '#8899bb' }}>{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', color: '#8899bb', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
              {cart.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8899bb' }}>
                  <ShoppingCart size={40} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
                  Your cart is empty. Add products from the catalog.
                </div>
              )}
              {cart.map(item => (
                <div key={item.product.id} style={{ padding: '1rem', marginBottom: '0.75rem', background: 'rgba(15,22,41,0.6)', border: '1px solid rgba(30,45,77,0.5)', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#e8edf8', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{item.product.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#8899bb' }}>
                        {item.displayQty} {item.displayUnit} → {Number(item.orderedQtyBase).toLocaleString('en-IN')} {item.product.base_unit} (base)
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', marginLeft: '0.5rem' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8899bb' }}>{formatINR(item.product.base_price_paise)}/{item.product.base_unit}</span>
                    <span style={{ fontWeight: 700, color: '#34d399' }}>{formatINR(item.lineTotalPaise)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(30,45,77,0.5)' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Notes (optional)</label>
                  <textarea
                    className="input-field"
                    placeholder="Add delivery instructions or special requirements..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    style={{ resize: 'none', marginTop: '0.375rem' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 700, color: '#8899bb' }}>Total</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>{formatINR(cartTotal)}</span>
                </div>
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '0.95rem' }} onClick={submitQuotation} disabled={submitting}>
                  {submitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><Send size={18} /> Submit Quotation</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
