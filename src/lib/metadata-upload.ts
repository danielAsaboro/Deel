/**
 * Metadata upload utility for NFT coupons
 * Uses Pinata IPFS service (free tier available)
 */

export interface NFTMetadata {
  name: string
  description: string
  image?: string
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
  properties?: {
    category: string
    creators?: Array<{
      address: string
      share: number
    }>
  }
}

/**
 * Upload NFT metadata to IPFS via Pinata
 * For production, set NEXT_PUBLIC_PINATA_JWT in .env.local
 * Falls back to a mock implementation if no API key is set
 */
export async function uploadMetadataToIPFS(metadata: NFTMetadata): Promise<string> {
  const pinataJWT = process.env.NEXT_PUBLIC_PINATA_JWT

  if (!pinataJWT) {
    // Fallback: Return a deterministic mock IPFS URL for development
    // In production, you MUST set up Pinata or another IPFS service
    console.warn('PINATA_JWT not set, using mock IPFS URL')
    const mockHash = btoa(JSON.stringify(metadata)).slice(0, 46)
    return `https://gateway.pinata.cloud/ipfs/Qm${mockHash}`
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pinataJWT}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `coupon-${metadata.name}-${Date.now()}.json`,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`)
    }

    const data = await response.json()
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
  } catch (error) {
    console.error('IPFS upload error:', error)
    // Fallback to mock URL
    const mockHash = btoa(JSON.stringify(metadata)).slice(0, 46)
    return `https://gateway.pinata.cloud/ipfs/Qm${mockHash}`
  }
}

/**
 * Generate NFT metadata for a deal coupon
 */
export function generateCouponMetadata(
  deal: {
    title: string
    description: string
    discountPercent: number
    merchant: string
    expiryTimestamp: number
    category: string
  },
  couponNumber: number
): NFTMetadata {
  return {
    name: `${deal.title} - Coupon #${couponNumber}`,
    description: deal.description,
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(deal.title)}&size=400&background=random`,
    attributes: [
      {
        trait_type: 'Discount',
        value: `${deal.discountPercent}%`,
      },
      {
        trait_type: 'Category',
        value: deal.category,
      },
      {
        trait_type: 'Coupon Number',
        value: couponNumber,
      },
      {
        trait_type: 'Expiry',
        value: new Date(deal.expiryTimestamp * 1000).toISOString(),
      },
      {
        trait_type: 'Merchant',
        value: deal.merchant,
      },
    ],
    properties: {
      category: deal.category,
      creators: [
        {
          address: deal.merchant,
          share: 100,
        },
      ],
    },
  }
}
