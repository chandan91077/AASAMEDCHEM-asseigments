import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuotationsClient from '@/components/quotations/QuotationsClient'

export default async function SellerQuotationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: quotations } = await supabase
    .from('quotations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <QuotationsClient quotations={quotations || []} />
}
