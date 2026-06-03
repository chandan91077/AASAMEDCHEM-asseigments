'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FlaskConical, LayoutDashboard, Package, Users, ClipboardList, ShoppingCart, Search, LogOut, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { UserProfile } from '@/lib/types'

interface Props {
  profile: UserProfile
}

function getNavItems(role: string) {
  if (role === 'admin') {
    return [
      { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard/admin/products', label: 'Products', icon: Package },
      { href: '/dashboard/admin/users', label: 'Users', icon: Users },
      { href: '/dashboard/admin/quotations', label: 'Quotations', icon: ClipboardList },
    ]
  }
  return [
    { href: `/dashboard/${role}`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `/dashboard/${role}/catalog`, label: 'Product Catalog', icon: Search },
    { href: `/dashboard/${role}/quotations`, label: 'My Quotations', icon: ShoppingCart },
  ]
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#c084fc',
  seller: '#fb923c',
  buyer: '#38aaf6',
}

export default function DashboardNav({ profile }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const navItems = getNavItems(profile?.role || 'buyer')
  const roleColor = ROLE_COLORS[profile?.role] || '#38aaf6'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      width: 260,
      background: 'linear-gradient(180deg, #0f1629 0%, #0a0f1e 100%)',
      borderRight: '1px solid rgba(30,45,77,0.6)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(30,45,77,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #0e90e2, #34d399)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlaskConical size={18} color="white" />
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e8edf8', letterSpacing: '-0.02em' }}>
            SAMED<span style={{ color: '#38aaf6' }}>CHEM</span>
          </span>
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(30,45,77,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${roleColor}40, ${roleColor}20)`, border: `1.5px solid ${roleColor}60`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleColor, fontWeight: 800, fontSize: '0.9rem' }}>
            {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e8edf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name || 'User'}
            </div>
            <div>
              <span className={`badge badge-${profile?.role}`} style={{ fontSize: '0.65rem' }}>
                {profile?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== `/dashboard/${profile?.role}` && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#e8edf8' : '#8899bb',
                background: isActive ? `rgba(14,144,226,0.12)` : 'transparent',
                border: isActive ? `1px solid rgba(14,144,226,0.2)` : '1px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              <Icon size={17} style={{ flexShrink: 0, color: isActive ? '#38aaf6' : '#8899bb' }} />
              <span style={{ flex: 1 }}>{label}</span>
              {isActive && <ChevronRight size={14} style={{ color: '#38aaf6' }} />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(30,45,77,0.5)' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 0.875rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'transparent',
            color: '#8899bb',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.color = '#f87171'; (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.color = '#8899bb'; (e.target as HTMLElement).style.background = 'transparent' }}
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
