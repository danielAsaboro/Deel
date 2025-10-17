'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { useAnalyticsProgram } from './analytics-data-access'
import { AnalyticsDashboard, AnalyticsLoading, AnalyticsError } from './analytics-ui'
import { Card, CardContent } from '@/components/ui/card'

export default function AnalyticsFeature() {
  const { publicKey } = useWallet()
  const { useMerchantAnalytics } = useAnalyticsProgram()
  const analytics = useMerchantAnalytics(publicKey)

  if (!publicKey) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Merchant Analytics</h1>
          <p className="text-muted-foreground">
            Track your deal performance, revenue, and customer insights
          </p>
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-sm">Connect your wallet to view your analytics dashboard</p>
                <WalletButton />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Merchant Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Performance metrics for {publicKey.toString().slice(0, 8)}...
          </p>
        </div>
        <WalletButton />
      </div>

      {analytics.isLoading && <AnalyticsLoading />}
      {analytics.isError && <AnalyticsError error={analytics.error as Error} />}
      {analytics.data && <AnalyticsDashboard analytics={analytics.data} />}
    </div>
  )
}
