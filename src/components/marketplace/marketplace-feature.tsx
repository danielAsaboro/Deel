'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { WalletButton } from '../solana/solana-provider'
import { useMarketplaceProgram } from './marketplace-data-access'
import { MarketplaceListings, UserCouponsManager, PLATFORM_WALLET } from './marketplace-ui'
import { useSaleHistory } from './sale-history-data-access'
import { RecentSalesActivity, MarketStatistics, SaleHistoryLoading, SaleHistoryError } from './sale-history-ui'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function MarketplaceFeature() {
  const { publicKey } = useWallet()
  const marketplace = useMarketplaceProgram()
  const saleHistory = useSaleHistory()

  const handleBuy = async (listing: { publicKey: PublicKey; coupon: PublicKey; seller: PublicKey }) => {
    if (!publicKey) return

    await marketplace.buyCoupon.mutateAsync({
      listingPubkey: listing.publicKey,
      couponPubkey: listing.coupon,
      sellerPubkey: listing.seller,
      platformWallet: PLATFORM_WALLET,
    })
  }

  const handleList = async (couponPubkey: PublicKey, priceLamports: number) => {
    await marketplace.listCoupon.mutateAsync({
      couponPubkey,
      priceLamports,
    })
  }

  const handleDelist = async (listingPubkey: PublicKey, couponPubkey: PublicKey) => {
    await marketplace.delistCoupon.mutateAsync({
      listingPubkey,
      couponPubkey,
    })
  }

  if (!publicKey) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Secondary Marketplace</h1>
          <p className="text-muted-foreground">
            Buy and sell coupon NFTs on the secondary market
          </p>
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-sm">Connect your wallet to access the marketplace</p>
                <WalletButton />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Secondary Marketplace</h1>
          <p className="text-muted-foreground mt-2">
            Trade coupon NFTs with other users
          </p>
        </div>
        <WalletButton />
      </div>

      {/* Market Statistics */}
      {saleHistory.marketStats.isLoading && <SaleHistoryLoading />}
      {saleHistory.marketStats.isError && (
        <SaleHistoryError error={saleHistory.marketStats.error as Error} />
      )}
      {saleHistory.marketStats.data && (
        <MarketStatistics stats={saleHistory.marketStats.data} />
      )}

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="browse">Browse Listings</TabsTrigger>
          <TabsTrigger value="manage">Sell Coupons</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Available Listings</h2>
              {marketplace.listings.data && (
                <p className="text-muted-foreground">
                  {marketplace.listings.data.length} listings
                </p>
              )}
            </div>

            {marketplace.listings.isLoading && (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">Loading listings...</p>
                </CardContent>
              </Card>
            )}

            {marketplace.listings.isError && (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-destructive">
                    Failed to load listings: {marketplace.listings.error?.message}
                  </p>
                </CardContent>
              </Card>
            )}

            {marketplace.listings.data && (
              <MarketplaceListings
                listings={marketplace.listings.data}
                onBuy={handleBuy}
                isLoading={marketplace.buyCoupon.isPending}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="manage" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Manage Your Listings</h2>
              {marketplace.userCoupons.data && (
                <p className="text-muted-foreground">
                  {marketplace.userCoupons.data.filter(c => c.couponPublicKey).length} coupons available
                </p>
              )}
            </div>

            {marketplace.userCoupons.isLoading && (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">Loading your coupons...</p>
                </CardContent>
              </Card>
            )}

            {marketplace.userCoupons.isError && (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-destructive">
                    Failed to load coupons: {marketplace.userCoupons.error?.message}
                  </p>
                </CardContent>
              </Card>
            )}

            {marketplace.userCoupons.data && (
              <UserCouponsManager
                coupons={marketplace.userCoupons.data}
                onList={handleList}
                onDelist={handleDelist}
                isLoading={marketplace.listCoupon.isPending || marketplace.delistCoupon.isPending}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Recent Sales</h2>
              {saleHistory.recentSales.data && (
                <p className="text-muted-foreground">
                  {saleHistory.recentSales.data.length} total sales
                </p>
              )}
            </div>

            {saleHistory.recentSales.isLoading && <SaleHistoryLoading />}
            {saleHistory.recentSales.isError && (
              <SaleHistoryError error={saleHistory.recentSales.error as Error} />
            )}
            {saleHistory.recentSales.data && (
              <RecentSalesActivity sales={saleHistory.recentSales.data} limit={20} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
