import Link from 'next/link'
import { FlaskConical, ArrowRight, Shield, Users, TrendingUp, Package, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1629 50%, #141d35 100%)', minHeight: '100vh' }}>
      {/* Navigation */}
      <nav style={{ borderBottom: '1px solid rgba(30,45,77,0.5)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #0e90e2, #34d399)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlaskConical size={22} color="white" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#e8edf8' }}>
            SAMED<span style={{ color: '#38aaf6' }}>CHEM</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/login" className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Sign In</Link>
          <Link href=" " className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
        <div className="animate-fade-in-up" style={{ marginBottom: '1.5rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'rgba(14,144,226,0.1)', border: '1px solid rgba(14,144,226,0.3)', borderRadius: '9999px', fontSize: '0.8rem', color: '#38aaf6', fontWeight: 600 }}>
            <CheckCircle size={14} /> B2B Chemical Raw Materials Platform
          </span>
        </div>
        <h1 className="animate-fade-in-up gradient-text" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.5rem', animationDelay: '0.1s' }}>
          Precision Chemical<br />Trade, Redefined
        </h1>
        <p className="animate-fade-in-up" style={{ fontSize: '1.15rem', color: '#8899bb', lineHeight: 1.7, marginBottom: '2.5rem', animationDelay: '0.2s' }}>
          SAMEDCHEM is a B2B marketplace for chemical raw materials with precise unit conversion,
          real-time pricing in INR, and seamless quotation management.
        </p>
        <div className="animate-fade-in-up" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', animationDelay: '0.3s' }}>
          <Link href=" " className="btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            Start Trading <ArrowRight size={18} />
          </Link>
          <Link href=" " className="btn-secondary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
            Sign In to Dashboard
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '3rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[
            { icon: Shield, color: '#c084fc', title: 'Role-Based Access', desc: 'Admin, Seller & Buyer roles with precise permission control and secure authentication.' },
            { icon: Package, color: '#38aaf6', title: 'Smart Inventory', desc: 'Manage products with g, kg, mL, L, and unit quantities. Precise decimal storage.' },
            { icon: TrendingUp, color: '#34d399', title: 'INR Pricing', desc: 'All prices in Indian Rupees. Paise-level precision eliminates floating-point errors.' },
            { icon: Users, color: '#fb923c', title: 'Quotation Flow', desc: 'Search, select, enter quantities in any unit, and submit quotations instantly.' },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="stat-card animate-fade-in-up">
              <div style={{ width: 48, height: 48, background: `${color}20`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Icon size={24} color={color} />
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#e8edf8' }}>{title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#8899bb', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Role Cards */}
      <section style={{ padding: '3rem 2rem 5rem', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 800, marginBottom: '2rem', color: '#e8edf8' }}>
          Three Roles. One Platform.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {[
            { role: 'Admin', emoji: '🔑', color: '#c084fc', features: ['Manage all products & inventory', 'View & update all quotations', 'Manage users & roles', 'Full analytics dashboard'] },
            { role: 'Seller', emoji: '🏪', color: '#fb923c', features: ['Browse product catalog', 'Search & filter chemicals', 'Place quotations with unit choice', 'Track order history'] },
            { role: 'Buyer', emoji: '🛒', color: '#38aaf6', features: ['Browse product catalog', 'Real-time price calculator', 'Submit inquiry quotations', 'View quotation status'] },
          ].map(({ role, emoji, color, features }) => (
            <div key={role} className="glass-card" style={{ padding: '2rem', border: `1px solid ${color}30` }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{emoji}</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color, marginBottom: '1rem' }}>{role}</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#8899bb' }}>
                    <CheckCircle size={14} color={color} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href=" " className="btn-primary" style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center', background: `linear-gradient(135deg, ${color}cc, ${color})` }}>
                Join as {role} <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(30,45,77,0.5)', padding: '2rem', textAlign: 'center', color: '#8899bb', fontSize: '0.875rem' }}>
        hello
      </footer>
    </div>
  )
}
