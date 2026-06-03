import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata: Metadata = {
  title: 'SAMEDCHEM — Chemical Raw Materials Marketplace',
  description: 'B2B platform for buying and selling chemical raw materials with precise unit conversion and quotation management.',
  keywords: 'chemicals, raw materials, marketplace, B2B, quotation, industrial',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} font-outfit antialiased`}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
