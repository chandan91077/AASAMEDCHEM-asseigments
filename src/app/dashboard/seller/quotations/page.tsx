import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuotationsClient from '@/components/quotations/QuotationsClient'

export default async function SellerQuotationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Find quotation IDs that include products belonging to this seller
  const { data: items } = await supabase
    .from('quotation_items')
    .select('quotation_id, products(seller_id)')
    .order('id', { ascending: false })

  const sellerQuotationIds = Array.from(new Set((items || [])
    .filter((it: any) => it.products?.seller_id === user.id)
    .map((it: any) => it.quotation_id)))

  let quotations: any[] = []
  if (sellerQuotationIds.length > 0) {
    const { data } = await supabase
      .from('quotations')
      .select('*')
      .in('id', sellerQuotationIds)
      .order('created_at', { ascending: false })
    quotations = data || []
  }

  return <QuotationsClient quotations={quotations} />
}
