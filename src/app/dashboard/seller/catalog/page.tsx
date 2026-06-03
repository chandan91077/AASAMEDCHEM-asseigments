import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CatalogClient from '@/components/catalog/CatalogClient'

export default async function SellerCatalogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return <CatalogClient products={products || []} userId={user.id} userRole={profile?.role || 'seller'} />
}
