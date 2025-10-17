import type { Metadata } from 'next'
import './globals.css'
import { AppProviders } from '@/components/app-providers'
import { AppLayout } from '@/components/app-layout'
import React from 'react'

export const metadata: Metadata = {
  title: 'Deal - Web3 Discount Marketplace',
  description: 'The next evolution of Groupon - user-owned, borderless, and Web3-powered. Trade NFT coupons, stake for rewards, and discover exclusive deals on Solana.',
}

const links: { label: string; path: string }[] = [
  { label: 'Home', path: '/' },
  { label: 'Deals', path: '/deals' },
  { label: 'My Coupons', path: '/coupons' },
  { label: 'Marketplace', path: '/marketplace' },
  { label: 'Staking', path: '/staking' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Gateway', path: '/gateway' },
  { label: 'Account', path: '/account' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased`}>
        <AppProviders>
          <AppLayout links={links}>{children}</AppLayout>
        </AppProviders>
      </body>
    </html>
  )
}
// Patch BigInt so we can log it using JSON.stringify without any errors
declare global {
  interface BigInt {
    toJSON(): string
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString()
}
