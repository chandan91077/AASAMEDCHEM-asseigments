export type UserRole = 'admin' | 'seller' | 'buyer'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  company_name?: string
  phone?: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  description?: string
  sku?: string
  category?: string
  base_unit: 'g' | 'mL' | 'unit'
  base_price_paise: number
  stock_quantity: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface QuotationItem {
  id: string
  quotation_id: string
  product_id: string
  product?: Product
  ordered_qty_base: number
  display_unit: string
  display_qty: number
  unit_price_paise: number
  line_total_paise: number
}

export interface Quotation {
  id: string
  user_id: string
  user?: UserProfile
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled'
  notes?: string
  total_paise: number
  created_at: string
  updated_at: string
  items?: QuotationItem[]
}

export interface CartItem {
  product: Product
  displayUnit: string
  displayQty: number
  orderedQtyBase: number
  lineTotalPaise: number
}
