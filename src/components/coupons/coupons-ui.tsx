'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useCouponsProgram, Coupon } from './coupons-data-access'
import { useDealsProgram, Deal } from '../deals/deals-data-access'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import QRCode from 'qrcode'
import { Gift, QrCode, Ticket } from 'lucide-react'

export function CouponCard({ coupon, deal }: { coupon: Coupon; deal?: Deal }) {
  const { transferCoupon, generateRedemptionQR } = useCouponsProgram()
  const [showQR, setShowQR] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [transferAddress, setTransferAddress] = useState('')

  const mintedDate = new Date(coupon.mintedAt.toNumber() * 1000)
  const redeemedDate = coupon.redeemedAt ? new Date(coupon.redeemedAt.toNumber() * 1000) : null

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
            <Badge variant={coupon.isRedeemed ? 'secondary' : 'default'}>
              {coupon.isRedeemed ? 'Redeemed' : 'Active'}
            </Badge>
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

        <CardFooter className="gap-2">
          {!coupon.isRedeemed && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowQR(true)}>
                <QrCode className="h-4 w-4 mr-1" />
                Show QR
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowTransfer(true)}>
                <Gift className="h-4 w-4 mr-1" />
                Transfer
              </Button>
            </>
          )}
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
