'use client'

import { PublicKey } from '@solana/web3.js'
import { useState, useEffect, useMemo } from 'react'
import { useDealsProgram, Deal, useExternalDeals } from './deals-data-access'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { useWallet } from '@solana/wallet-adapter-react'
import { Badge } from '../ui/badge'
import { Calendar, Tag, TrendingDown, Package, ExternalLink, Globe, Star, MessageCircle, Share2, Search, MapPin, SlidersHorizontal, TrendingUp, Clock, DollarSign, Users } from 'lucide-react'
import { ExternalDeal } from '@/types/external-deals'
import { Textarea } from '../ui/textarea'
import { toast } from 'sonner'
import { useUsdcPrice } from '@/hooks/use-usdc-price'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import Link from 'next/link'

export function DealsCreate() {
  const { createDeal } = useDealsProgram()
  const { usdcToBaseUnits } = useUsdcPrice()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discountPercent, setDiscountPercent] = useState(10)
  const [maxSupply, setMaxSupply] = useState(100)
  const [category, setCategory] = useState('')
  const [priceUsdc, setPriceUsdc] = useState(1)
  const [expiryDays, setExpiryDays] = useState(30)

  const handleSubmit = () => {
    const expiryTimestamp = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60
    const priceLamports = usdcToBaseUnits(priceUsdc)
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
              <Label htmlFor="price">Price (USDC)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={priceUsdc}
                onChange={(e) => setPriceUsdc(Number(e.target.value))}
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
  const { baseUnitsToUsdc } = useUsdcPrice()
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
    // Use environment variable for base URL, fallback to window.location.origin
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    const url = `${baseUrl}/deals/${deal.publicKey.toString()}`
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

        {/* Social Proof */}
        {deal.currentSupply.toNumber() > 0 && (
          <div className="bg-muted px-3 py-2 rounded-md text-sm">
            <span className="font-medium text-primary">{deal.currentSupply.toNumber()} {deal.currentSupply.toNumber() === 1 ? 'person has' : 'people have'}</span> claimed this deal! 🔥
          </div>
        )}

        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(supplyPercent, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">
            Price: ${baseUnitsToUsdc(deal.priceLamports.toNumber()).toFixed(2)} USDC
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
  const { usdcToBaseUnits } = useUsdcPrice()
  const { publicKey } = useWallet()
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [maxSupply, setMaxSupply] = useState(100)
  const [expiryDays, setExpiryDays] = useState(30)
  const [priceUsdc, setPriceUsdc] = useState(20)

  const handleImport = async () => {
    const expiryTimestamp = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60
    const priceLamports = usdcToBaseUnits(priceUsdc)
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
            <Label htmlFor="price">Coupon Price (USDC)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={priceUsdc}
              onChange={(e) => setPriceUsdc(Number(e.target.value))}
              min="0"
            />
            <div className="text-xs text-muted-foreground mt-1">
              ${priceUsdc.toFixed(2)} USDC
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

// Geolocation hook
function useGeolocation() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const requestLocation = () => {
    setLoading(true)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          setLoading(false)
          toast.success('Location enabled', { description: 'Showing deals near you' })
        },
        (err) => {
          setError(err.message)
          setLoading(false)
          toast.error('Could not get your location', { description: 'Please enable location access' })
        }
      )
    } else {
      setError('Geolocation not supported')
      setLoading(false)
      toast.error('Geolocation not supported by your browser')
    }
  }

  return { location, error, loading, requestLocation }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function DealsList() {
  const { deals } = useDealsProgram()
  const { baseUnitsToUsdc } = useUsdcPrice()
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active')
  const [category, setCategory] = useState<'all' | 'flights' | 'hotels' | 'shopping' | 'restaurants'>('all')
  const [showExternal, setShowExternal] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'discount' | 'expiry' | 'popularity'>('newest')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [nearbyRadius, setNearbyRadius] = useState<number>(25) // km
  const [showFilters, setShowFilters] = useState(false)
  
  const { location, loading: locationLoading, requestLocation } = useGeolocation()

  const externalDeals = useExternalDeals(category === 'all' ? undefined : category)

  // Combined and filtered deals
  const filteredAndSortedDeals = useMemo(() => {
    let result = deals.data?.filter((deal) => {
      // Filter by status
      if (filter === 'active') {
        const isExpired = deal.expiryTimestamp.toNumber() * 1000 < Date.now()
        if (!deal.isActive || isExpired) return false
      }
      if (filter === 'expired') {
        if (deal.expiryTimestamp.toNumber() * 1000 >= Date.now()) return false
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = deal.title.toLowerCase().includes(query)
        const matchesDescription = deal.description.toLowerCase().includes(query)
        const matchesCategory = deal.category.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription && !matchesCategory) return false
      }

      // Filter by category
      if (category !== 'all' && !deal.category.toLowerCase().includes(category.toLowerCase())) {
        return false
      }

      // Filter by price range
      const priceUsdc = baseUnitsToUsdc(deal.priceLamports.toNumber())
      if (minPrice && priceUsdc < parseFloat(minPrice)) return false
      if (maxPrice && priceUsdc > parseFloat(maxPrice)) return false

      return true
    }) || []

    // Sort deals
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.priceLamports.toNumber() - b.priceLamports.toNumber()
        case 'price-high':
          return b.priceLamports.toNumber() - a.priceLamports.toNumber()
        case 'discount':
          return b.discountPercent - a.discountPercent
        case 'expiry':
          return a.expiryTimestamp.toNumber() - b.expiryTimestamp.toNumber()
        case 'popularity':
          return b.currentSupply.toNumber() - a.currentSupply.toNumber()
        case 'newest':
        default:
          return 0 // Keep original order (newest first from blockchain)
      }
    })

    return result
  }, [deals.data, filter, category, searchQuery, sortBy, minPrice, maxPrice, baseUnitsToUsdc])

  // Filter external deals by location
  const filteredExternalDeals = useMemo(() => {
    if (!externalDeals.data) return []
    
    let filtered = externalDeals.data.deals

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(deal => 
        deal.title.toLowerCase().includes(query) ||
        deal.description.toLowerCase().includes(query) ||
        deal.category.toLowerCase().includes(query)
      )
    }

    // Apply location filter
    if (location) {
      filtered = filtered.filter(deal => {
        if (!deal.location?.latitude || !deal.location?.longitude) return false
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          deal.location.latitude,
          deal.location.longitude
        )
        return distance <= nearbyRadius
      }).map(deal => {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          deal.location!.latitude,
          deal.location!.longitude
        )
        return { ...deal, distance }
      }).sort((a, b) => (a.distance || 0) - (b.distance || 0))
    }

    return filtered
  }, [externalDeals.data, searchQuery, location, nearbyRadius])

  // Get trending deals (sorted by claims)
  const trendingDeals = useMemo(() => {
    if (!deals.data) return []
    return [...deals.data]
      .filter(deal => deal.isActive && deal.expiryTimestamp.toNumber() * 1000 > Date.now())
      .sort((a, b) => b.currentSupply.toNumber() - a.currentSupply.toNumber())
      .slice(0, 6)
  }, [deals.data])

  return (
    <div className="space-y-6">
      {/* Trending Deals Section */}
      {trendingDeals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Trending Deals
                </CardTitle>
                <CardDescription>Most popular deals right now</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/10">
                🔥 Hot
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {trendingDeals.map((deal) => (
                <div key={deal.publicKey.toString()} className="group relative overflow-hidden rounded-lg border p-4 hover:border-primary transition-colors">
                  <div className="absolute top-2 right-2">
                    <Badge variant="default" className="text-xs">
                      {deal.discountPercent}% OFF
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold line-clamp-1 pr-16">{deal.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{deal.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-primary">
                        <Users className="h-3 w-3" />
                        <span className="font-medium">{deal.currentSupply.toNumber()} claimed</span>
                      </div>
                      <span className="font-bold text-green-600">
                        ${baseUnitsToUsdc(deal.priceLamports.toNumber()).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <Link href={`/deals/${deal.publicKey.toString()}`} className="absolute inset-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deals by title, description, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {/* Advanced Filters (Collapsible) */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="sort">Sort By</Label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger id="sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Newest First
                        </div>
                      </SelectItem>
                      <SelectItem value="price-low">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Price: Low to High
                        </div>
                      </SelectItem>
                      <SelectItem value="price-high">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Price: High to Low
                        </div>
                      </SelectItem>
                      <SelectItem value="discount">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4" />
                          Highest Discount
                        </div>
                      </SelectItem>
                      <SelectItem value="expiry">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Expiring Soon
                        </div>
                      </SelectItem>
                      <SelectItem value="popularity">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Most Popular
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-price">Min Price (USDC)</Label>
                  <Input
                    id="min-price"
                    type="number"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-price">Max Price (USDC)</Label>
                  <Input
                    id="max-price"
                    type="number"
                    placeholder="No limit"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            )}

            {/* Status and Category Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium">Status:</span>
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

              <div className="border-l h-6 mx-2" />

              <span className="text-sm font-medium">Category:</span>
              <Button
                variant={category === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('all')}
              >
                All
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

            {/* Location and External Deals Toggle */}
            <div className="flex flex-wrap gap-2 items-center pt-2 border-t">
              <Button
                variant={location ? 'default' : 'outline'}
                size="sm"
                onClick={requestLocation}
                disabled={locationLoading}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {location ? `Near Me (${nearbyRadius}km)` : locationLoading ? 'Getting location...' : 'Deals Near Me'}
              </Button>
              
              {location && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="radius" className="text-xs">Radius:</Label>
                  <Select value={nearbyRadius.toString()} onValueChange={(value) => setNearbyRadius(Number(value))}>
                    <SelectTrigger id="radius" className="h-8 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 km</SelectItem>
                      <SelectItem value="10">10 km</SelectItem>
                      <SelectItem value="25">25 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                      <SelectItem value="100">100 km</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                </div>
              )}

              <div className="border-l h-6 mx-2" />

              <Button
                variant={showExternal ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowExternal(!showExternal)}
              >
                <Globe className="h-4 w-4 mr-2" />
                External Deals
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* External Deals Section */}
      {showExternal && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {location ? `Deals Near You (${filteredExternalDeals.length})` : `Live Deal Feed`}
            </h3>
            {externalDeals.data && !location && (
              <Badge variant="outline">
                {filteredExternalDeals.length} deals from{' '}
                {Object.values(externalDeals.data.sources).reduce(
                  (acc, source) => acc + Object.values(source).reduce((a, b) => a + b, 0),
                  0
                )}{' '}
                sources
              </Badge>
            )}
            {location && (
              <Badge variant="default">
                <MapPin className="h-3 w-3 mr-1" />
                Within {nearbyRadius} km
              </Badge>
            )}
          </div>

          {externalDeals.isLoading ? (
            <div className="text-center py-8">Loading external deals...</div>
          ) : filteredExternalDeals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredExternalDeals.map((deal) => (
                <div key={deal.id} className="relative">
                  <ExternalDealCard deal={deal} />
                  {deal.distance !== undefined && (
                    <Badge variant="secondary" className="absolute top-2 right-2">
                      <MapPin className="h-3 w-3 mr-1" />
                      {deal.distance.toFixed(1)} km
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : location ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-3">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">No deals found near your location</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try increasing the search radius or turning off location filter
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-3">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">No external deals available</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure API keys in .env.local to load deals from Amadeus, RapidAPI, Yelp, and FakeStore
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2">
                    <p>Missing: Amadeus, RapidAPI, or Yelp API keys</p>
                    <p>See .env.local.example for setup instructions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* On-chain Deals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Blockchain Deals</h3>
          <Badge variant="outline">{filteredAndSortedDeals.length} deals</Badge>
        </div>
        {deals.isLoading ? (
          <div className="text-center py-8">Loading deals...</div>
        ) : filteredAndSortedDeals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedDeals.map((deal) => (
              <DealCard key={deal.publicKey.toString()} deal={deal} />
            ))}
          </div>
        ) : searchQuery || minPrice || maxPrice ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <Search className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">No deals match your filters</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
                <Button onClick={() => {
                  setSearchQuery('')
                  setMinPrice('')
                  setMaxPrice('')
                }} variant="outline" size="sm">
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <Package className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">No blockchain deals yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Be the first merchant to create an NFT coupon deal or import one from external sources
                  </p>
                </div>
                <Button onClick={() => setShowExternal(true)} variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-2" />
                  View External Deals to Import
                </Button>
              </div>
            </CardContent>
          </Card>
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
