'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useCouponsProgram, Coupon } from './coupons-data-access'
import { useDealsProgram, Deal } from '../deals/deals-data-access'
import { useSaleHistory } from '../marketplace/sale-history-data-access'
import { useMarketplaceProgram } from '../marketplace/marketplace-data-access'
import { CouponSaleHistory } from '../marketplace/sale-history-ui'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import QRCode from 'qrcode'
import { Gift, QrCode, Ticket, History, DollarSign, ExternalLink } from 'lucide-react'
import { useUsdcPrice } from '@/hooks/use-usdc-price'
import { useConnection } from '@solana/wallet-adapter-react'

export function CouponCard({ coupon, deal }: { coupon: Coupon; deal?: Deal }) {
  const { transferCoupon, generateRedemptionQR } = useCouponsProgram()
  const { useCouponSales } = useSaleHistory()
  const { listCoupon, userCoupons: marketplaceCoupons } = useMarketplaceProgram()
  const { usdcToBaseUnits, baseUnitsToUsdc } = useUsdcPrice()
  const couponSales = useCouponSales(coupon.publicKey)

  const [showQR, setShowQR] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showListDialog, setShowListDialog] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [transferAddress, setTransferAddress] = useState('')
  const [listingPrice, setListingPrice] = useState('')

  const mintedDate = new Date(coupon.mintedAt.toNumber() * 1000)
  const redeemedDate = coupon.redeemedAt ? new Date(coupon.redeemedAt.toNumber() * 1000) : null
  const hasSaleHistory = couponSales.data && couponSales.data.length > 0

  // Check if this coupon is currently listed
  const couponWithListing = marketplaceCoupons.data?.find(
    (c) => c.couponPublicKey.toString() === coupon.publicKey.toString()
  )
  const isListed = couponWithListing?.listing !== null && couponWithListing?.listing !== undefined

  useEffect(() => {
    if (showQR) {
      const qrData = generateRedemptionQR(coupon)
      QRCode.toDataURL(qrData, { width: 300 }).then(setQrDataUrl)
    }
  }, [showQR, coupon, generateRedemptionQR])

  const handleTransfer = async () => {
    try {
      const newOwner = new PublicKey(transferAddress)
      await transferCoupon.mutateAsync({
        couponAddress: coupon.publicKey,
        newOwner,
      })
      setShowTransfer(false)
      setTransferAddress('')
    } catch (error) {
      console.error('Transfer error:', error)
    }
  }

  const handleListOnMarketplace = async () => {
    if (!listingPrice || parseFloat(listingPrice) <= 0) return

    const priceLamports = usdcToBaseUnits(parseFloat(listingPrice))
    await listCoupon.mutateAsync({
      couponPubkey: coupon.publicKey,
      priceLamports,
    })
    setShowListDialog(false)
    setListingPrice('')
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                <CardTitle className="text-lg">
                  {deal?.title || 'Coupon'}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Minted {mintedDate.toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex gap-1">
              {coupon.staked && (
                <Badge variant="outline" className="bg-primary/10">
                  Staked
                </Badge>
              )}
              {isListed && !coupon.isRedeemed && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  Listed for Sale
                </Badge>
              )}
              <Badge variant={coupon.isRedeemed ? 'secondary' : 'default'}>
                {coupon.isRedeemed ? 'Redeemed' : 'Active'}
              </Badge>
            </div>
          </div>
        </CardHeader>

        {deal && (
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground line-clamp-2">{deal.description}</p>
            <div className="flex items-center gap-2 text-sm font-bold text-green-500">
              <span>{deal.discountPercent}% OFF</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{deal.category}</span>
            </div>
            {coupon.isRedeemed && redeemedDate && (
              <p className="text-xs text-muted-foreground">
                Redeemed on {redeemedDate.toLocaleDateString()}
              </p>
            )}
          </CardContent>
        )}

        <CardFooter className="gap-2 flex-col items-start">
          {!coupon.isRedeemed && (
            <>
              <div className="flex gap-2 w-full">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowQR(true)}
                  disabled={!!coupon.staked || isListed}
                  className="flex-1"
                >
                  <QrCode className="h-4 w-4 mr-1" />
                  Show QR
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTransfer(true)}
                  disabled={!!coupon.staked || isListed}
                  className="flex-1"
                >
                  <Gift className="h-4 w-4 mr-1" />
                  Transfer
                </Button>
              </div>
              <div className="flex gap-2 w-full">
                {!isListed ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setShowListDialog(true)}
                    disabled={!!coupon.staked}
                    className="flex-1"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    List on Marketplace
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = '/marketplace'}
                    className="flex-1"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    View Listing
                  </Button>
                )}
              </div>
              {coupon.staked && (
                <p className="text-xs text-muted-foreground">
                  Unstake this coupon from the Staking page to transfer, list, or redeem it
                </p>
              )}
              {isListed && (
                <p className="text-xs text-muted-foreground">
                  This coupon is listed for sale. Delist it from the Marketplace to transfer or redeem it
                </p>
              )}
            </>
          )}
          {hasSaleHistory && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowHistory(true)}
              className="w-full"
            >
              <History className="h-4 w-4 mr-1" />
              View Sale History ({couponSales.data.length})
            </Button>
          )}
          
          {/* NFT Marketplace Links */}
          <div className="w-full pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">View on NFT Marketplaces:</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const magicEdenUrl = `https://magiceden.io/item-details/${coupon.mint.toString()}`
                  window.open(magicEdenUrl, '_blank')
                }}
                className="flex-1 text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Magic Eden
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const tensorUrl = `https://www.tensor.trade/item/${coupon.mint.toString()}`
                  window.open(tensorUrl, '_blank')
                }}
                className="flex-1 text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Tensor
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redemption QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Show this QR code to the merchant to redeem your coupon
            </p>
            {qrDataUrl && (
              <div className="bg-white p-4 rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Redemption QR Code" className="w-full" />
              </div>
            )}
            <div className="text-xs text-muted-foreground break-all">
              Coupon: {coupon.publicKey.toString().slice(0, 8)}...
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Recipient Address</Label>
              <Input
                id="address"
                value={transferAddress}
                onChange={(e) => setTransferAddress(e.target.value)}
                placeholder="Enter Solana wallet address"
              />
            </div>
            <Button
              onClick={handleTransfer}
              disabled={transferCoupon.isPending || !transferAddress}
              className="w-full"
            >
              {transferCoupon.isPending ? 'Transferring...' : 'Transfer Coupon'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale History</DialogTitle>
          </DialogHeader>
          {couponSales.isLoading && (
            <div className="py-8 text-center text-muted-foreground">Loading sale history...</div>
          )}
          {couponSales.isError && (
            <div className="py-8 text-center text-destructive">
              Failed to load sale history: {couponSales.error?.message}
            </div>
          )}
          {couponSales.data && <CouponSaleHistory sales={couponSales.data} />}
        </DialogContent>
      </Dialog>

      <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>List Coupon for Sale</DialogTitle>
            <DialogDescription>
              Set a price for your coupon on the secondary marketplace. Buyers will pay 2.5% platform fee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="listing-price">Price (USDC)</Label>
              <Input
                id="listing-price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="10.00"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
              />
            </div>
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Breakdown:</p>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>List price:</span>
                  <span>${listingPrice || '0'} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>You receive (97.5%):</span>
                  <span>
                    ${(parseFloat(listingPrice || '0') * 0.975).toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform fee (2.5%):</span>
                  <span>
                    ${(parseFloat(listingPrice || '0') * 0.025).toFixed(2)} USDC
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={handleListOnMarketplace}
              disabled={listCoupon.isPending || !listingPrice || parseFloat(listingPrice) <= 0}
              className="w-full"
            >
              {listCoupon.isPending ? 'Listing...' : 'List Coupon'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function MyCoupons() {
  const { publicKey } = useWallet()
  const { userCoupons } = useCouponsProgram()
  const { deals } = useDealsProgram()

  const getDealForCoupon = (coupon: Coupon): Deal | undefined => {
    return deals.data?.find((deal) => deal.publicKey.equals(coupon.deal))
  }

  if (!publicKey) {
    return <div>Connect your wallet to view your coupons</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Coupons</h2>
        <p className="text-muted-foreground">
          View and manage your NFT coupons. Show the QR code to merchants for redemption.
        </p>
      </div>

      {userCoupons.isLoading ? (
        <div className="text-center py-8">Loading your coupons...</div>
      ) : userCoupons.data && userCoupons.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userCoupons.data.map((coupon) => (
            <CouponCard
              key={coupon.publicKey.toString()}
              coupon={coupon}
              deal={getDealForCoupon(coupon)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">You don&apos;t have any coupons yet</p>
          <Button onClick={() => (window.location.href = '/deals')}>
            Browse Deals
          </Button>
        </div>
      )}
    </div>
  )
}

export function MerchantScanner() {
  const { publicKey } = useWallet()
  const { redeemCoupon } = useCouponsProgram()
  const [couponData, setCouponData] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleRedeem = async () => {
    if (!publicKey || !couponData) return

    setIsProcessing(true)
    try {
      const data = JSON.parse(couponData)
      const couponAddress = new PublicKey(data.coupon)
      const dealAddress = new PublicKey(data.deal)

      await redeemCoupon.mutateAsync({
        couponAddress,
        dealAddress,
      })

      setCouponData('')
    } catch (error) {
      console.error('Redemption error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!publicKey) {
    return <div>Connect your wallet to scan and redeem coupons</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Redeem Coupons</h2>
        <p className="text-muted-foreground">
          Scan customer QR codes to redeem their coupons
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manual Entry</CardTitle>
          <CardDescription>
            Paste the QR code data or manually enter coupon details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="couponData">QR Code Data</Label>
            <Input
              id="couponData"
              value={couponData}
              onChange={(e) => setCouponData(e.target.value)}
              placeholder='{"coupon":"...","deal":"..."}'
            />
          </div>
          <Button
            onClick={handleRedeem}
            disabled={isProcessing || !couponData}
            className="w-full"
          >
            {isProcessing ? 'Redeeming...' : 'Redeem Coupon'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
