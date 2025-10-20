'use client'

import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { useDealsProgram } from '../deals/deals-data-access'
import { useCouponsProgram } from '../coupons/coupons-data-access'

export interface MarketplaceSale {
  listingPublicKey: PublicKey
  couponPublicKey: PublicKey
  priceLamports: BN
  soldAt: BN
}

export interface MerchantAnalytics {
  totalDeals: number
  activeDeals: number
  totalCouponsMinted: number
  totalRevenue: BN
  averageRating: number
  totalRedemptions: number
  redemptionRate: number
  totalCustomers: number
  dealPerformance: DealPerformance[]
  // Marketplace metrics
  marketplaceSales: number
  marketplaceRevenue: BN
  marketplaceFees: BN
  marketplaceNetEarnings: BN
  recentMarketplaceSales: MarketplaceSale[]
}

export interface DealPerformance {
  dealPublicKey: PublicKey
  dealTitle: string
  couponsMinted: number
  revenue: BN
  redemptions: number
  redemptionRate: number
  averageRating: number
  totalRatings: number
  totalComments: number
}

export function useAnalyticsProgram() {
  const dealsProgram = useDealsProgram()
  const couponsProgram = useCouponsProgram()

  // Fetch analytics for a specific merchant
  const useMerchantAnalytics = (merchantPubkey: PublicKey | null) => {
    return useQuery({
      queryKey: ['analytics', 'merchant', merchantPubkey?.toString()],
      queryFn: async (): Promise<MerchantAnalytics> => {
        if (!merchantPubkey) throw new Error('No merchant pubkey provided')

        // Fetch all deals by this merchant
        const merchantDeals = await dealsProgram.program.account.deal.all([
          {
            memcmp: {
              offset: 8, // After discriminator
              bytes: merchantPubkey.toBase58(),
            },
          },
        ])

        // Fetch marketplace sales for this merchant (independent of deals)
        const allSales = await dealsProgram.program.account.sale.all([
          {
            memcmp: {
              offset: 8 + 32 + 32, // Skip discriminator + listing + coupon pubkeys
              bytes: merchantPubkey.toBase58(),
            },
          },
        ])

        let marketplaceRevenue = new BN(0)
        const recentMarketplaceSales: MarketplaceSale[] = []

        allSales.forEach((sale) => {
          const price = new BN(sale.account.priceLamports)
          marketplaceRevenue = marketplaceRevenue.add(price)

          recentMarketplaceSales.push({
            listingPublicKey: sale.account.listing,
            couponPublicKey: sale.account.coupon,
            priceLamports: price,
            soldAt: new BN(sale.account.soldAt),
          })
        })

        recentMarketplaceSales.sort((a, b) => b.soldAt.toNumber() - a.soldAt.toNumber())

        // Calculate platform fee (2.5%) and net earnings (97.5%)
        const marketplaceFees = marketplaceRevenue.mul(new BN(25)).div(new BN(1000))
        const marketplaceNetEarnings = marketplaceRevenue.sub(marketplaceFees)

        if (merchantDeals.length === 0) {
          return {
            totalDeals: 0,
            activeDeals: 0,
            totalCouponsMinted: 0,
            totalRevenue: new BN(0),
            averageRating: 0,
            totalRedemptions: 0,
            redemptionRate: 0,
            totalCustomers: 0,
            dealPerformance: [],
            marketplaceSales: recentMarketplaceSales.length,
            marketplaceRevenue,
            marketplaceFees,
            marketplaceNetEarnings,
            recentMarketplaceSales: recentMarketplaceSales.slice(0, 10), // Show last 10 sales
          }
        }

        // Aggregate metrics
        let totalCouponsMinted = 0
        let totalRevenue = new BN(0)
        let totalRatings = 0
        let ratingSum = 0
        let totalRedemptions = 0
        let activeDeals = 0
        const uniqueCustomers = new Set<string>()

        const dealPerformance: DealPerformance[] = []

        // Process each deal
        for (const dealData of merchantDeals) {
          const deal = dealData.account
          const dealPubkey = dealData.publicKey

          if (deal.isActive) {
            activeDeals++
          }

          // Get coupons for this deal
          const coupons = await couponsProgram.program.account.coupon.all([
            {
              memcmp: {
                offset: 8, // After discriminator
                bytes: dealPubkey.toBase58(),
              },
            },
          ])

          const couponsMinted = coupons.length
          totalCouponsMinted += couponsMinted

          // Calculate revenue for this deal
          const dealRevenue = deal.priceLamports.mul(new BN(couponsMinted))
          totalRevenue = totalRevenue.add(dealRevenue)

          // Count redemptions
          const redemptions = coupons.filter((c) => c.account.isRedeemed).length
          totalRedemptions += redemptions

          // Track unique customers
          coupons.forEach((c) => {
            uniqueCustomers.add(c.account.owner.toString())
          })

          // Get ratings
          const ratings = await dealsProgram.program.account.dealRating.all([
            {
              memcmp: {
                offset: 8,
                bytes: dealPubkey.toBase58(),
              },
            },
          ])

          const dealTotalRatings = ratings.length
          totalRatings += dealTotalRatings

          const dealRatingSum = ratings.reduce((sum, r) => sum + r.account.rating, 0)
          ratingSum += dealRatingSum

          // Get comments
          const comments = await dealsProgram.program.account.comment.all([
            {
              memcmp: {
                offset: 8,
                bytes: dealPubkey.toBase58(),
              },
            },
          ])

          // Calculate deal-specific metrics
          const dealAvgRating =
            dealTotalRatings > 0 ? dealRatingSum / dealTotalRatings : 0
          const dealRedemptionRate =
            couponsMinted > 0 ? (redemptions / couponsMinted) * 100 : 0

          dealPerformance.push({
            dealPublicKey: dealPubkey,
            dealTitle: deal.title,
            couponsMinted,
            revenue: dealRevenue,
            redemptions,
            redemptionRate: dealRedemptionRate,
            averageRating: dealAvgRating,
            totalRatings: dealTotalRatings,
            totalComments: comments.length,
          })
        }

        // Calculate overall averages
        const averageRating = totalRatings > 0 ? ratingSum / totalRatings : 0
        const redemptionRate =
          totalCouponsMinted > 0 ? (totalRedemptions / totalCouponsMinted) * 100 : 0

        return {
          totalDeals: merchantDeals.length,
          activeDeals,
          totalCouponsMinted,
          totalRevenue,
          averageRating,
          totalRedemptions,
          redemptionRate,
          totalCustomers: uniqueCustomers.size,
          dealPerformance: dealPerformance.sort((a, b) => b.couponsMinted - a.couponsMinted),
          marketplaceSales: recentMarketplaceSales.length,
          marketplaceRevenue,
          marketplaceFees,
          marketplaceNetEarnings,
          recentMarketplaceSales: recentMarketplaceSales.slice(0, 10), // Show last 10 sales
        }
      },
      enabled: !!merchantPubkey && !!dealsProgram?.program && !!couponsProgram?.program,
    })
  }

  return {
    useMerchantAnalytics,
  }
}
