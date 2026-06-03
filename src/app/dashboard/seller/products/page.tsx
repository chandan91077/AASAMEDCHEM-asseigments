import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SellerProductsClient from './SellerProductsClient'

export default async function SellerProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'seller'].includes(profile.role)) redirect('/dashboard/buyer')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  return <SellerProductsClient products={products || []} sellerId={user.id} />
}
