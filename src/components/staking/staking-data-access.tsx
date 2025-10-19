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
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const gateway = useGateway()
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

      let signature: string

      // Check if Gateway is enabled and configured
      if (gateway.isEnabled && gateway.apiKey) {
        const txId = `stake-coupon-${Date.now()}`

        try {
          gatewayTransactionTracker.start(txId, {
            deliveryMethod: gateway.config.deliveryMethodType,
            cuPriceRange: gateway.config.cuPriceRange,
            jitoTipRange: gateway.config.jitoTipRange,
          })

          toast.info('Building transaction with Gateway...')

          const tx = await program.methods
            .stakeCoupon()
            .accounts({
              coupon: couponPubkey,
              stakedCoupon: stakedCouponPda,
              rewardsPool: poolPda,
              staker: publicKey,
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
          .stakeCoupon()
          .accounts({
            coupon: couponPubkey,
            stakedCoupon: stakedCouponPda,
            rewardsPool: poolPda,
            staker: publicKey,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc()
      }

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

      let signature: string

      // Check if Gateway is enabled and configured
      if (gateway.isEnabled && gateway.apiKey) {
        const txId = `unstake-coupon-${Date.now()}`

        try {
          gatewayTransactionTracker.start(txId, {
            deliveryMethod: gateway.config.deliveryMethodType,
            cuPriceRange: gateway.config.cuPriceRange,
            jitoTipRange: gateway.config.jitoTipRange,
          })

          toast.info('Building transaction with Gateway...')

          const tx = await program.methods
            .unstakeCoupon()
            .accounts({
              stakedCoupon: stakedCouponPubkey,
              coupon: couponPubkey,
              rewardsPool: poolPda,
              staker: publicKey,
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
          .unstakeCoupon()
          .accounts({
            stakedCoupon: stakedCouponPubkey,
            coupon: couponPubkey,
            rewardsPool: poolPda,
            staker: publicKey,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc()
      }

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

      let signature: string

      // Check if Gateway is enabled and configured
      if (gateway.isEnabled && gateway.apiKey) {
        const txId = `claim-rewards-${Date.now()}`

        try {
          gatewayTransactionTracker.start(txId, {
            deliveryMethod: gateway.config.deliveryMethodType,
            cuPriceRange: gateway.config.cuPriceRange,
            jitoTipRange: gateway.config.jitoTipRange,
          })

          toast.info('Building transaction with Gateway...')

          const tx = await program.methods
            .claimRewards()
            .accounts({
              stakedCoupon: stakedCouponPubkey,
              rewardsPool: poolPda,
              staker: publicKey,
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
          .claimRewards()
          .accounts({
            stakedCoupon: stakedCouponPubkey,
            rewardsPool: poolPda,
            staker: publicKey,
            systemProgram: SystemProgram.programId,
          } as any)
          .rpc()
      }

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
