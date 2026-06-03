'use client'

import { useState } from 'react'
import { ClipboardList, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatINR } from '@/lib/units'

interface QuotationRow {
  id: string
  user_id: string
  status: string
  notes?: string
  total_paise: number
  created_at: string
  profiles?: { full_name?: string; email?: string; role?: string; company_name?: string }
  items?: QuotationItemRow[]
}

interface QuotationItemRow {
  id: string
  product_id: string
  ordered_qty_base: number
  display_unit: string
  display_qty: number
  unit_price_paise: number
  line_total_paise: number
  products?: { name?: string; base_unit?: string }
}

const STATUSES = ['pending', 'approved', 'rejected', 'fulfilled']

export default function AdminQuotationsClient({ initialQuotations }: { initialQuotations: QuotationRow[] }) {
  const [quotations, setQuotations] = useState<QuotationRow[]>(initialQuotations)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [itemsCache, setItemsCache] = useState<Record<string, QuotationItemRow[]>>({})
  const [loadingItems, setLoadingItems] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function toggleExpand(qid: string) {
    if (expanded === qid) { setExpanded(null); return }
    setExpanded(qid)
    if (itemsCache[qid]) return
    setLoadingItems(qid)
    const supabase = createClient()
    const { data } = await supabase
      .from('quotation_items')
      .select('*, products(name, base_unit)')
      .eq('quotation_id', qid)
    setItemsCache(c => ({ ...c, [qid]: data || [] }))
    setLoadingItems(null)
  }

  async function updateStatus(qid: string, status: string) {
    setUpdatingId(qid)
    const supabase = createClient()
    const { data, error } = await supabase.from('quotations').update({ status, updated_at: new Date().toISOString() }).eq('id', qid).select('*, profiles(full_name, email, role, company_name)').single()
    if (error) { toast.error(error.message); setUpdatingId(null); return }
    setQuotations(qs => qs.map(q => q.id === qid ? data : q))
    toast.success(`Status updated to ${status}`)
    setUpdatingId(null)
  }

  const filtered = quotations.filter(q => statusFilter === 'all' || q.status === statusFilter)

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e8edf8' }}>Quotations</h1>
          <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>{quotations.length} total quotations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', border: `1px solid ${statusFilter === s ? '#0e90e2' : 'rgba(30,45,77,0.6)'}`, background: statusFilter === s ? 'rgba(14,144,226,0.1)' : 'transparent', color: statusFilter === s ? '#38aaf6' : '#8899bb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', fontFamily: 'inherit' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map(q => {
          const profile = q.profiles as { full_name?: string; email?: string; role?: string; company_name?: string } | undefined
          const items = itemsCache[q.id]
          return (
            <div key={q.id} className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => toggleExpand(q.id)}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: '#e8edf8' }}>{profile?.full_name || profile?.email || 'Unknown'}</span>
                    <span className={`badge badge-${profile?.role || 'buyer'}`}>{profile?.role}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8899bb' }}>
                    {profile?.company_name && <span>{profile.company_name} · </span>}
                    {new Date(q.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>{formatINR(q.total_paise)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8899bb', fontFamily: 'monospace' }}>#{q.id.slice(0, 8)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`badge badge-${q.status}`}>{q.status}</span>
                  {expanded === q.id ? <ChevronUp size={18} color="#8899bb" /> : <ChevronDown size={18} color="#8899bb" />}
                </div>
              </div>

              {expanded === q.id && (
                <div style={{ borderTop: '1px solid rgba(30,45,77,0.5)', padding: '1.25rem 1.5rem' }}>
                  {/* Status control */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: '#8899bb', fontWeight: 600 }}>Change Status:</span>
                    {STATUSES.map(s => (
                      <button key={s} onClick={e => { e.stopPropagation(); updateStatus(q.id, s) }} disabled={q.status === s || updatingId === q.id}
                        style={{ padding: '0.3rem 0.75rem', borderRadius: '0.4rem', border: `1px solid rgba(30,45,77,0.6)`, background: q.status === s ? 'rgba(14,144,226,0.1)' : 'transparent', color: q.status === s ? '#38aaf6' : '#8899bb', cursor: q.status === s ? 'default' : 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}>
                        {updatingId === q.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : s}
                      </button>
                    ))}
                  </div>

                  {q.notes && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(30,45,77,0.3)', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#8899bb' }}>📝 {q.notes}</div>}

                  {loadingItems === q.id && <div style={{ color: '#8899bb', fontSize: '0.875rem' }}>Loading items...</div>}
                  {items && (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Ordered Qty</th>
                          <th>Base Qty (stored)</th>
                          <th>Unit Price</th>
                          <th>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => {
                          const prod = item.products as { name?: string; base_unit?: string } | undefined
                          return (
                            <tr key={item.id}>
                              <td style={{ color: '#e8edf8', fontWeight: 500 }}>{prod?.name || item.product_id.slice(0, 8)}</td>
                              <td style={{ color: '#38aaf6' }}>{Number(item.display_qty).toLocaleString('en-IN')} {item.display_unit}</td>
                              <td style={{ color: '#8899bb', fontFamily: 'monospace', fontSize: '0.8rem' }}>{Number(item.ordered_qty_base).toLocaleString('en-IN')} {prod?.base_unit}</td>
                              <td style={{ color: '#8899bb' }}>₹{(item.unit_price_paise / 100).toFixed(4)}/{prod?.base_unit}</td>
                              <td style={{ color: '#34d399', fontWeight: 700 }}>{formatINR(item.line_total_paise)}</td>
                            </tr>
                          )
                        })}
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, color: '#8899bb' }}>Total</td>
                          <td style={{ color: '#34d399', fontWeight: 800, fontSize: '1rem' }}>{formatINR(q.total_paise)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#8899bb' }}>
            <ClipboardList size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
            No quotations found
          </div>
        )}
      </div>
    </div>
  )
}
