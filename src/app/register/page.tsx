'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FlaskConical, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const ROLES = [
  { value: 'buyer', label: '🛒 Buyer', desc: 'Browse & order chemical raw materials' },
  { value: 'seller', label: '🏪 Seller', desc: 'List & sell products on the platform' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'buyer', company: '', phone: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  function update(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          role: form.role,
          company_name: form.company,
          phone: form.phone,
        }
      }
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Explicitly upsert profile with correct role (in case trigger used default)
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: form.email,
        full_name: form.fullName,
        role: form.role,
        company_name: form.company || null,
        phone: form.phone || null,
      }, { onConflict: 'id' })

      toast.success('Account created! Redirecting to dashboard...')
      router.push(`/dashboard/${form.role}`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1629 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ position: 'fixed', top: '10%', right: '20%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div className="glass-card animate-fade-in-up" style={{ width: '100%', maxWidth: 480, padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, background: 'linear-gradient(135deg, #34d399, #0e90e2)', borderRadius: '14px', marginBottom: '1rem' }}>
            <FlaskConical size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e8edf8', marginBottom: '0.25rem' }}>Create Account</h1>
          <p style={{ fontSize: '0.875rem', color: '#8899bb' }}>Join SAMEDCHEM today</p>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Role selector */}
          <div className="form-group">
            <label className="form-label">I am a</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => update('role', r.value)}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${form.role === r.value ? '#0e90e2' : 'rgba(30,45,77,0.6)'}`,
                    background: form.role === r.value ? 'rgba(14,144,226,0.1)' : 'rgba(20,29,53,0.5)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    color: '#e8edf8',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{r.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#8899bb' }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full Name</label>
              <input id="fullName" type="text" className="input-field" placeholder="John Doe" value={form.fullName} onChange={e => update('fullName', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="company">Company (optional)</label>
              <input id="company" type="text" className="input-field" placeholder="ACME Chemicals" value={form.company} onChange={e => update('company', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email Address</label>
            <input id="reg-email" type="email" className="input-field" placeholder="you@company.com" value={form.email} onChange={e => update('email', e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone (optional)</label>
            <input id="phone" type="tel" className="input-field" placeholder="+91 98765 43210" value={form.phone} onChange={e => update('phone', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                type={showPwd ? 'text' : 'password'}
                className="input-field"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                required
                style={{ paddingRight: '2.75rem' }}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8899bb', display: 'flex' }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', padding: '0.75rem', fontSize: '0.95rem' }} disabled={loading}>
            {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Creating account...</> : <>Create Account <ArrowRight size={16} /></>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#8899bb' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#38aaf6', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
