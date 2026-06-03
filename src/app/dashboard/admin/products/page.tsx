import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProductsClient from './ProductsClient'

export default async function AdminProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard/buyer')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  return <ProductsClient initialProducts={products || []} />
}
