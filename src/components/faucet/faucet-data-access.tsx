'use client'

import { PublicKey } from '@solana/web3.js'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getAssociatedTokenAddressSync,
  getAccount,
} from '@solana/spl-token'

// Mock USDC mint address
const MOCK_USDC_MINT = new PublicKey('HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp')
const USDC_DECIMALS = 6
const FAUCET_AMOUNT = 1000 // 1000 USDC

export function useFaucet() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()

  // Query current USDC balance
  const usdcBalance = useQuery({
    queryKey: ['usdc-balance', publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey) return 0

      try {
        const userUsdcAccount = getAssociatedTokenAddressSync(MOCK_USDC_MINT, publicKey)
        const account = await getAccount(connection, userUsdcAccount)
        return Number(account.amount) / 10 ** USDC_DECIMALS
      } catch (error) {
        // Account doesn't exist yet
        return 0
      }
    },
    enabled: !!publicKey,
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  // Mint USDC to user
  const mintUsdc = useMutation({
    mutationFn: async () => {
      if (!publicKey) throw new Error('Wallet not connected')

      // Call the server-side API to get a partially signed transaction
      const response = await fetch('/api/faucet/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPublicKey: publicKey.toString(),
          connectionUrl: connection.rpcEndpoint,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create mint transaction')
      }

      const { signature } = await response.json()

      await connection.confirmTransaction(signature, 'confirmed')

      return signature
    },
    onSuccess: (signature) => {
      toast.success(`Successfully minted ${FAUCET_AMOUNT} USDC!`, {
        description: `Transaction: ${signature.slice(0, 8)}...`,
      })
      usdcBalance.refetch()
    },
    onError: (error: any) => {
      toast.error('Failed to mint USDC', {
        description: error.message,
      })
    },
  })

  return {
    usdcBalance: usdcBalance.data ?? 0,
    isLoadingBalance: usdcBalance.isLoading,
    mintUsdc,
  }
}
