'use client'

import { getBasicProgram, getBasicProgramId } from '@project/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { BN } from '@coral-xyz/anchor'

export interface RewardsPool {
  publicKey: PublicKey
  totalStaked: BN
  rewardRatePerDay: BN
  admin: PublicKey
}

export interface StakedCoupon {
  publicKey: PublicKey
  coupon: PublicKey
  staker: PublicKey
  stakedAt: BN
  lastClaimAt: BN
}

export interface CouponWithStaking {
  couponPublicKey: PublicKey
  deal: PublicKey
  owner: PublicKey
  mint: PublicKey
  isRedeemed: boolean
  mintedAt: BN
  staked: StakedCoupon | null
  pendingRewards: number
}

export function useStakingProgram() {
  const { publicKey } = useWallet()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getBasicProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getBasicProgram(provider, programId), [provider, programId])

  // Fetch rewards pool
  const rewardsPool = useQuery({
    queryKey: ['rewards-pool', { cluster }],
    queryFn: async () => {
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('rewards_pool')],
        program.programId
      )

      try {
        const poolAccount = await program.account.rewardsPool.fetch(poolPda)
        return {
          publicKey: poolPda,
          ...poolAccount,
        } as RewardsPool
      } catch {
        return null
      }
    },
    enabled: !!program,
  })

  // Fetch user's staked coupons
  const stakedCoupons = useQuery({
    queryKey: ['staked-coupons', publicKey?.toString(), { cluster }],
    queryFn: async (): Promise<CouponWithStaking[]> => {
      if (!publicKey) return []

      const coupons = await program.account.coupon.all([
        {
          memcmp: {
            offset: 40, // owner field offset
            bytes: publicKey.toBase58(),
          },
        },
      ])

      const currentTime = Math.floor(Date.now() / 1000)

      const couponsWithStaking = await Promise.all(
        coupons.map(async (coupon) => {
          const [stakedCouponPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('staked_coupon'), coupon.publicKey.toBuffer()],
            program.programId
          )

          let staked: StakedCoupon | null = null
          let pendingRewards = 0

          try {
            const stakedAccount = await program.account.stakedCoupon.fetch(stakedCouponPda)
            staked = {
              publicKey: stakedCouponPda,
              ...stakedAccount,
            } as StakedCoupon

            // Calculate pending rewards
            if (rewardsPool.data) {
              const timeSinceClaim = currentTime - staked.lastClaimAt.toNumber()
              const daysStaked = timeSinceClaim / 86400
              pendingRewards = Math.floor(daysStaked * rewardsPool.data.rewardRatePerDay.toNumber())
            }
          } catch {
            // Not staked, that's okay
          }

          return {
            couponPublicKey: coupon.publicKey,
            ...coupon.account,
            staked,
            pendingRewards,
          }
        })
      )

      return couponsWithStaking.filter((c) => !c.isRedeemed)
    },
    enabled: !!program && !!publicKey && !!rewardsPool.data,
    refetchInterval: 10000, // Refetch every 10 seconds to update rewards
  })

  // Stake a coupon
  const stakeCoupon = useMutation({
    mutationKey: ['staking', 'stake', { cluster }],
    mutationFn: async ({ couponPubkey }: { couponPubkey: PublicKey }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const [stakedCouponPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('staked_coupon'), couponPubkey.toBuffer()],
        program.programId
      )

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('rewards_pool')],
        program.programId
      )

      const signature = await program.methods
        .stakeCoupon()
        .accounts({
          coupon: couponPubkey,
          stakedCoupon: stakedCouponPda,
          rewardsPool: poolPda,
          staker: publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      stakedCoupons.refetch()
      rewardsPool.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to stake coupon: ${error}`)
    },
  })

  // Unstake a coupon
  const unstakeCoupon = useMutation({
    mutationKey: ['staking', 'unstake', { cluster }],
    mutationFn: async ({
      stakedCouponPubkey,
      couponPubkey,
    }: {
      stakedCouponPubkey: PublicKey
      couponPubkey: PublicKey
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('rewards_pool')],
        program.programId
      )

      const signature = await program.methods
        .unstakeCoupon()
        .accounts({
          stakedCoupon: stakedCouponPubkey,
          coupon: couponPubkey,
          rewardsPool: poolPda,
          staker: publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      stakedCoupons.refetch()
      rewardsPool.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to unstake coupon: ${error}`)
    },
  })

  // Claim rewards
  const claimRewards = useMutation({
    mutationKey: ['staking', 'claim', { cluster }],
    mutationFn: async ({ stakedCouponPubkey }: { stakedCouponPubkey: PublicKey }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('rewards_pool')],
        program.programId
      )

      const signature = await program.methods
        .claimRewards()
        .accounts({
          stakedCoupon: stakedCouponPubkey,
          rewardsPool: poolPda,
          staker: publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      stakedCoupons.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to claim rewards: ${error}`)
    },
  })

  return {
    program,
    programId,
    rewardsPool,
    stakedCoupons,
    stakeCoupon,
    unstakeCoupon,
    claimRewards,
  }
}
