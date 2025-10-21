'use client'

import { getBasicProgram, getBasicProgramId } from '@project/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  Cluster,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { useGateway } from '../gateway/gateway-data-access'
import { buildGatewayTransaction, sendGatewayTransaction, gatewayTransactionTracker } from '@/lib/gateway'
import { toast } from 'sonner'
import { BN } from '@coral-xyz/anchor'
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

// USDC mint address (configurable via environment variable)
// Devnet/Localnet: HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp
// Mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT || 'HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp'
)

export interface Listing {
  publicKey: PublicKey
  coupon: PublicKey
  seller: PublicKey
  priceLamports: BN
  isActive: boolean
  createdAt: BN
}

export interface ListingWithDeal extends Listing {
  dealTitle?: string
  dealDescription?: string
  discountPercent?: number
  dealCategory?: string
  expiryTimestamp?: BN
  merchant?: PublicKey
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
  const queryClient = useQueryClient()
  const programId = useMemo(() => getBasicProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getBasicProgram(provider, programId), [provider, programId])

  // Fetch all active listings with deal context
  const listings = useQuery({
    queryKey: ['listings', 'all', { cluster }],
    queryFn: async (): Promise<ListingWithDeal[]> => {
      const allListings = await program.account.listing.all()
      const activeListings = allListings.filter((l) => l.account.isActive)

      // Enrich each listing with deal information
      const listingsWithDeals = await Promise.all(
        activeListings.map(async (listing) => {
          try {
            // Fetch the coupon to get the deal reference
            const coupon = await program.account.coupon.fetch(listing.account.coupon)

            // Fetch the deal
            const deal = await program.account.deal.fetch(coupon.deal)

            return {
              publicKey: listing.publicKey,
              ...listing.account,
              dealTitle: deal.title,
              dealDescription: deal.description,
              discountPercent: deal.discountPercent,
              dealCategory: deal.category,
              expiryTimestamp: deal.expiryTimestamp,
              merchant: deal.merchant,
            } as ListingWithDeal
          } catch (error) {
            // If we can't fetch deal info, return listing without it
            return {
              publicKey: listing.publicKey,
              ...listing.account,
            } as ListingWithDeal
          }
        })
      )

      return listingsWithDeals
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
          let listing: Listing | null = null

          // Check for active listing (most recent one if it exists)
          if (coupon.account.listingCount > 0) {
            const mostRecentListingNumber = coupon.account.listingCount - 1
            const listingCountBuffer = Buffer.alloc(4)
            listingCountBuffer.writeUInt32LE(mostRecentListingNumber)

            const [listingPda] = PublicKey.findProgramAddressSync(
              [Buffer.from('listing'), coupon.publicKey.toBuffer(), listingCountBuffer],
              program.programId
            )

            try {
              const listingAccount = await program.account.listing.fetch(listingPda)
              if (listingAccount.isActive) {
                listing = {
                  publicKey: listingPda,
                  ...listingAccount,
                } as Listing
              }
            } catch {
              // Listing doesn't exist or was closed, that's okay
            }
          }

          // Check if coupon is staked
          const [stakedCouponPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('staked_coupon'), coupon.publicKey.toBuffer()],
            program.programId
          )

          let isStaked = false
          try {
            await program.account.stakedCoupon.fetch(stakedCouponPda)
            isStaked = true
          } catch {
            // Not staked, that's okay
          }

          return {
            couponPublicKey: coupon.publicKey,
            ...coupon.account,
            listing,
            isStaked,
          }
        })
      )

      // Filter out redeemed and staked coupons
      return couponsWithListings.filter((c) => !c.isRedeemed && !c.isStaked)
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

      // Fetch coupon to get the current listing_count
      const coupon = await program.account.coupon.fetch(couponPubkey)
      const listingCountBuffer = Buffer.alloc(4)
      listingCountBuffer.writeUInt32LE(coupon.listingCount)

      const [listingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), couponPubkey.toBuffer(), listingCountBuffer],
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
          toast.success('Coupon listed successfully!')
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
      // Invalidate all related queries for global state sync
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      toast.success('View your listing in the Marketplace tab!')
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

      // Fetch coupon to get the current sale_count
      const coupon = await program.account.coupon.fetch(couponPubkey)
      const saleCountBuffer = Buffer.alloc(4)
      saleCountBuffer.writeUInt32LE(coupon.saleCount)

      // Derive Sale PDA
      const [salePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('sale'), couponPubkey.toBuffer(), saleCountBuffer],
        program.programId
      )

      // Derive USDC token accounts for payment
      const buyerUsdcAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey)

      const sellerUsdcAccount = getAssociatedTokenAddressSync(USDC_MINT, sellerPubkey)

      const platformUsdcAccount = getAssociatedTokenAddressSync(
        USDC_MINT,
        platformWallet,
        true // allowOwnerOffCurve – platform wallet can be a PDA
      )

      const setupInstructions: TransactionInstruction[] = []

      const [buyerUsdcInfo, sellerUsdcInfo, platformUsdcInfo] = await Promise.all([
        connection.getAccountInfo(buyerUsdcAccount),
        connection.getAccountInfo(sellerUsdcAccount),
        connection.getAccountInfo(platformUsdcAccount),
      ])

      if (!buyerUsdcInfo) {
        setupInstructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            buyerUsdcAccount,
            publicKey,
            USDC_MINT,
            TOKEN_PROGRAM_ID
          )
        )
      }

      if (!sellerUsdcInfo) {
        setupInstructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            sellerUsdcAccount,
            sellerPubkey,
            USDC_MINT,
            TOKEN_PROGRAM_ID
          )
        )
      }

      if (!platformUsdcInfo) {
        setupInstructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            platformUsdcAccount,
            platformWallet,
            USDC_MINT,
            TOKEN_PROGRAM_ID
          )
        )
      }

      let methodBuilder = program.methods
        .buyCoupon()
        .accounts({
          listing: listingPubkey,
          coupon: couponPubkey,
          sale: salePda,
          buyerUsdcAccount,
          sellerUsdcAccount,
          platformUsdcAccount,
          seller: sellerPubkey,
          buyer: publicKey,
          platformWallet,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any)

      if (setupInstructions.length > 0) {
        methodBuilder = methodBuilder.preInstructions(setupInstructions)
      }

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

          const tx = await methodBuilder.transaction()

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
        signature = await methodBuilder.rpc()
      }

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      // Invalidate all related queries for global state sync
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast.success('Coupon purchased! Check "My Coupons" to see it.')
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
      // Invalidate all related queries for global state sync
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      toast.success('Coupon delisted successfully!')
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
