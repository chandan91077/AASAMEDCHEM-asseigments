'use client'

import { useState } from 'react'
import { Users, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { UserProfile } from '@/lib/types'

export default function UsersClient({ initialUsers, currentUserId }: { initialUsers: UserProfile[], currentUserId: string }) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers)
  const [search, setSearch] = useState('')

  async function changeRole(userId: string, newRole: string) {
    if (userId === currentUserId) { toast.error("You can't change your own role"); return }
    const supabase = createClient()
    const { data, error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId).select().single()
    if (error) { toast.error(error.message); return }
    setUsers(us => us.map(u => u.id === userId ? data : u))
    toast.success(`Role changed to ${newRole}`)
  }

  const filtered = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#e8edf8' }}>Users</h1>
          <p style={{ color: '#8899bb', fontSize: '0.9rem' }}>{users.length} registered users</p>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input className="input-field" placeholder="Search users by name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400 }} />
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Company</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(14,144,226,0.3), rgba(52,211,153,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#38aaf6', flexShrink: 0 }}>
                      {(u.full_name || u.email)[0].toUpperCase()}
                    </div>
                    <span style={{ color: '#e8edf8', fontWeight: 500 }}>{u.full_name || '—'}</span>
                    {u.id === currentUserId && <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 600 }}>YOU</span>}
                  </div>
                </td>
                <td style={{ color: '#8899bb', fontSize: '0.85rem' }}>{u.email}</td>
                <td style={{ color: '#8899bb' }}>{u.company_name || '—'}</td>
                <td style={{ color: '#8899bb' }}>{u.phone || '—'}</td>
                <td>
                  {u.id === currentUserId ? (
                    <span className={`badge badge-${u.role}`}>{u.role}</span>
                  ) : (
                    <select
                      className="input-field"
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                    >
                      <option value="buyer">buyer</option>
                      <option value="seller">seller</option>
                      <option value="admin">admin</option>
                    </select>
                  )}
                </td>
                <td style={{ color: '#8899bb', fontSize: '0.8rem' }}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#8899bb' }}>
                <Users size={40} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
                No users found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
