'use client'

import { getBasicProgram, getBasicProgramId } from '@project/anchor'
import { useWallet } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { BN } from '@coral-xyz/anchor'

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
}

export function useDealsProgram() {
  const { publicKey } = useWallet()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
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

      const signature = await program.methods
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
      toast.error(`Failed to create deal: ${error}`)
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

      // Note: This is a simplified version. The full implementation requires:
      // 1. Generating a new mint keypair
      // 2. Setting up token accounts properly
      // 3. Handling metadata creation with proper PDAs
      // For now, this will fail at runtime but demonstrates the structure
      const signature = await program.methods
        .mintCoupon(dealAddress)
        .accountsPartial({
          deal: dealAddress,
          user: publicKey,
        })
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

  return {
    program,
    programId,
    deals,
    useDealsByMerchant,
    createDeal,
    updateDeal,
    mintCoupon,
  }
}
