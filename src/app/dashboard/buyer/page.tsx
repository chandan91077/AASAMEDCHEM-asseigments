import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ShoppingCart, Package, Clock, CheckCircle } from 'lucide-react'
import { formatINR } from '@/lib/units'
import Link from 'next/link'

export default async function BuyerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: myQuotations } = await supabase
    .from('quotations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)

  const { count: totalQ } = await supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
  const { count: pendingQ } = await supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending')
  const { count: approvedQ } = await supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'approved')
  const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true)

  const stats = [
    { label: 'Total Quotations', value: totalQ ?? 0, icon: ShoppingCart, color: '#38aaf6' },
    { label: 'Pending', value: pendingQ ?? 0, icon: Clock, color: '#fbbf24' },
    { label: 'Approved', value: approvedQ ?? 0, icon: CheckCircle, color: '#34d399' },
    { label: 'Products Available', value: productCount ?? 0, icon: Package, color: '#c084fc' },
  ]

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e8edf8', marginBottom: '0.25rem' }}>
          Welcome, {profile?.full_name || 'Buyer'} 👋
        </h1>
        <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>Browse chemicals and manage your quotations</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
              <div style={{ width: 36, height: 36, background: `${color}15`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#e8edf8' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e8edf8' }}>Recent Quotations</h2>
            <Link href="/dashboard/buyer/quotations" style={{ fontSize: '0.8rem', color: '#38aaf6', textDecoration: 'none' }}>View all →</Link>
          </div>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {(myQuotations || []).map((q: { id: string; created_at: string; status: string; total_paise: number }) => (
                <tr key={q.id}>
                  <td style={{ color: '#8899bb', fontSize: '0.8rem' }}>{new Date(q.created_at).toLocaleDateString('en-IN')}</td>
                  <td><span className={`badge badge-${q.status}`}>{q.status}</span></td>
                  <td style={{ color: '#34d399', fontWeight: 600 }}>{formatINR(q.total_paise)}</td>
                </tr>
              ))}
              {(!myQuotations || myQuotations.length === 0) && <tr><td colSpan={3} style={{ color: '#8899bb', textAlign: 'center', padding: '1.5rem' }}>No quotations yet</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1rem', background: 'linear-gradient(135deg, rgba(52,211,153,0.05), rgba(14,144,226,0.05))' }}>
          <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, #34d399, #0e90e2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={30} color="white" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e8edf8' }}>Start Shopping</h3>
          <p style={{ fontSize: '0.875rem', color: '#8899bb', lineHeight: 1.6 }}>Browse {productCount ?? 0} chemical raw materials, choose your units, and submit inquiry quotations</p>
          <Link href="/dashboard/buyer/catalog" className="btn-success">Browse Catalog →</Link>
        </div>
      </div>
    </div>
  )
}
