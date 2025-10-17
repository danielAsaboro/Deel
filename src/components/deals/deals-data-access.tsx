'use client'

import { getBasicProgram, getBasicProgramId } from '@project/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { useGateway } from '../gateway/gateway-data-access'
import { buildGatewayTransaction, sendGatewayTransaction, gatewayTransactionTracker } from '@/lib/gateway'
import { toast } from 'sonner'
import { BN } from '@coral-xyz/anchor'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import { ExternalDealsResponse } from '@/types/external-deals'
import { generateCouponMetadata, uploadMetadataToIPFS } from '@/lib/metadata-upload'

export interface Deal {
  publicKey: PublicKey
  merchant: PublicKey
  title: string
  description: string
  discountPercent: number
  maxSupply: BN
  currentSupply: BN
  expiryTimestamp: BN
  category: string
  priceLamports: BN
  isActive: boolean
  totalRatings: BN
  ratingSum: BN
}

export interface DealRating {
  publicKey: PublicKey
  deal: PublicKey
  user: PublicKey
  rating: number
  createdAt: BN
}

export interface Comment {
  publicKey: PublicKey
  deal: PublicKey
  author: PublicKey
  content: string
  createdAt: BN
}

export function useDealsProgram() {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const gateway = useGateway()
  const programId = useMemo(() => getBasicProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getBasicProgram(provider, programId), [provider, programId])

  // Fetch all deals
  const deals = useQuery({
    queryKey: ['deals', 'all', { cluster }],
    queryFn: async () => {
      const deals = await program.account.deal.all()
      return deals.map((deal) => ({
        publicKey: deal.publicKey,
        ...deal.account,
      })) as Deal[]
    },
    enabled: !!program,
  })

  // Fetch deals by merchant
  const useDealsByMerchant = (merchant: PublicKey) => {
    return useQuery({
      queryKey: ['deals', 'merchant', merchant.toString(), { cluster }],
      queryFn: async () => {
        const deals = await program.account.deal.all([
          {
            memcmp: {
              offset: 8,
              bytes: merchant.toBase58(),
            },
          },
        ])
        return deals.map((deal) => ({
          publicKey: deal.publicKey,
          ...deal.account,
        })) as Deal[]
      },
      enabled: !!program && !!merchant,
    })
  }

  // Create a new deal
  const createDeal = useMutation({
    mutationKey: ['deals', 'create', { cluster }],
    mutationFn: async ({
      title,
      description,
      discountPercent,
      maxSupply,
      expiryTimestamp,
      category,
      priceLamports,
    }: {
      title: string
      description: string
      discountPercent: number
      maxSupply: number
      expiryTimestamp: number
      category: string
      priceLamports: number
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      let signature: string

      // Check if Gateway is enabled and configured
      if (gateway.isEnabled && gateway.apiKey) {
        const txId = `create-deal-${Date.now()}`

        try {
          // Track the transaction
          gatewayTransactionTracker.start(txId, {
            deliveryMethod: gateway.config.deliveryMethodType,
            cuPriceRange: gateway.config.cuPriceRange,
            jitoTipRange: gateway.config.jitoTipRange,
          })

          toast.info('Building transaction with Gateway...')

          // Build the transaction using Anchor
          const tx = await program.methods
            .createDeal(
              title,
              description,
              discountPercent,
              new BN(maxSupply),
              new BN(expiryTimestamp),
              category,
              new BN(priceLamports)
            )
            .accounts({
              merchant: publicKey,
            })
            .transaction()

          // Get recent blockhash (Gateway will replace this)
          const { blockhash } = await connection.getLatestBlockhash()
          tx.recentBlockhash = blockhash
          tx.feePayer = provider.publicKey

          gatewayTransactionTracker.update(txId, { status: 'building' })

          // Use Gateway to optimize the transaction
          const buildResponse = await buildGatewayTransaction(
            gateway.getCluster(),
            gateway.apiKey,
            tx,
            gateway.getBuildOptions()
          )

          toast.info('Signing optimized transaction...')
          gatewayTransactionTracker.update(txId, { status: 'signing' })

          // Decode and sign the optimized transaction
          const optimizedTxBuffer = Buffer.from(buildResponse.result.transaction, 'base64')
          const optimizedTx = Transaction.from(optimizedTxBuffer)

          if (!signTransaction) {
            throw new Error('Wallet does not support transaction signing')
          }

          const signedTx = await signTransaction(optimizedTx)
          const signedTxBase64 = Buffer.from(signedTx.serialize()).toString('base64')

          toast.info('Sending transaction via Gateway...')
          gatewayTransactionTracker.update(txId, { status: 'sending' })

          // Send through Gateway
          const sendResponse = await sendGatewayTransaction(
            gateway.getCluster(),
            gateway.apiKey,
            signedTxBase64,
            { encoding: 'base64' }
          )

          if (!sendResponse.result) {
            throw new Error('No signature returned from Gateway')
          }

          signature = sendResponse.result

          gatewayTransactionTracker.update(txId, {
            status: 'success',
            signature,
          })

          toast.success('Transaction sent via Gateway!')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          gatewayTransactionTracker.update(txId, {
            status: 'failed',
            error: errorMessage,
          })
          throw error
        }
      } else {
        // Fallback to standard RPC if Gateway is not enabled
        toast.info('Sending transaction via standard RPC...')
        signature = await program.methods
          .createDeal(
            title,
            description,
            discountPercent,
            new BN(maxSupply),
            new BN(expiryTimestamp),
            category,
            new BN(priceLamports)
          )
          .accounts({
            merchant: publicKey,
          })
          .rpc()
      }

      const [dealPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('deal'), publicKey.toBuffer(), Buffer.from(title)],
        program.programId
      )

      return { signature, dealPda }
    },
    onSuccess: ({ signature }) => {
      transactionToast(signature)
      deals.refetch()
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to create deal: ${errorMessage}`)
    },
  })

  // Update deal
  const updateDeal = useMutation({
    mutationKey: ['deals', 'update', { cluster }],
    mutationFn: async ({
      dealAddress,
      isActive,
      priceLamports,
    }: {
      dealAddress: PublicKey
      isActive?: boolean
      priceLamports?: number
    }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const signature = await program.methods
        .updateDeal(
          isActive !== undefined ? isActive : null,
          priceLamports !== undefined ? new BN(priceLamports) : null
        )
        .accountsPartial({
          deal: dealAddress,
          merchant: publicKey,
        })
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      deals.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to update deal: ${error}`)
    },
  })

  // Mint coupon
  const mintCoupon = useMutation({
    mutationKey: ['deals', 'mintCoupon', { cluster }],
    mutationFn: async ({ dealAddress }: { dealAddress: PublicKey }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      // Get the deal account to read current_supply
      const dealAccount = await program.account.deal.fetch(dealAddress)

      // Generate metadata and upload to IPFS
      const metadata = generateCouponMetadata(
        {
          title: dealAccount.title,
          description: dealAccount.description,
          discountPercent: dealAccount.discountPercent,
          merchant: dealAccount.merchant.toString(),
          expiryTimestamp: dealAccount.expiryTimestamp.toNumber(),
          category: dealAccount.category,
        },
        dealAccount.currentSupply.toNumber() + 1
      )

      const metadataUri = await uploadMetadataToIPFS(metadata)

      // Generate a new keypair for the NFT mint
      const mintKeypair = Keypair.generate()

      // Derive the coupon PDA
      const [couponPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('coupon'),
          dealAddress.toBuffer(),
          new BN(dealAccount.currentSupply).toArrayLike(Buffer, 'le', 8)
        ],
        program.programId
      )

      // Derive the associated token account for the user
      const userTokenAccount = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        publicKey
      )

      // Derive the metadata PDA (Metaplex standard)
      const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
        'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
      )
      const [metadataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer()
        ],
        TOKEN_METADATA_PROGRAM_ID
      )

      const signature = await program.methods
        .mintCoupon(dealAddress, metadataUri)
        .accountsPartial({
          deal: dealAddress,
          coupon: couponPda,
          mint: mintKeypair.publicKey,
          tokenAccount: userTokenAccount,
          metadata: metadataPda,
          merchant: dealAccount.merchant,
          user: publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        })
        .signers([mintKeypair])
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      deals.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to mint coupon: ${error}`)
    },
  })

  // Rate a deal
  const rateDeal = useMutation({
    mutationKey: ['deals', 'rate', { cluster }],
    mutationFn: async ({ dealAddress, rating }: { dealAddress: PublicKey; rating: number }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      // Derive the rating PDA
      const [ratingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('rating'), dealAddress.toBuffer(), publicKey.toBuffer()],
        program.programId
      )

      const signature = await program.methods
        .rateDeal(rating)
        .accountsPartial({
          deal: dealAddress,
          dealRating: ratingPda,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      deals.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to rate deal: ${error}`)
    },
  })

  // Add a comment
  const addComment = useMutation({
    mutationKey: ['deals', 'comment', { cluster }],
    mutationFn: async ({ dealAddress, content }: { dealAddress: PublicKey; content: string }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const timestamp = Math.floor(Date.now() / 1000)

      // Derive the comment PDA
      const [commentPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('comment'),
          dealAddress.toBuffer(),
          publicKey.toBuffer(),
          Buffer.from(timestamp.toString().slice(0, 8)), // Use first 8 chars of timestamp for uniqueness
        ],
        program.programId
      )

      const signature = await program.methods
        .addComment(new BN(timestamp), content)
        .accountsPartial({
          deal: dealAddress,
          comment: commentPda,
          author: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
    },
    onError: (error) => {
      toast.error(`Failed to add comment: ${error}`)
    },
  })

  // Fetch comments for a deal
  const useCommentsByDeal = (dealAddress: PublicKey) => {
    return useQuery({
      queryKey: ['comments', dealAddress.toString(), { cluster }],
      queryFn: async () => {
        const comments = await program.account.comment.all([
          {
            memcmp: {
              offset: 8,
              bytes: dealAddress.toBase58(),
            },
          },
        ])
        return comments.map((comment) => ({
          publicKey: comment.publicKey,
          ...comment.account,
        })) as Comment[]
      },
      enabled: !!program && !!dealAddress,
    })
  }

  // List coupon for sale
  const listCoupon = useMutation({
    mutationKey: ['coupons', 'list', { cluster }],
    mutationFn: async ({ couponAddress, priceLamports }: { couponAddress: PublicKey; priceLamports: number }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      // Derive the listing PDA
      const [listingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), couponAddress.toBuffer()],
        program.programId
      )

      const signature = await program.methods
        .listCoupon(new BN(priceLamports))
        .accountsPartial({
          coupon: couponAddress,
          listing: listingPda,
          seller: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      toast.success('Coupon listed for sale!')
    },
    onError: (error) => {
      toast.error(`Failed to list coupon: ${error}`)
    },
  })

  // Buy a listed coupon
  const buyCoupon = useMutation({
    mutationKey: ['coupons', 'buy', { cluster }],
    mutationFn: async ({ listingAddress, platformWallet }: { listingAddress: PublicKey; platformWallet: PublicKey }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      // Fetch listing to get coupon and seller
      const listingAccount = await program.account.listing.fetch(listingAddress)

      const signature = await program.methods
        .buyCoupon()
        .accountsPartial({
          listing: listingAddress,
          coupon: listingAccount.coupon,
          seller: listingAccount.seller,
          buyer: publicKey,
          platformWallet: platformWallet,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      toast.success('Coupon purchased successfully!')
    },
    onError: (error) => {
      toast.error(`Failed to buy coupon: ${error}`)
    },
  })

  // Delist a coupon
  const delistCoupon = useMutation({
    mutationKey: ['coupons', 'delist', { cluster }],
    mutationFn: async ({ listingAddress, couponAddress }: { listingAddress: PublicKey; couponAddress: PublicKey }) => {
      if (!publicKey) throw new Error('Wallet not connected')

      const signature = await program.methods
        .delistCoupon()
        .accountsPartial({
          listing: listingAddress,
          coupon: couponAddress,
          seller: publicKey,
        })
        .rpc()

      return signature
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      toast.success('Coupon delisted!')
    },
    onError: (error) => {
      toast.error(`Failed to delist coupon: ${error}`)
    },
  })

  // Fetch all active listings
  const useActiveListings = () => {
    return useQuery({
      queryKey: ['listings', 'active', { cluster }],
      queryFn: async () => {
        const listings = await program.account.listing.all([
          {
            memcmp: {
              offset: 8 + 32 + 32, // Skip coupon and seller pubkeys
              bytes: Buffer.from([1]).toString('base64'), // is_active = true
            },
          },
        ])
        return listings.map((listing) => ({
          publicKey: listing.publicKey,
          ...listing.account,
        }))
      },
      enabled: !!program,
    })
  }

  return {
    program,
    programId,
    deals,
    useDealsByMerchant,
    createDeal,
    updateDeal,
    mintCoupon,
    rateDeal,
    addComment,
    useCommentsByDeal,
    listCoupon,
    buyCoupon,
    delistCoupon,
    useActiveListings,
  }
}

// Hook for fetching external deals from aggregator API
export function useExternalDeals(category?: 'flights' | 'hotels' | 'shopping' | 'restaurants') {
  return useQuery({
    queryKey: ['external-deals', category],
    queryFn: async () => {
      const url = category
        ? `/api/external-deals?category=${category}`
        : '/api/external-deals'

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch external deals')
      }

      const data: ExternalDealsResponse = await response.json()
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}
