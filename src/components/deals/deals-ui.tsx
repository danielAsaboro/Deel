'use client'

import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { useDealsProgram, Deal } from './deals-data-access'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { useWallet } from '@solana/wallet-adapter-react'
import { Badge } from '../ui/badge'
import { Calendar, Tag, TrendingDown, Package } from 'lucide-react'

export function DealsCreate() {
  const { createDeal } = useDealsProgram()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discountPercent, setDiscountPercent] = useState(10)
  const [maxSupply, setMaxSupply] = useState(100)
  const [category, setCategory] = useState('')
  const [priceLamports, setPriceLamports] = useState(1000000)
  const [expiryDays, setExpiryDays] = useState(30)

  const handleSubmit = () => {
    const expiryTimestamp = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60
    createDeal.mutateAsync({
      title,
      description,
      discountPercent,
      maxSupply,
      expiryTimestamp,
      category,
      priceLamports,
    })
    setIsOpen(false)
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Create New Deal</Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create a New Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="50% Off Pizza"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Get half off any large pizza"
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Food & Dining"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount">Discount %</Label>
              <Input
                id="discount"
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                min="1"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="supply">Max Supply</Label>
              <Input
                id="supply"
                type="number"
                value={maxSupply}
                onChange={(e) => setMaxSupply(Number(e.target.value))}
                min="1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (lamports)</Label>
              <Input
                id="price"
                type="number"
                value={priceLamports}
                onChange={(e) => setPriceLamports(Number(e.target.value))}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="expiry">Expires in (days)</Label>
              <Input
                id="expiry"
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                min="1"
              />
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={createDeal.isPending || !title || !description}
            className="w-full"
          >
            {createDeal.isPending ? 'Creating...' : 'Create Deal'}
          </Button>
        </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function DealCard({ deal }: { deal: Deal }) {
  const { mintCoupon, updateDeal } = useDealsProgram()
  const { publicKey } = useWallet()
  const isMerchant = publicKey && deal.merchant.equals(publicKey)

  const expiryDate = new Date(deal.expiryTimestamp.toNumber() * 1000)
  const isExpired = expiryDate < new Date()
  const supplyPercent = (deal.currentSupply.toNumber() / deal.maxSupply.toNumber()) * 100

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{deal.title}</CardTitle>
            <CardDescription className="line-clamp-2">{deal.description}</CardDescription>
          </div>
          <Badge variant={deal.isActive ? 'default' : 'secondary'}>
            {deal.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-green-500" />
            <span className="font-bold text-green-500">{deal.discountPercent}% OFF</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Tag className="h-4 w-4" />
            <span>{deal.category}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <Package className="h-4 w-4" />
            <span>
              {deal.currentSupply.toString()}/{deal.maxSupply.toString()} claimed
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span className={isExpired ? 'text-red-500' : ''}>
              {isExpired ? 'Expired' : `Expires ${expiryDate.toLocaleDateString()}`}
            </span>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(supplyPercent, 100)}%` }}
          />
        </div>

        <div className="text-sm font-medium">
          Price: {(deal.priceLamports.toNumber() / 1e9).toFixed(4)} SOL
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        {isMerchant ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updateDeal.mutateAsync({
                  dealAddress: deal.publicKey,
                  isActive: !deal.isActive,
                })
              }
              disabled={updateDeal.isPending}
            >
              {deal.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => mintCoupon.mutateAsync({ dealAddress: deal.publicKey })}
            disabled={
              mintCoupon.isPending ||
              !deal.isActive ||
              isExpired ||
              deal.currentSupply.gte(deal.maxSupply)
            }
            className="w-full"
          >
            {mintCoupon.isPending ? 'Minting...' : 'Claim Coupon'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export function DealsList() {
  const { deals } = useDealsProgram()
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active')

  const filteredDeals = deals.data?.filter((deal) => {
    if (filter === 'active') {
      const isExpired = deal.expiryTimestamp.toNumber() * 1000 < Date.now()
      return deal.isActive && !isExpired
    }
    if (filter === 'expired') {
      return deal.expiryTimestamp.toNumber() * 1000 < Date.now()
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
          >
            Active
          </Button>
          <Button
            variant={filter === 'expired' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('expired')}
          >
            Expired
          </Button>
        </div>
      </div>

      {deals.isLoading ? (
        <div className="text-center py-8">Loading deals...</div>
      ) : filteredDeals && filteredDeals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDeals.map((deal) => (
            <DealCard key={deal.publicKey.toString()} deal={deal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No deals found</p>
        </div>
      )}
    </div>
  )
}

export function MerchantDashboard() {
  const { publicKey } = useWallet()
  const { useDealsByMerchant } = useDealsProgram()
  // Call the hook unconditionally
  const merchantDeals = useDealsByMerchant(publicKey || PublicKey.default)

  if (!publicKey) {
    return <div>Connect your wallet to view your merchant dashboard</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Deals</h2>
        <DealsCreate />
      </div>

      {merchantDeals?.isLoading ? (
        <div className="text-center py-8">Loading your deals...</div>
      ) : merchantDeals?.data && merchantDeals.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {merchantDeals.data.map((deal) => (
            <DealCard key={deal.publicKey.toString()} deal={deal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">You haven&apos;t created any deals yet</p>
          <DealsCreate />
        </div>
      )}
    </div>
  )
}
