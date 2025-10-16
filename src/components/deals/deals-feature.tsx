'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { DealsList, MerchantDashboard } from './deals-ui'
import { AppHero } from '../app-hero'
import { useState } from 'react'
import { Button } from '../ui/button'

export default function DealsFeature() {
  const { publicKey } = useWallet()
  const [view, setView] = useState<'marketplace' | 'merchant'>('marketplace')

  if (!publicKey) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="hero py-[64px]">
          <div className="hero-content text-center">
            <WalletButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <AppHero
        title="Deal Marketplace"
        subtitle="Discover exclusive deals and mint NFT coupons"
      >
        <div className="flex gap-2">
          <Button
            variant={view === 'marketplace' ? 'default' : 'outline'}
            onClick={() => setView('marketplace')}
          >
            Browse Deals
          </Button>
          <Button
            variant={view === 'merchant' ? 'default' : 'outline'}
            onClick={() => setView('merchant')}
          >
            Merchant Dashboard
          </Button>
        </div>
      </AppHero>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {view === 'marketplace' ? <DealsList /> : <MerchantDashboard />}
      </div>
    </div>
  )
}
