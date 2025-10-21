'use client'

import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useDealsProgram } from '@/components/deals/deals-data-access'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar, 
  Tag, 
  TrendingDown, 
  Package, 
  Star, 
  MessageCircle, 
  Share2, 
  User, 
  CheckCircle,
  DollarSign,
  Users,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { useUsdcPrice } from '@/hooks/use-usdc-price'
import Link from 'next/link'

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
            className={`h-5 w-5 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  )
}

export function DealDetailView({ dealPublicKey }: { dealPublicKey: PublicKey }) {
  const { publicKey } = useWallet()
  const { useDealByAddress, mintCoupon, updateDeal, rateDeal, addComment, useCommentsByDeal } = useDealsProgram()
  const { baseUnitsToUsdc } = useUsdcPrice()
  
  const { data: deal, isLoading, refetch: refetchDeal } = useDealByAddress(dealPublicKey)
  const comments = useCommentsByDeal(dealPublicKey)
  
  const [showAllComments, setShowAllComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [userRating, setUserRating] = useState(0)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">Loading deal details...</div>
        </CardContent>
      </Card>
    )
  }

  if (!deal) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Package className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h2 className="text-2xl font-bold">Deal Not Found</h2>
              <p className="text-muted-foreground mt-2">This deal doesn't exist or has been removed.</p>
            </div>
            <Link href="/deals">
              <Button>Browse All Deals</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isMerchant = publicKey && deal.merchant.equals(publicKey)
  const expiryDate = new Date(deal.expiryTimestamp.toNumber() * 1000)
  const isExpired = expiryDate < new Date()
  const supplyPercent = (deal.currentSupply.toNumber() / deal.maxSupply.toNumber()) * 100
  const claimedCount = deal.currentSupply.toNumber()
  const availableCount = deal.maxSupply.toNumber() - claimedCount

  // Calculate average rating
  const averageRating = deal.totalRatings.toNumber() > 0
    ? deal.ratingSum.toNumber() / deal.totalRatings.toNumber()
    : 0

  const handleRate = async (rating: number) => {
    setUserRating(rating)
    await rateDeal.mutateAsync({ dealAddress: dealPublicKey, rating })
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    await addComment.mutateAsync({ dealAddress: dealPublicKey, content: newComment })
    setNewComment('')
    comments.refetch()
  }

  const handleClaimDeal = async () => {
    try {
      await mintCoupon.mutateAsync({ dealAddress: dealPublicKey })
      await refetchDeal()
    } catch (error) {
      console.error('Failed to mint coupon:', error)
    }
  }

  const handleShare = (platform: 'twitter' | 'copy') => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    const url = `${baseUrl}/deals/${deal.publicKey.toString()}`
    const text = `Check out this deal: ${deal.title} - ${deal.discountPercent}% OFF!`

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    }
  }

  const displayedComments = showAllComments ? comments.data : comments.data?.slice(0, 3)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Deal Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={deal.isActive ? 'default' : 'secondary'}>
                    {deal.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {isExpired && <Badge variant="destructive">Expired</Badge>}
                  <Badge variant="outline">{deal.category}</Badge>
                </div>
                <CardTitle className="text-3xl">{deal.title}</CardTitle>
                <CardDescription className="text-lg">{deal.description}</CardDescription>
              </div>
              <Badge variant="default" className="text-2xl px-4 py-2 shrink-0">
                {deal.discountPercent}% OFF
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted p-4 rounded-lg text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">${baseUnitsToUsdc(deal.priceLamports.toNumber()).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Price (USDC)</p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center">
                <TrendingDown className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{deal.discountPercent}%</p>
                <p className="text-xs text-muted-foreground">Discount</p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{claimedCount}</p>
                <p className="text-xs text-muted-foreground">People Claimed</p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center">
                <Package className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold">{availableCount}</p>
                <p className="text-xs text-muted-foreground">Still Available</p>
              </div>
            </div>

            {/* Social Proof */}
            {claimedCount > 0 && (
              <div className="bg-primary/10 border border-primary/20 px-4 py-3 rounded-lg">
                <p className="text-center">
                  🔥 <span className="font-bold">{claimedCount} {claimedCount === 1 ? 'person has' : 'people have'}</span> already claimed this deal!
                </p>
              </div>
            )}

            {/* Supply Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Availability</span>
                <span className="font-medium">
                  {claimedCount}/{deal.maxSupply.toString()} claimed ({supplyPercent.toFixed(0)}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                  style={{ width: `${Math.min(supplyPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Expiry Info */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Expires:</span>
              </div>
              <span className={isExpired ? 'text-red-500 font-bold' : 'font-medium'}>
                {isExpired ? 'Deal Expired' : expiryDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <Separator />

            {/* Rating Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Customer Rating</h3>
                  <div className="flex items-center gap-3">
                    <StarRating value={Math.round(averageRating)} readonly />
                    <span className="text-muted-foreground">
                      {averageRating > 0 ? `${averageRating.toFixed(1)} out of 5 (${deal.totalRatings.toString()} ratings)` : 'No ratings yet - be the first!'}
                    </span>
                  </div>
                </div>
                {publicKey && !isMerchant && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-2">Rate this deal:</p>
                    <StarRating value={userRating} onChange={handleRate} />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Merchant Info */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Merchant Information</h3>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Merchant Address</p>
                  <p className="font-mono text-sm">{deal.merchant.toString().slice(0, 20)}...{deal.merchant.toString().slice(-20)}</p>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex gap-2">
            {isMerchant ? (
              <Button
                variant="outline"
                onClick={() =>
                  updateDeal.mutateAsync({
                    dealAddress: dealPublicKey,
                    isActive: !deal.isActive,
                  })
                }
                disabled={updateDeal.isPending}
                className="flex-1"
              >
                {deal.isActive ? 'Deactivate Deal' : 'Activate Deal'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleClaimDeal}
                  disabled={
                    mintCoupon.isPending ||
                    !deal.isActive ||
                    isExpired ||
                    deal.currentSupply.gte(deal.maxSupply)
                  }
                  className="flex-1"
                  size="lg"
                >
                  {mintCoupon.isPending ? 'Minting Coupon...' : 'Claim This Deal'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleShare('twitter')}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleShare('copy')}
                >
                  Copy Link
                </Button>
              </>
            )}
          </CardFooter>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comments ({comments.data?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Comment Form */}
            {publicKey && !isMerchant && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Share your thoughts about this deal..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[100px]"
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {newComment.length}/500 characters
                  </span>
                  <Button 
                    onClick={handleAddComment} 
                    disabled={addComment.isPending || !newComment.trim()}
                  >
                    {addComment.isPending ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* Comments List */}
            <div className="space-y-3">
              {displayedComments && displayedComments.length > 0 ? (
                <>
                  {displayedComments.map((comment) => (
                    <div key={comment.publicKey.toString()} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {comment.author.toString().slice(0, 8)}...{comment.author.toString().slice(-6)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt.toNumber() * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                  {comments.data && comments.data.length > 3 && (
                    <Button
                      variant="outline"
                      onClick={() => setShowAllComments(!showAllComments)}
                      className="w-full"
                    >
                      {showAllComments ? 'Show Less' : `Show ${comments.data.length - 3} More Comments`}
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleShare('twitter')}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share on Twitter
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleShare('copy')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Copy Share Link
            </Button>
            <Link href="/marketplace" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                View Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Deal Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium">{deal.category}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium">${baseUnitsToUsdc(deal.priceLamports.toNumber()).toFixed(2)} USDC</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount:</span>
              <span className="font-medium text-green-500">{deal.discountPercent}%</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Supply:</span>
              <span className="font-medium">{deal.maxSupply.toString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claimed:</span>
              <span className="font-medium">{claimedCount}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining:</span>
              <span className="font-medium">{availableCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Coupon is an NFT stored on Solana blockchain</li>
              <li>Can be resold on the marketplace before redemption</li>
              <li>Valid until the expiry date specified above</li>
              <li>One-time use only - cannot be reused after redemption</li>
              <li>Merchant must scan QR code to redeem</li>
              <li>No refunds after claiming the deal</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

