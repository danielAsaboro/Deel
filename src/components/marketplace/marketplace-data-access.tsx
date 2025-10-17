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

export interface Listing {
  publicKey: PublicKey
  coupon: PublicKey
  seller: PublicKey
  priceLamports: BN
  isActive: boolean
  createdAt: BN
}

export interface CouponWithListing {
  couponPublicKey: PublicKey
  deal: PublicKey
  owner: PublicKey
  mint: PublicKey
  isRedeemed: boolean
  mintedAt: BN
  listing: Listing | null
}

export function useMarketplaceProgram() {
  const { publicKey } = useWallet()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getBasicProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getBasicProgram(provider, programId), [provider, programId])

  // Fetch all active listings
  const listings = useQuery({
    queryKey: ['listings', 'all', { cluster }],
    queryFn: async () => {
      const allListings = await program.account.listing.all()
      return allListings
        .filter((l) => l.account.isActive)
        .map((listing) => ({
          publicKey: listing.publicKey,
          ...listing.account,
        })) as Listing[]
    },
    enabled: !!program,
  })

  // Fetch user's coupons with their listing status
  const userCoupons = useQuery({
    queryKey: ['coupons', 'user', publicKey?.toString(), { cluster }],
    queryFn: async (): Promise<CouponWithListing[]> => {
      if (!publicKey) return []

      const coupons = await program.account.coupon.all([
        {
          memcmp: {
            offset: 40, // owner field offset
            bytes: publicKey.toBase58(),
          },
        },
      ])

      const couponsWithListings = await Promise.all(
        coupons.map(async (coupon) => {
          const [listingPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('listing'), coupon.publicKey.toBuffer()],
            program.programId
          )

          let listing: Listing | null = null
          try {
            const listingAccount = await program.account.listing.fetch(listingPda)
            if (listingAccount.isActive) {
              listing = {
                publicKey: listingPda,
                ...listingAccount,
              } as Listing
            }
          } catch {
            // Listing doesn't exist, that's okay
          }

          return {
            couponPublicKey: coupon.publicKey,
            ...coupon.account,
            listing,
          }
        })
      )

      return couponsWithListings.filter((c) => !c.isRedeemed)
    },
    enabled: !!program && !!publicKey,
  })

  // List a coupon for sale
  const listCoupon = useMutation({
    mutationKey: ['marketplace', 'list', { cluster }],
    mutationFn: async ({
      couponPubkey,
      priceLamports,
    }: {
      couponPubkey: PublicKey
      priceLamports: number
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const [listingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), couponPubkey.toBuffer()],
        program.programId
      )

      const signature = await program.methods
        .listCoupon(new BN(priceLamports))
        .accounts({
          coupon: couponPubkey,
          listing: listingPda,
          seller: publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      listings.refetch()
      userCoupons.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to list coupon: ${error}`)
    },
  })

  // Buy a listed coupon
  const buyCoupon = useMutation({
    mutationKey: ['marketplace', 'buy', { cluster }],
    mutationFn: async ({
      listingPubkey,
      couponPubkey,
      sellerPubkey,
      platformWallet,
    }: {
      listingPubkey: PublicKey
      couponPubkey: PublicKey
      sellerPubkey: PublicKey
      platformWallet: PublicKey
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const signature = await program.methods
        .buyCoupon()
        .accounts({
          listing: listingPubkey,
          coupon: couponPubkey,
          seller: sellerPubkey,
          buyer: publicKey,
          platformWallet,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      listings.refetch()
      userCoupons.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to buy coupon: ${error}`)
    },
  })

  // Delist a coupon
  const delistCoupon = useMutation({
    mutationKey: ['marketplace', 'delist', { cluster }],
    mutationFn: async ({
      listingPubkey,
      couponPubkey,
    }: {
      listingPubkey: PublicKey
      couponPubkey: PublicKey
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const signature = await program.methods
        .delistCoupon()
        .accounts({
          listing: listingPubkey,
          coupon: couponPubkey,
          seller: publicKey,
        } as any)
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      listings.refetch()
      userCoupons.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to delist coupon: ${error}`)
    },
  })

  return {
    program,
    programId,
    listings,
    userCoupons,
    listCoupon,
    buyCoupon,
    delistCoupon,
  }
}
