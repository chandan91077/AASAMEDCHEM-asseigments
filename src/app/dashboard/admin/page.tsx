import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Package, Users, ClipboardList, TrendingUp, IndianRupee, Clock, CheckCircle } from 'lucide-react'
import { formatINR } from '@/lib/units'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard/buyer')

  // Stats
  const [
    { count: productCount },
    { count: userCount },
    { count: quotationCount },
    { data: recentQuotations },
    { data: products },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('quotations').select('*', { count: 'exact', head: true }),
    supabase.from('quotations').select('*, profiles(full_name, email, role)').order('created_at', { ascending: false }).limit(5),
    supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
  ])

  const { data: pendingQ } = await supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  const { data: totalRevData } = await supabase.from('quotations').select('total_paise').eq('status', 'approved')
  const totalRevPaise = (totalRevData || []).reduce((sum: number, q: { total_paise: number }) => sum + q.total_paise, 0)

  const stats = [
    { label: 'Total Products', value: productCount ?? 0, icon: Package, color: '#38aaf6' },
    { label: 'Total Users', value: userCount ?? 0, icon: Users, color: '#c084fc' },
    { label: 'Total Quotations', value: quotationCount ?? 0, icon: ClipboardList, color: '#fb923c' },
    { label: 'Pending Quotations', value: pendingQ?.length ?? 0, icon: Clock, color: '#fbbf24' },
    { label: 'Approved Revenue', value: formatINR(totalRevPaise), icon: IndianRupee, color: '#34d399', isText: true },
  ]

  return (
    <div className="page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e8edf8', marginBottom: '0.25rem' }}>Admin Dashboard</h1>
        <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>Overview of SAMEDCHEM platform activity</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {stats.map(({ label, value, icon: Icon, color, isText }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#8899bb', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
              <div style={{ width: 36, height: 36, background: `${color}15`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <div style={{ fontSize: isText ? '1.25rem' : '2rem', fontWeight: 800, color: '#e8edf8' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Recent Quotations */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e8edf8' }}>Recent Quotations</h2>
            <a href="/dashboard/admin/quotations" style={{ fontSize: '0.8rem', color: '#38aaf6', textDecoration: 'none' }}>View all →</a>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {(recentQuotations || []).map((q: { id: string; profiles?: { full_name?: string; email?: string }; status: string; total_paise: number }) => (
                <tr key={q.id}>
                  <td style={{ color: '#e8edf8' }}>{(q.profiles as { full_name?: string; email?: string } | null)?.full_name || (q.profiles as { full_name?: string; email?: string } | null)?.email || 'Unknown'}</td>
                  <td><span className={`badge badge-${q.status}`}>{q.status}</span></td>
                  <td style={{ color: '#34d399', fontWeight: 600 }}>{formatINR(q.total_paise)}</td>
                </tr>
              ))}
              {(!recentQuotations || recentQuotations.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#8899bb', padding: '2rem' }}>No quotations yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Products */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e8edf8' }}>Recent Products</h2>
            <a href="/dashboard/admin/products" style={{ fontSize: '0.8rem', color: '#38aaf6', textDecoration: 'none' }}>Manage →</a>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit</th>
                <th>Price/unit</th>
              </tr>
            </thead>
            <tbody>
              {(products || []).map((p: { id: string; name: string; base_unit: string; base_price_paise: number; stock_quantity: number }) => (
                <tr key={p.id}>
                  <td style={{ color: '#e8edf8', fontWeight: 500 }}>{p.name}</td>
                  <td style={{ color: '#8899bb' }}>{p.base_unit}</td>
                  <td style={{ color: '#38aaf6' }}>₹{(p.base_price_paise / 100).toFixed(2)}/{p.base_unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
