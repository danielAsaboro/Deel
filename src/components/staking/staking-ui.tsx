'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RewardsPool, CouponWithStaking } from './staking-data-access'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function RewardsPoolInfo({ pool }: { pool: RewardsPool }) {
  const formatSOL = (lamports: number) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(6)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rewards Pool</CardTitle>
        <CardDescription>Stake your coupons to earn rewards</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Staked</p>
            <p className="text-2xl font-bold">{pool.totalStaked.toString()}</p>
            <p className="text-xs text-muted-foreground">coupons</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Daily Reward Rate</p>
            <p className="text-2xl font-bold">{formatSOL(pool.rewardRatePerDay.toNumber())}</p>
            <p className="text-xs text-muted-foreground">SOL per day</p>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            Stake your unredeemed coupons to earn {formatSOL(pool.rewardRatePerDay.toNumber())} SOL
            per day. You can claim rewards anytime or unstake to get your coupon back.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

export function StakingCouponsManager({
  coupons,
  onStake,
  onUnstake,
  onClaim,
  isLoading,
}: {
  coupons: CouponWithStaking[]
  onStake: (couponPubkey: PublicKey) => void
  onUnstake: (stakedCouponPubkey: PublicKey, couponPubkey: PublicKey) => void
  onClaim: (stakedCouponPubkey: PublicKey) => void
  isLoading: boolean
}) {
  const formatSOL = (lamports: number) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(6)
  }

  const formatTimeStaked = (stakedAt: number) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - stakedAt
    const days = Math.floor(diff / 86400)
    const hours = Math.floor((diff % 86400) / 3600)
    const minutes = Math.floor((diff % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const stakedCoupons = coupons.filter((c) => c.staked)
  const unstakedCoupons = coupons.filter((c) => !c.staked)

  if (coupons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            You don&apos;t own any coupons to stake
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Staked Coupons */}
      {stakedCoupons.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Staked Coupons ({stakedCoupons.length})</h3>
          {stakedCoupons.map((coupon) => (
            <Card key={coupon.couponPublicKey.toString()} className="border-primary">
              <CardContent className="py-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {coupon.couponPublicKey.toString().slice(0, 20)}...
                        </p>
                        <Badge variant="default">Staked</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Staked {formatTimeStaked(coupon.staked!.stakedAt.toNumber())} ago
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-3 px-4 bg-muted rounded-md">
                    <div>
                      <p className="text-xs text-muted-foreground">Pending Rewards</p>
                      <p className="text-lg font-bold text-primary">
                        {formatSOL(coupon.pendingRewards)} SOL
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Staked At</p>
                      <p className="text-sm font-medium">
                        {new Date(coupon.staked!.stakedAt.toNumber() * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Claim</p>
                      <p className="text-sm font-medium">
                        {new Date(coupon.staked!.lastClaimAt.toNumber() * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onClaim(coupon.staked!.publicKey)}
                      disabled={isLoading || coupon.pendingRewards === 0}
                      className="flex-1"
                    >
                      Claim Rewards
                      {coupon.pendingRewards > 0 && ` (${formatSOL(coupon.pendingRewards)} SOL)`}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onUnstake(coupon.staked!.publicKey, coupon.couponPublicKey)
                      }
                      disabled={isLoading}
                    >
                      Unstake
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Unstaked Coupons */}
      {unstakedCoupons.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Available to Stake ({unstakedCoupons.length})</h3>
          {unstakedCoupons.map((coupon) => (
            <Card key={coupon.couponPublicKey.toString()}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {coupon.couponPublicKey.toString().slice(0, 20)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mint: {coupon.mint.toString().slice(0, 16)}...
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onStake(coupon.couponPublicKey)}
                    disabled={isLoading}
                  >
                    Stake to Earn
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function NoRewardsPoolMessage() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            Rewards pool has not been initialized yet
          </p>
          <p className="text-sm text-muted-foreground">
            Contact the platform admin to set up the staking rewards pool
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
