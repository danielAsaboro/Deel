'use client'

import { getBasicProgram, getBasicProgramId } from '@project/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey, Transaction } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { useGateway } from '../gateway/gateway-data-access'
import { buildGatewayTransaction, sendGatewayTransaction, gatewayTransactionTracker } from '@/lib/gateway'
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
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const gateway = useGateway()
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

      let signature: string

      // Check if Gateway is enabled and configured
      if (gateway.isEnabled && gateway.apiKey) {
        const txId = `redeem-coupon-${Date.now()}`

        try {
          gatewayTransactionTracker.start(txId, {
            deliveryMethod: gateway.config.deliveryMethodType,
            cuPriceRange: gateway.config.cuPriceRange,
            jitoTipRange: gateway.config.jitoTipRange,
          })

          toast.info('Building transaction with Gateway...')

          const tx = await program.methods
            .redeemCoupon()
            .accounts({
              coupon: couponAddress,
              deal: dealAddress,
              merchant: publicKey,
            })
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
          .redeemCoupon()
          .accounts({
            coupon: couponAddress,
            deal: dealAddress,
            merchant: publicKey,
          })
          .rpc()
      }

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

      let signature: string

      // Check if Gateway is enabled and configured
      if (gateway.isEnabled && gateway.apiKey) {
        const txId = `transfer-coupon-${Date.now()}`

        try {
          gatewayTransactionTracker.start(txId, {
            deliveryMethod: gateway.config.deliveryMethodType,
            cuPriceRange: gateway.config.cuPriceRange,
            jitoTipRange: gateway.config.jitoTipRange,
          })

          toast.info('Building transaction with Gateway...')

          const tx = await program.methods
            .transferCoupon()
            .accounts({
              coupon: couponAddress,
              currentOwner: publicKey,
              newOwner: newOwner,
            })
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
          .transferCoupon()
          .accounts({
            coupon: couponAddress,
            currentOwner: publicKey,
            newOwner: newOwner,
          })
          .rpc()
      }

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
