'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Listing, CouponWithListing } from './marketplace-data-access'
import { LAMPORTS_PER_SOL, PublicKey, Keypair } from '@solana/web3.js'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// Platform wallet for receiving fees - replace with real wallet for production
const PLATFORM_WALLET = Keypair.generate().publicKey

export function MarketplaceListings({
  listings,
  onBuy,
  isLoading,
}: {
  listings: Listing[]
  onBuy: (listing: Listing) => void
  isLoading: boolean
}) {
  const formatSOL = (lamports: number) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(4)
  }

  if (listings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">No coupons listed for sale</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {listings.map((listing) => (
        <Card key={listing.publicKey.toString()}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Coupon NFT</CardTitle>
            <CardDescription className="text-xs truncate">
              {listing.coupon.toString().slice(0, 20)}...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-2xl font-bold">{formatSOL(listing.priceLamports.toNumber())} SOL</p>
              <p className="text-xs text-muted-foreground mt-1">
                Seller: {listing.seller.toString().slice(0, 8)}...
              </p>
            </div>
            <Button
              onClick={() => onBuy(listing)}
              disabled={isLoading}
              className="w-full"
            >
              Buy Coupon
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function UserCouponsManager({
  coupons,
  onList,
  onDelist,
  isLoading,
}: {
  coupons: CouponWithListing[]
  onList: (couponPubkey: PublicKey, price: number) => void
  onDelist: (listingPubkey: PublicKey, couponPubkey: PublicKey) => void
  isLoading: boolean
}) {
  const [listingPrices, setListingPrices] = useState<Record<string, string>>({})

  const handleList = (couponPubkey: PublicKey) => {
    const priceSOL = listingPrices[couponPubkey.toString()]
    if (!priceSOL || parseFloat(priceSOL) <= 0) {
      return
    }
    const priceLamports = parseFloat(priceSOL) * LAMPORTS_PER_SOL
    onList(couponPubkey, priceLamports)
    setListingPrices({ ...listingPrices, [couponPubkey.toString()]: '' })
  }

  if (coupons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">You don&apos;t own any coupons</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {coupons.map((coupon) => (
        <Card key={coupon.couponPublicKey.toString()}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {coupon.couponPublicKey.toString().slice(0, 20)}...
                  </p>
                  {coupon.listing && (
                    <Badge variant="secondary">Listed</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mint: {coupon.mint.toString().slice(0, 16)}...
                </p>
              </div>

              {coupon.listing ? (
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {(coupon.listing.priceLamports.toNumber() / LAMPORTS_PER_SOL).toFixed(4)} SOL
                    </p>
                    <p className="text-xs text-muted-foreground">Listed price</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelist(coupon.listing!.publicKey, coupon.couponPublicKey)}
                    disabled={isLoading}
                  >
                    Delist
                  </Button>
                </div>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">List for Sale</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>List Coupon for Sale</DialogTitle>
                      <DialogDescription>
                        Set a price for your coupon. Buyers will pay 2.5% platform fee.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor={`price-${coupon.couponPublicKey.toString()}`}>
                          Price (SOL)
                        </Label>
                        <Input
                          id={`price-${coupon.couponPublicKey.toString()}`}
                          type="number"
                          step="0.001"
                          min="0.001"
                          placeholder="0.05"
                          value={listingPrices[coupon.couponPublicKey.toString()] || ''}
                          onChange={(e) =>
                            setListingPrices({
                              ...listingPrices,
                              [coupon.couponPublicKey.toString()]: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="bg-muted p-3 rounded-md text-sm">
                        <p className="font-medium mb-1">Breakdown:</p>
                        <div className="space-y-1 text-muted-foreground">
                          <div className="flex justify-between">
                            <span>List price:</span>
                            <span>{listingPrices[coupon.couponPublicKey.toString()] || '0'} SOL</span>
                          </div>
                          <div className="flex justify-between">
                            <span>You receive (97.5%):</span>
                            <span>
                              {(parseFloat(listingPrices[coupon.couponPublicKey.toString()] || '0') * 0.975).toFixed(4)} SOL
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Platform fee (2.5%):</span>
                            <span>
                              {(parseFloat(listingPrices[coupon.couponPublicKey.toString()] || '0') * 0.025).toFixed(4)} SOL
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleList(coupon.couponPublicKey)}
                        disabled={
                          isLoading ||
                          !listingPrices[coupon.couponPublicKey.toString()] ||
                          parseFloat(listingPrices[coupon.couponPublicKey.toString()]) <= 0
                        }
                        className="w-full"
                      >
                        List Coupon
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export { PLATFORM_WALLET }
