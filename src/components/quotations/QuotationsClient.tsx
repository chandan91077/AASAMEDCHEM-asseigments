'use client'

import { useState } from 'react'
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@/lib/units'

interface QuotationRow {
  id: string
  status: string
  notes?: string
  total_paise: number
  created_at: string
  updated_at: string
}

interface QuotationItemRow {
  id: string
  display_qty: number
  display_unit: string
  ordered_qty_base: number
  unit_price_paise: number
  line_total_paise: number
  products?: { name?: string; base_unit?: string }
}

export default function QuotationsClient({ quotations }: { quotations: QuotationRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [itemsCache, setItemsCache] = useState<Record<string, QuotationItemRow[]>>({})
  const [loadingItems, setLoadingItems] = useState<string | null>(null)

  async function toggleExpand(qid: string) {
    if (expanded === qid) { setExpanded(null); return }
    setExpanded(qid)
    if (itemsCache[qid]) return
    setLoadingItems(qid)
    const supabase = createClient()
    const { data } = await supabase.from('quotation_items').select('*, products(name, base_unit)').eq('quotation_id', qid)
    setItemsCache(c => ({ ...c, [qid]: data || [] }))
    setLoadingItems(null)
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e8edf8' }}>My Quotations</h1>
        <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>{quotations.length} quotation{quotations.length !== 1 ? 's' : ''} submitted</p>
      </div>

      {quotations.length === 0 && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: '#8899bb' }}>
          <ClipboardList size={56} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
          <h3 style={{ color: '#e8edf8', fontWeight: 700, marginBottom: '0.5rem' }}>No quotations yet</h3>
          <p style={{ fontSize: '0.9rem' }}>Go to the Product Catalog to browse chemicals and submit your first quotation.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {quotations.map(q => {
          const items = itemsCache[q.id]
          return (
            <div key={q.id} className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => toggleExpand(q.id)}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span className={`badge badge-${q.status}`}>{q.status}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#8899bb' }}>#{q.id.slice(0, 12)}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#8899bb' }}>
                    Submitted: {new Date(q.created_at).toLocaleString('en-IN')}
                    {q.updated_at !== q.created_at && ` · Updated: ${new Date(q.updated_at).toLocaleString('en-IN')}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>{formatINR(q.total_paise)}</div>
                  {expanded === q.id ? <ChevronUp size={18} color="#8899bb" /> : <ChevronDown size={18} color="#8899bb" />}
                </div>
              </div>

              {expanded === q.id && (
                <div style={{ borderTop: '1px solid rgba(30,45,77,0.5)', padding: '1.25rem 1.5rem' }}>
                  {q.notes && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(30,45,77,0.3)', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#8899bb' }}>📝 {q.notes}</div>}
                  {loadingItems === q.id && <div style={{ color: '#8899bb' }}>Loading items...</div>}
                  {items && (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty Ordered</th>
                          <th>Base Qty</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => {
                          const prod = item.products as { name?: string; base_unit?: string } | undefined
                          return (
                            <tr key={item.id}>
                              <td style={{ color: '#e8edf8', fontWeight: 500 }}>{prod?.name}</td>
                              <td style={{ color: '#38aaf6' }}>{Number(item.display_qty).toLocaleString('en-IN')} {item.display_unit}</td>
                              <td style={{ color: '#8899bb', fontSize: '0.8rem' }}>{Number(item.ordered_qty_base).toLocaleString('en-IN')} {prod?.base_unit}</td>
                              <td style={{ color: '#8899bb' }}>₹{(item.unit_price_paise / 100).toFixed(4)}/{prod?.base_unit}</td>
                              <td style={{ color: '#34d399', fontWeight: 700 }}>{formatINR(item.line_total_paise)}</td>
                            </tr>
                          )
                        })}
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, color: '#8899bb' }}>Total</td>
                          <td style={{ color: '#34d399', fontWeight: 800 }}>{formatINR(q.total_paise)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
