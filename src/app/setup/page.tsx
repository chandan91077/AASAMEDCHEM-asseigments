import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SetupPage() {
  const supabase = await createClient()

  // Fix all roles
  await supabase.from('profiles').update({ role: 'admin' }).eq('email', 'admin@samedchem.com')
  await supabase.from('profiles').update({ role: 'seller' }).eq('email', 'seller@samedchem.com')
  await supabase.from('profiles').update({ role: 'buyer' }).eq('email', 'buyer@samedchem.com')

  // Check results
  const { data: profiles } = await supabase
    .from('profiles')
    .select('email, role')
    .order('role')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Outfit, sans-serif',
      padding: '2rem',
    }}>
      <div style={{
        background: 'rgba(15,22,41,0.9)',
        border: '1px solid rgba(30,45,77,0.6)',
        borderRadius: '1rem',
        padding: '2.5rem',
        maxWidth: 500,
        width: '100%',
      }}>
        <h1 style={{ color: '#34d399', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          ✅ Roles Fixed!
        </h1>
        <p style={{ color: '#8899bb', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          All user roles have been updated in the database.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {(profiles || []).map((p: { email: string; role: string }) => (
            <div key={p.email} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              background: 'rgba(52,211,153,0.05)',
              border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: '0.5rem',
            }}>
              <span style={{ color: '#e8edf8', fontSize: '0.9rem' }}>{p.email}</span>
              <span style={{
                padding: '0.2rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: p.role === 'admin' ? 'rgba(192,132,252,0.15)' : p.role === 'seller' ? 'rgba(251,146,60,0.15)' : 'rgba(56,170,246,0.15)',
                color: p.role === 'admin' ? '#c084fc' : p.role === 'seller' ? '#fb923c' : '#38aaf6',
                border: `1px solid ${p.role === 'admin' ? '#c084fc40' : p.role === 'seller' ? '#fb923c40' : '#38aaf640'}`,
              }}>
                {p.role}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600 }}>
            ⚠️ Now log out and log back in for roles to take effect
          </p>
          <a href="/login" style={{
            display: 'block',
            textAlign: 'center',
            padding: '0.75rem',
            background: 'linear-gradient(135deg, #0e90e2, #0272c0)',
            color: 'white',
            borderRadius: '0.5rem',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '0.95rem',
          }}>
            → Go to Login
          </a>
        </div>
      </div>
    </div>
  )
}
