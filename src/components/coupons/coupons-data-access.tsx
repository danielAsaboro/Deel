'use client'

import { getBasicProgram, getBasicProgramId } from '@project/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { BN } from '@coral-xyz/anchor'

export interface Coupon {
  publicKey: PublicKey
  deal: PublicKey
  owner: PublicKey
  mint: PublicKey
  isRedeemed: boolean
  mintedAt: BN
  redeemedAt: BN | null
}

export function useCouponsProgram() {
  const { publicKey } = useWallet()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getBasicProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getBasicProgram(provider, programId), [provider, programId])

  // Fetch user's coupons
  const userCoupons = useQuery({
    queryKey: ['coupons', 'user', publicKey?.toString(), { cluster }],
    queryFn: async () => {
      if (!publicKey) return []
      const coupons = await program.account.coupon.all([
        {
          memcmp: {
            offset: 8 + 32, // Skip discriminator and deal pubkey
            bytes: publicKey.toBase58(),
          },
        },
      ])
      return coupons.map((coupon) => ({
        publicKey: coupon.publicKey,
        ...coupon.account,
      })) as Coupon[]
    },
    enabled: !!program && !!publicKey,
  })

  // Redeem coupon (merchant only)
  const redeemCoupon = useMutation({
    mutationKey: ['coupons', 'redeem', { cluster }],
    mutationFn: async ({ couponAddress, dealAddress }: { couponAddress: PublicKey; dealAddress: PublicKey }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const signature = await program.methods
        .redeemCoupon()
        .accounts({
          coupon: couponAddress,
          deal: dealAddress,
          merchant: publicKey,
        })
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      userCoupons.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to redeem coupon: ${error}`)
    },
  })

  // Transfer coupon
  const transferCoupon = useMutation({
    mutationKey: ['coupons', 'transfer', { cluster }],
    mutationFn: async ({ couponAddress, newOwner }: { couponAddress: PublicKey; newOwner: PublicKey }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const signature = await program.methods
        .transferCoupon()
        .accounts({
          coupon: couponAddress,
          currentOwner: publicKey,
          newOwner: newOwner,
        })
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      userCoupons.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to transfer coupon: ${error}`)
    },
  })

  // Generate QR code data for redemption
  const generateRedemptionQR = (coupon: Coupon) => {
    return JSON.stringify({
      coupon: coupon.publicKey.toString(),
      deal: coupon.deal.toString(),
      owner: coupon.owner.toString(),
      mint: coupon.mint.toString(),
    })
  }

  return {
    program,
    programId,
    userCoupons,
    redeemCoupon,
    transferCoupon,
    generateRedemptionQR,
  }
}
