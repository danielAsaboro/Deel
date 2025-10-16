import { AppHero } from '@/components/app-hero'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Ticket, Store, Wallet, QrCode, TrendingDown, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: TrendingDown,
    title: 'NFT Coupons',
    description: 'Every deal is a transferable NFT with on-chain verification',
  },
  {
    icon: Store,
    title: 'Merchant Dashboard',
    description: 'Easy-to-use interface for businesses to create and manage deals',
  },
  {
    icon: Wallet,
    title: 'User Wallet',
    description: 'Browse, purchase, and collect discount NFTs in your wallet',
  },
  {
    icon: QrCode,
    title: 'QR Redemption',
    description: 'Secure on-chain redemption with QR code verification',
  },
  {
    icon: ShoppingBag,
    title: 'Deal Marketplace',
    description: 'Discover and trade unused coupons with other users',
  },
  {
    icon: Ticket,
    title: 'Resale & Transfer',
    description: 'Own your discounts - transfer, trade, or gift your coupons',
  },
]

export function DashboardFeature() {
  return (
    <div>
      <AppHero
        title="Deal - Web3 Discount Marketplace"
        subtitle="The next evolution of Groupon. User-owned, borderless, and Web3-powered."
      >
        <div className="flex gap-4 justify-center">
          <Link href="/deals">
            <Button size="lg">Browse Deals</Button>
          </Link>
          <Link href="/coupons">
            <Button size="lg" variant="outline">
              My Coupons
            </Button>
          </Link>
        </div>
      </AppHero>

      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Deal transforms discounts into digital assets. Each promotion is an NFT that grants real-world
            savings, can be transferred or traded, and is verified on-chain.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                <feature.icon className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Get Started</h2>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Connect Wallet</CardTitle>
                <CardDescription>
                  Connect your Solana wallet to start browsing deals
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Claim Coupons</CardTitle>
                <CardDescription>
                  Mint NFT coupons from your favorite merchants
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Redeem & Save</CardTitle>
                <CardDescription>
                  Show your QR code to merchants and save money
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
