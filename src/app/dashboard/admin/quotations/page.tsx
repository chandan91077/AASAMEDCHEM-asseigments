import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminQuotationsClient from './AdminQuotationsClient'

export default async function AdminQuotationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard/buyer')

  const { data: quotations } = await supabase
    .from('quotations')
    .select('*, profiles(full_name, email, role, company_name)')
    .order('created_at', { ascending: false })

  return <AdminQuotationsClient initialQuotations={quotations || []} />
}
