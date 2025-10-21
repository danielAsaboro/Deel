'use client'

import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Droplet, AlertTriangle } from 'lucide-react'

export function FaucetCard({
  usdcBalance,
  onMint,
  isLoading,
  isMainnet,
}: {
  usdcBalance: number
  onMint: () => void
  isLoading: boolean
  isMainnet: boolean
}) {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Droplet className="h-6 w-6 text-blue-500" />
          <CardTitle>USDC Faucet</CardTitle>
        </div>
        <CardDescription>Get test USDC for development and testing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isMainnet && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The faucet is not available on mainnet. Please switch to devnet or localnet.
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Your USDC Balance</p>
          <p className="text-3xl font-bold">{usdcBalance.toFixed(2)} USDC</p>
        </div>

        <div className="space-y-2">
          <Button
            onClick={onMint}
            disabled={isLoading || isMainnet}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Minting...' : 'Get 1,000 USDC'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            This faucet provides test USDC for development purposes only
          </p>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2 text-sm">What is Mock USDC?</h3>
          <p className="text-sm text-muted-foreground">
            This platform uses a mock USDC token for testing. It works exactly like real USDC but
            has no monetary value. Use this faucet to get test USDC for minting coupons, buying
            from the marketplace, and testing the platform features.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
