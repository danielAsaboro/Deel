'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { MyCoupons, MerchantScanner } from './coupons-ui'
import { AppHero } from '../app-hero'
import { useState } from 'react'
import { Button } from '../ui/button'

export default function CouponsFeature() {
  const { publicKey } = useWallet()
  const [view, setView] = useState<'my-coupons' | 'redeem'>('my-coupons')

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
        title="My Coupons"
        subtitle="Manage your NFT coupons and redeem them"
      >
        <div className="flex gap-2">
          <Button
            variant={view === 'my-coupons' ? 'default' : 'outline'}
            onClick={() => setView('my-coupons')}
          >
            My Coupons
          </Button>
          <Button
            variant={view === 'redeem' ? 'default' : 'outline'}
            onClick={() => setView('redeem')}
          >
            Redeem (Merchant)
          </Button>
        </div>
      </AppHero>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {view === 'my-coupons' ? <MyCoupons /> : <MerchantScanner />}
      </div>
    </div>
  )
}
