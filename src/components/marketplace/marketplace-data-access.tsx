'use client'

import { getBasicProgram, getBasicProgramId } from '@project/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { useGateway } from '../gateway/gateway-data-access'
import { buildGatewayTransaction, sendGatewayTransaction, gatewayTransactionTracker } from '@/lib/gateway'
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
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const gateway = useGateway()
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
    queryKey: ['marketplace', 'user-coupons', publicKey?.toString(), { cluster }],
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

      let signature: string

      // Check if Gateway is enabled and configured
      if (gateway.isEnabled && gateway.apiKey) {
        const txId = `list-coupon-${Date.now()}`

        try {
          gatewayTransactionTracker.start(txId, {
            deliveryMethod: gateway.config.deliveryMethodType,
            cuPriceRange: gateway.config.cuPriceRange,
            jitoTipRange: gateway.config.jitoTipRange,
          })

          toast.info('Building transaction with Gateway...')

          const tx = await program.methods
            .listCoupon(new BN(priceLamports))
            .accounts({
              coupon: couponPubkey,
              listing: listingPda,
              seller: publicKey,
              systemProgram: SystemProgram.programId,
            } as any)
            .transaction()

          const { blockhash } = await connection.getLatestBlockhash()
          tx.recentBlockhash = blockhash
          tx.feePayer = publicKey

          gatewayTransactionTracker.update(txId, { status: 'building' })

          const cluster = gateway.getCluster()
          if (!cluster) {
            throw new Error('Gateway is not supported on this cluster. Please switch to devnet or mainnet.')
          }

          const buildResponse = await buildGatewayTransaction(cluster, tx, gateway.getBuildOptions())

          toast.info('Signing optimized transaction...')
          gatewayTransactionTracker.update(txId, { status: 'signing' })

          const optimizedTxBuffer = Buffer.from(buildResponse.result.transaction, 'base64')
          const optimizedTx = Transaction.from(optimizedTxBuffer)

          if (!signTransaction) {
            throw new Error('Wallet does not support transaction signing')
          }

          const signedTx = await signTransaction(optimizedTx)
          const signedTxBase64 = Buffer.from(signedTx.serialize()).toString('base64')

          toast.info('Sending transaction via Gateway...')
          gatewayTransactionTracker.update(txId, { status: 'sending' })

          const sendResponse = await sendGatewayTransaction(cluster, signedTxBase64, { encoding: 'base64' })

          if (!sendResponse.result) {
            throw new Error('No signature returned from Gateway')
          }

          signature = sendResponse.result

          gatewayTransactionTracker.update(txId, { status: 'success', signature })
          toast.success('Transaction sent via Gateway!')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          gatewayTransactionTracker.update(txId, { status: 'failed', error: errorMessage })
          throw error
        }
      } else {
        // Fallback to standard RPC
        toast.info('Sending transaction via standard RPC...')
        signature = await program.methods
          .listCoupon(new BN(priceLamports))
          .accounts({
            coupon: couponPubkey,
            listing: listingPda,
            seller: publicKey,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc()
      }

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

      let signature: string

      // Check if Gateway is enabled and configured
      if (gateway.isEnabled && gateway.apiKey) {
        const txId = `buy-coupon-${Date.now()}`

        try {
          gatewayTransactionTracker.start(txId, {
            deliveryMethod: gateway.config.deliveryMethodType,
            cuPriceRange: gateway.config.cuPriceRange,
            jitoTipRange: gateway.config.jitoTipRange,
          })

          toast.info('Building transaction with Gateway...')

          const tx = await program.methods
            .buyCoupon()
            .accounts({
              listing: listingPubkey,
              coupon: couponPubkey,
              seller: sellerPubkey,
              buyer: publicKey,
              platformWallet,
              systemProgram: SystemProgram.programId,
            } as any)
            .transaction()

          const { blockhash } = await connection.getLatestBlockhash()
          tx.recentBlockhash = blockhash
          tx.feePayer = publicKey

          gatewayTransactionTracker.update(txId, { status: 'building' })

          const cluster = gateway.getCluster()
          if (!cluster) {
            throw new Error('Gateway is not supported on this cluster. Please switch to devnet or mainnet.')
          }

          const buildResponse = await buildGatewayTransaction(cluster, tx, gateway.getBuildOptions())

          toast.info('Signing optimized transaction...')
          gatewayTransactionTracker.update(txId, { status: 'signing' })

          const optimizedTxBuffer = Buffer.from(buildResponse.result.transaction, 'base64')
          const optimizedTx = Transaction.from(optimizedTxBuffer)

          if (!signTransaction) {
            throw new Error('Wallet does not support transaction signing')
          }

          const signedTx = await signTransaction(optimizedTx)
          const signedTxBase64 = Buffer.from(signedTx.serialize()).toString('base64')

          toast.info('Sending transaction via Gateway...')
          gatewayTransactionTracker.update(txId, { status: 'sending' })

          const sendResponse = await sendGatewayTransaction(cluster, signedTxBase64, { encoding: 'base64' })

          if (!sendResponse.result) {
            throw new Error('No signature returned from Gateway')
          }

          signature = sendResponse.result

          gatewayTransactionTracker.update(txId, { status: 'success', signature })
          toast.success('Transaction sent via Gateway!')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          gatewayTransactionTracker.update(txId, { status: 'failed', error: errorMessage })
          throw error
        }
      } else {
        // Fallback to standard RPC
        toast.info('Sending transaction via standard RPC...')
        signature = await program.methods
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
      }

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

      let signature: string

      // Check if Gateway is enabled and configured
      if (gateway.isEnabled && gateway.apiKey) {
        const txId = `delist-coupon-${Date.now()}`

        try {
          gatewayTransactionTracker.start(txId, {
            deliveryMethod: gateway.config.deliveryMethodType,
            cuPriceRange: gateway.config.cuPriceRange,
            jitoTipRange: gateway.config.jitoTipRange,
          })

          toast.info('Building transaction with Gateway...')

          const tx = await program.methods
            .delistCoupon()
            .accounts({
              listing: listingPubkey,
              coupon: couponPubkey,
              seller: publicKey,
            } as any)
            .transaction()

          const { blockhash } = await connection.getLatestBlockhash()
          tx.recentBlockhash = blockhash
          tx.feePayer = publicKey

          gatewayTransactionTracker.update(txId, { status: 'building' })

          const cluster = gateway.getCluster()
          if (!cluster) {
            throw new Error('Gateway is not supported on this cluster. Please switch to devnet or mainnet.')
          }

          const buildResponse = await buildGatewayTransaction(cluster, tx, gateway.getBuildOptions())

          toast.info('Signing optimized transaction...')
          gatewayTransactionTracker.update(txId, { status: 'signing' })

          const optimizedTxBuffer = Buffer.from(buildResponse.result.transaction, 'base64')
          const optimizedTx = Transaction.from(optimizedTxBuffer)

          if (!signTransaction) {
            throw new Error('Wallet does not support transaction signing')
          }

          const signedTx = await signTransaction(optimizedTx)
          const signedTxBase64 = Buffer.from(signedTx.serialize()).toString('base64')

          toast.info('Sending transaction via Gateway...')
          gatewayTransactionTracker.update(txId, { status: 'sending' })

          const sendResponse = await sendGatewayTransaction(cluster, signedTxBase64, { encoding: 'base64' })

          if (!sendResponse.result) {
            throw new Error('No signature returned from Gateway')
          }

          signature = sendResponse.result

          gatewayTransactionTracker.update(txId, { status: 'success', signature })
          toast.success('Transaction sent via Gateway!')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          gatewayTransactionTracker.update(txId, { status: 'failed', error: errorMessage })
          throw error
        }
      } else {
        // Fallback to standard RPC
        toast.info('Sending transaction via standard RPC...')
        signature = await program.methods
          .delistCoupon()
          .accounts({
            listing: listingPubkey,
            coupon: couponPubkey,
            seller: publicKey,
          } as any)
          .rpc()
      }

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
