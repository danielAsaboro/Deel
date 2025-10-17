'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { WalletButton } from '../solana/solana-provider'
import { useStakingProgram } from './staking-data-access'
import { RewardsPoolInfo, StakingCouponsManager, NoRewardsPoolMessage } from './staking-ui'
import { Card, CardContent } from '@/components/ui/card'

export default function StakingFeature() {
  const { publicKey } = useWallet()
  const staking = useStakingProgram()

  const handleStake = async (couponPubkey: PublicKey) => {
    await staking.stakeCoupon.mutateAsync({ couponPubkey })
  }

  const handleUnstake = async (stakedCouponPubkey: PublicKey, couponPubkey: PublicKey) => {
    await staking.unstakeCoupon.mutateAsync({
      stakedCouponPubkey,
      couponPubkey,
    })
  }

  const handleClaim = async (stakedCouponPubkey: PublicKey) => {
    await staking.claimRewards.mutateAsync({ stakedCouponPubkey })
  }

  if (!publicKey) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Coupon Staking</h1>
          <p className="text-muted-foreground">
            Stake your coupons to earn passive rewards
          </p>
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-sm">Connect your wallet to start staking</p>
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
          <h1 className="text-4xl font-bold">Coupon Staking</h1>
          <p className="text-muted-foreground mt-2">
            Stake your unredeemed coupons to earn daily rewards
          </p>
        </div>
        <WalletButton />
      </div>

      {staking.rewardsPool.isLoading && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading rewards pool...</p>
          </CardContent>
        </Card>
      )}

      {staking.rewardsPool.isError && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-destructive">
              Failed to load rewards pool: {staking.rewardsPool.error?.message}
            </p>
          </CardContent>
        </Card>
      )}

      {staking.rewardsPool.data === null && (
        <NoRewardsPoolMessage />
      )}

      {staking.rewardsPool.data && (
        <>
          <RewardsPoolInfo pool={staking.rewardsPool.data} />

          <div>
            {staking.stakedCoupons.isLoading && (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">Loading your coupons...</p>
                </CardContent>
              </Card>
            )}

            {staking.stakedCoupons.isError && (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-destructive">
                    Failed to load coupons: {staking.stakedCoupons.error?.message}
                  </p>
                </CardContent>
              </Card>
            )}

            {staking.stakedCoupons.data && (
              <StakingCouponsManager
                coupons={staking.stakedCoupons.data}
                onStake={handleStake}
                onUnstake={handleUnstake}
                onClaim={handleClaim}
                isLoading={
                  staking.stakeCoupon.isPending ||
                  staking.unstakeCoupon.isPending ||
                  staking.claimRewards.isPending
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
