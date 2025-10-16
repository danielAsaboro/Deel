'use client'

import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { useDealsProgram, Deal, useExternalDeals } from './deals-data-access'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { useWallet } from '@solana/wallet-adapter-react'
import { Badge } from '../ui/badge'
import { Calendar, Tag, TrendingDown, Package, ExternalLink, Globe, Star, MessageCircle, Share2 } from 'lucide-react'
import { ExternalDeal } from '@/types/external-deals'
import { Textarea } from '../ui/textarea'
import { toast } from 'sonner'

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

// Star rating component
function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (rating: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          disabled={readonly}
          className={readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}
        >
          <Star
            className={`h-4 w-4 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  )
}

export function DealCard({ deal }: { deal: Deal }) {
  const { mintCoupon, updateDeal, rateDeal, addComment, useCommentsByDeal } = useDealsProgram()
  const { publicKey } = useWallet()
  const isMerchant = publicKey && deal.merchant.equals(publicKey)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [userRating, setUserRating] = useState(0)

  const comments = useCommentsByDeal(deal.publicKey)

  const expiryDate = new Date(deal.expiryTimestamp.toNumber() * 1000)
  const isExpired = expiryDate < new Date()
  const supplyPercent = (deal.currentSupply.toNumber() / deal.maxSupply.toNumber()) * 100

  // Calculate average rating
  const averageRating = deal.totalRatings.toNumber() > 0
    ? deal.ratingSum.toNumber() / deal.totalRatings.toNumber()
    : 0

  const handleRate = async (rating: number) => {
    setUserRating(rating)
    await rateDeal.mutateAsync({ dealAddress: deal.publicKey, rating })
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    await addComment.mutateAsync({ dealAddress: deal.publicKey, content: newComment })
    setNewComment('')
    comments.refetch()
  }

  const handleShare = (platform: 'twitter' | 'copy') => {
    const url = `${window.location.origin}/deals/${deal.publicKey.toString()}`
    const text = `Check out this deal: ${deal.title} - ${deal.discountPercent}% OFF!`

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
    } else {
      navigator.clipboard.writeText(url)
      toast('Link copied to clipboard!')
    }
  }

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

        {/* Rating Section */}
        <div className="flex items-center justify-between border-y py-2">
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(averageRating)} readonly />
            <span className="text-sm text-muted-foreground">
              {averageRating > 0 ? `${averageRating.toFixed(1)} (${deal.totalRatings.toString()})` : 'No ratings yet'}
            </span>
          </div>
          {publicKey && !isMerchant && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rate:</span>
              <StarRating value={userRating} onChange={handleRate} />
            </div>
          )}
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

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">
            Price: {(deal.priceLamports.toNumber() / 1e9).toFixed(4)} SOL
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowComments(!showComments)}>
              <MessageCircle className="h-4 w-4 mr-1" />
              {comments.data?.length || 0}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleShare('twitter')}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="space-y-3 pt-3 border-t">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {comments.data?.map((comment) => (
                <div key={comment.publicKey.toString()} className="text-sm p-2 bg-secondary rounded">
                  <div className="font-medium text-xs text-muted-foreground mb-1">
                    {comment.author.toString().slice(0, 8)}... • {new Date(comment.createdAt.toNumber() * 1000).toLocaleDateString()}
                  </div>
                  <div>{comment.content}</div>
                </div>
              ))}
              {(!comments.data || comments.data.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-2">No comments yet</div>
              )}
            </div>
            {publicKey && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[60px]"
                  maxLength={500}
                />
                <Button size="sm" onClick={handleAddComment} disabled={addComment.isPending || !newComment.trim()}>
                  {addComment.isPending ? 'Posting...' : 'Post'}
                </Button>
              </div>
            )}
          </div>
        )}
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

// External Deal Card Component
export function ExternalDealCard({ deal }: { deal: ExternalDeal }) {
  const { createDeal } = useDealsProgram()
  const { publicKey } = useWallet()
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [maxSupply, setMaxSupply] = useState(100)
  const [expiryDays, setExpiryDays] = useState(30)
  const [priceLamports, setPriceLamports] = useState(100000000) // 0.1 SOL

  const handleImport = async () => {
    const expiryTimestamp = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60
    await createDeal.mutateAsync({
      title: deal.title,
      description: deal.description,
      discountPercent: deal.discountPercent,
      maxSupply,
      expiryTimestamp,
      category: deal.category,
      priceLamports,
    })
    setShowImportDialog(false)
    toast('Deal imported to blockchain successfully!')
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-lg line-clamp-1">{deal.title}</CardTitle>
              </div>
              <CardDescription className="line-clamp-2">{deal.description}</CardDescription>
            </div>
            <Badge variant="secondary">
              <ExternalLink className="h-3 w-3 mr-1" />
              {deal.source}
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
            <span className="capitalize">{deal.category}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="line-through text-muted-foreground">
              {deal.currency} {deal.originalPrice.toFixed(2)}
            </span>
            <span className="ml-2 font-bold text-lg">
              {deal.currency} {deal.discountedPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {deal.location && (
          <div className="text-sm text-muted-foreground">{deal.location}</div>
        )}

        {deal.imageUrl && (
          <div className="w-full h-32 bg-muted rounded-md overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={deal.imageUrl}
              alt={deal.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        {deal.externalUrl && (
          <Button size="sm" variant="outline" asChild className="flex-1">
            <a href={deal.externalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              View Deal
            </a>
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={() => setShowImportDialog(true)}
          disabled={!publicKey}
        >
          Import to Blockchain
        </Button>
      </CardFooter>
    </Card>

    {/* Import Dialog */}
    <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Deal to Blockchain</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Convert this external deal into an on-chain NFT coupon deal. Customize parameters below:
          </div>
          <div>
            <Label htmlFor="supply">Max NFT Supply</Label>
            <Input
              id="supply"
              type="number"
              value={maxSupply}
              onChange={(e) => setMaxSupply(Number(e.target.value))}
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="price">Coupon Price (lamports)</Label>
            <Input
              id="price"
              type="number"
              value={priceLamports}
              onChange={(e) => setPriceLamports(Number(e.target.value))}
              min="0"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {(priceLamports / 1e9).toFixed(4)} SOL
            </div>
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
          <Button
            onClick={handleImport}
            disabled={createDeal.isPending}
            className="w-full"
          >
            {createDeal.isPending ? 'Importing...' : 'Import to Blockchain'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

export function DealsList() {
  const { deals } = useDealsProgram()
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active')
  const [category, setCategory] = useState<'all' | 'flights' | 'hotels' | 'shopping' | 'restaurants'>('all')
  const [showExternal, setShowExternal] = useState(true)

  const externalDeals = useExternalDeals(category === 'all' ? undefined : category)

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
      <div className="flex flex-col gap-4">
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
          <Button
            variant={showExternal ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowExternal(!showExternal)}
          >
            <Globe className="h-4 w-4 mr-2" />
            External Deals
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={category === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory('all')}
          >
            All Categories
          </Button>
          <Button
            variant={category === 'flights' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory('flights')}
          >
            Flights
          </Button>
          <Button
            variant={category === 'hotels' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory('hotels')}
          >
            Hotels
          </Button>
          <Button
            variant={category === 'shopping' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory('shopping')}
          >
            Shopping
          </Button>
          <Button
            variant={category === 'restaurants' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory('restaurants')}
          >
            Restaurants
          </Button>
        </div>
      </div>

      {/* External Deals Section */}
      {showExternal && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Live Deal Feed</h3>
            {externalDeals.data && (
              <Badge variant="outline">
                {externalDeals.data.deals.length} deals from{' '}
                {Object.values(externalDeals.data.sources).reduce(
                  (acc, source) => acc + Object.values(source).reduce((a, b) => a + b, 0),
                  0
                )}{' '}
                sources
              </Badge>
            )}
          </div>

          {externalDeals.isLoading ? (
            <div className="text-center py-8">Loading external deals...</div>
          ) : externalDeals.data && externalDeals.data.deals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {externalDeals.data.deals.map((deal) => (
                <ExternalDealCard key={deal.id} deal={deal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No external deals found</p>
            </div>
          )}
        </div>
      )}

      {/* On-chain Deals Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Blockchain Deals</h3>
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
            <p className="text-muted-foreground">No blockchain deals found</p>
          </div>
        )}
      </div>
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
