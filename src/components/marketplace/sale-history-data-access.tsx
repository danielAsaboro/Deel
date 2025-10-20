'use client'

import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { useDealsProgram } from '../deals/deals-data-access'
import { useCluster } from '../cluster/cluster-data-access'

export interface Sale {
  publicKey: PublicKey
  listing: PublicKey
  coupon: PublicKey
  seller: PublicKey
  buyer: PublicKey
  priceLamports: BN
  soldAt: BN
}

export interface SaleWithMetadata extends Sale {
  dealPublicKey?: PublicKey
  dealTitle?: string
}

export function useSaleHistory() {
  const dealsProgram = useDealsProgram()
  const { cluster } = useCluster()

  // Fetch all sales (recent activity)
  const recentSales = useQuery({
    queryKey: ['sales', 'recent', { cluster }],
    queryFn: async (): Promise<Sale[]> => {
      const allSales = await dealsProgram.program.account.sale.all()

      // Sort by soldAt timestamp (most recent first)
      const sorted = allSales
        .map((sale) => ({
          publicKey: sale.publicKey,
          ...sale.account,
        }))
        .sort((a, b) => b.soldAt.toNumber() - a.soldAt.toNumber())

      return sorted as Sale[]
    },
    enabled: !!dealsProgram.program,
  })

  // Fetch sales by seller (for merchant analytics)
  const useSellerSales = (sellerPubkey: PublicKey | null) => {
    return useQuery({
      queryKey: ['sales', 'seller', sellerPubkey?.toString(), { cluster }],
      queryFn: async (): Promise<Sale[]> => {
        if (!sellerPubkey) return []

        const sellerSales = await dealsProgram.program.account.sale.all([
          {
            memcmp: {
              offset: 8 + 32 + 32, // Skip discriminator + listing + coupon pubkeys
              bytes: sellerPubkey.toBase58(),
            },
          },
        ])

        return sellerSales
          .map((sale) => ({
            publicKey: sale.publicKey,
            ...sale.account,
          }))
          .sort((a, b) => b.soldAt.toNumber() - a.soldAt.toNumber()) as Sale[]
      },
      enabled: !!dealsProgram.program && !!sellerPubkey,
    })
  }

  // Fetch sales by buyer (for purchase history)
  const useBuyerSales = (buyerPubkey: PublicKey | null) => {
    return useQuery({
      queryKey: ['sales', 'buyer', buyerPubkey?.toString(), { cluster }],
      queryFn: async (): Promise<Sale[]> => {
        if (!buyerPubkey) return []

        const buyerSales = await dealsProgram.program.account.sale.all([
          {
            memcmp: {
              offset: 8 + 32 + 32 + 32, // Skip discriminator + listing + coupon + seller pubkeys
              bytes: buyerPubkey.toBase58(),
            },
          },
        ])

        return buyerSales
          .map((sale) => ({
            publicKey: sale.publicKey,
            ...sale.account,
          }))
          .sort((a, b) => b.soldAt.toNumber() - a.soldAt.toNumber()) as Sale[]
      },
      enabled: !!dealsProgram.program && !!buyerPubkey,
    })
  }

  // Fetch sales for a specific coupon (sale history)
  const useCouponSales = (couponPubkey: PublicKey | null) => {
    return useQuery({
      queryKey: ['sales', 'coupon', couponPubkey?.toString(), { cluster }],
      queryFn: async (): Promise<Sale[]> => {
        if (!couponPubkey) return []

        const couponSales = await dealsProgram.program.account.sale.all([
          {
            memcmp: {
              offset: 8 + 32, // Skip discriminator + listing pubkey
              bytes: couponPubkey.toBase58(),
            },
          },
        ])

        return couponSales
          .map((sale) => ({
            publicKey: sale.publicKey,
            ...sale.account,
          }))
          .sort((a, b) => a.soldAt.toNumber() - b.soldAt.toNumber()) as Sale[] // Oldest first for history
      },
      enabled: !!dealsProgram.program && !!couponPubkey,
    })
  }

  // Calculate market statistics
  const marketStats = useQuery({
    queryKey: ['sales', 'stats', { cluster }],
    queryFn: async () => {
      const allSales = await dealsProgram.program.account.sale.all()
      const now = Date.now() / 1000
      const oneDayAgo = now - 86400
      const oneWeekAgo = now - 604800

      const sales24h = allSales.filter((s) => s.account.soldAt.toNumber() > oneDayAgo)
      const sales7d = allSales.filter((s) => s.account.soldAt.toNumber() > oneWeekAgo)

      const totalVolume = allSales.reduce(
        (sum, sale) => sum.add(new BN(sale.account.priceLamports)),
        new BN(0)
      )
      const volume24h = sales24h.reduce(
        (sum, sale) => sum.add(new BN(sale.account.priceLamports)),
        new BN(0)
      )
      const volume7d = sales7d.reduce(
        (sum, sale) => sum.add(new BN(sale.account.priceLamports)),
        new BN(0)
      )

      const avgPrice =
        allSales.length > 0
          ? totalVolume.div(new BN(allSales.length))
          : new BN(0)

      const sortedByPrice = [...allSales].sort((a, b) =>
        new BN(b.account.priceLamports).sub(new BN(a.account.priceLamports)).toNumber()
      )
      const highestSale = sortedByPrice[0]

      // Get unique buyers and sellers
      const uniqueBuyers = new Set(allSales.map((s) => s.account.buyer.toString()))
      const uniqueSellers = new Set(allSales.map((s) => s.account.seller.toString()))

      // Get unique traders (anyone who bought OR sold)
      const uniqueTraders = new Set([
        ...Array.from(uniqueBuyers),
        ...Array.from(uniqueSellers),
      ])

      return {
        totalSales: allSales.length,
        sales24h: sales24h.length,
        sales7d: sales7d.length,
        totalVolume,
        volume24h,
        volume7d,
        avgPrice,
        highestSale: highestSale
          ? {
              price: new BN(highestSale.account.priceLamports),
              soldAt: new BN(highestSale.account.soldAt),
            }
          : null,
        uniqueBuyers: uniqueBuyers.size,
        uniqueSellers: uniqueSellers.size,
        uniqueTraders: uniqueTraders.size,
      }
    },
    enabled: !!dealsProgram.program,
  })

  return {
    recentSales,
    useSellerSales,
    useBuyerSales,
    useCouponSales,
    marketStats,
  }
}
