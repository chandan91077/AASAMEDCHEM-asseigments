'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FlaskConical, Eye, EyeOff, Loader2, ArrowRight, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const DEMO_USERS = [
  { role: 'Admin', emoji: '🔑', color: '#c084fc', email: 'admin@samedchem.com', password: 'Admin@123' },
  { role: 'Seller', emoji: '🏪', color: '#fb923c', email: 'seller@samedchem.com', password: 'Seller@123' },
  { role: 'Buyer', emoji: '🛒', color: '#38aaf6', email: 'buyer@samedchem.com', password: 'Buyer@123' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      toast.success('Welcome back!')
      router.push(`/dashboard/${profile?.role || 'buyer'}`)
      router.refresh()
    }
    setLoading(false)
  }

  function fillCredentials(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail)
    setPassword(demoPassword)
    toast.info('Credentials filled — click Sign In')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1629 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {/* Background orbs */}
      <div style={{ position: 'fixed', top: '10%', left: '20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(14,144,226,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '10%', right: '15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div className="glass-card animate-fade-in-up" style={{ width: '100%', maxWidth: 520, padding: '3rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 68, height: 68, background: 'linear-gradient(135deg, #0e90e2, #34d399)', borderRadius: '18px', marginBottom: '1.25rem' }}>
            <FlaskConical size={34} color="white" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#e8edf8', marginBottom: '0.375rem' }}>Welcome back</h1>
          <p style={{ fontSize: '1rem', color: '#8899bb' }}>Sign in to your SAMEDCHEM account</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{ fontSize: '1.05rem', padding: '0.875rem 1rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: '3rem', fontSize: '1.05rem', padding: '0.875rem 3rem 0.875rem 1rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8899bb', display: 'flex' }}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: '0.5rem', padding: '0.95rem', fontSize: '1.1rem', fontWeight: 700 }}
            disabled={loading}
          >
            {loading
              ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>
              : <>Sign In <ArrowRight size={18} /></>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '1rem', color: '#8899bb' }}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={{ color: '#38aaf6', textDecoration: 'none', fontWeight: 700 }}>
            Create one
          </Link>
        </p>

        {/* Demo Credentials */}
        <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'rgba(14,144,226,0.04)', border: '1px solid rgba(30,45,77,0.7)', borderRadius: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', color: '#8899bb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            🔐 Demo Credentials — Click to fill
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {DEMO_USERS.map(u => (
              <button
                key={u.role}
                type="button"
                onClick={() => fillCredentials(u.email, u.password)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'rgba(15,22,41,0.6)',
                  border: `1px solid ${u.color}25`,
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  width: '100%',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = u.color + '60'; (e.currentTarget as HTMLElement).style.background = u.color + '10' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = u.color + '25'; (e.currentTarget as HTMLElement).style.background = 'rgba(15,22,41,0.6)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{u.emoji}</span>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: u.color }}>{u.role}</div>
                    <div style={{ fontSize: '0.8rem', color: '#8899bb', marginTop: '0.1rem' }}>{u.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#8899bb', fontFamily: 'monospace' }}>{u.password}</span>
                  <Copy size={13} color="#8899bb" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
