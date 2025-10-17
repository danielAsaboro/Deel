import { NextRequest, NextResponse } from 'next/server'
import { AmadeusClient } from '@/lib/api-clients/amadeus'
import { RapidAPIClient } from '@/lib/api-clients/rapidapi'
import { TheMealDBClient } from '@/lib/api-clients/themealdb'
import { FakeStoreClient } from '@/lib/api-clients/fakestore'
import { ExternalDeal, ExternalDealsResponse } from '@/types/external-deals'

// Cache results for 5 minutes to avoid hitting rate limits
// Use a Map to store separate caches for each category
const cache = new Map<string, { data: ExternalDealsResponse; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  try {
    // Get category filter from query params
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') as
      | 'flights'
      | 'hotels'
      | 'shopping'
      | 'restaurants'
      | null

    // Create a cache key based on category
    const cacheKey = category || 'all'
    console.log(`[External Deals API] Requested category: ${cacheKey}`)

    // Check cache first
    const cachedData = cache.get(cacheKey)
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      console.log(`[External Deals API] Returning cached data for ${cacheKey}: ${cachedData.data.deals.length} deals`)
      return NextResponse.json(cachedData.data)
    }

    console.log(`[External Deals API] Cache miss for ${cacheKey}, fetching fresh data...`)

    // Initialize clients
    const amadeusClient = new AmadeusClient()
    const rapidAPIClient = new RapidAPIClient()
    const themealdbClient = new TheMealDBClient()
    const fakeStoreClient = new FakeStoreClient()

    // Fetch deals from all sources in parallel (with error handling)
    const results = await Promise.allSettled([
      amadeusClient.getAllDeals().catch((e) => {
        console.error('Amadeus API error:', e.message)
        return []
      }),
      rapidAPIClient.getAllDeals().catch((e) => {
        console.error('RapidAPI error:', e.message)
        return []
      }),
      themealdbClient.getAllDeals().catch((e) => {
        console.error('TheMealDB API error:', e.message)
        return []
      }),
      fakeStoreClient.getAllDeals().catch((e) => {
        console.error('FakeStore API error:', e.message)
        return []
      }),
    ])

    // Collect all successful deals
    const allDeals: ExternalDeal[] = []
    const sources = {
      amadeus: { flights: 0, hotels: 0 },
      rapidapi: { hotels: 0 },
      themealdb: { restaurants: 0 },
      fakestore: { products: 0 },
    }

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        result.value.forEach((deal: ExternalDeal) => {
          // Filter by category if specified
          if (!category || deal.category === category) {
            allDeals.push(deal)

            // Track sources
            if (deal.source === 'amadeus') {
              if (deal.category === 'flights') sources.amadeus.flights++
              else if (deal.category === 'hotels') sources.amadeus.hotels++
            } else if (deal.source === 'rapidapi') {
              sources.rapidapi.hotels++
            } else if (deal.source === 'themealdb') {
              sources.themealdb.restaurants++
            } else if (deal.source === 'fakestore') {
              sources.fakestore.products++
            }
          }
        })
      }
    })

    const response: ExternalDealsResponse = {
      deals: allDeals,
      sources,
      timestamp: new Date().toISOString(),
    }

    console.log(`[External Deals API] Returning ${allDeals.length} deals for category: ${cacheKey}`)
    console.log(`[External Deals API] Sources breakdown:`, JSON.stringify(sources, null, 2))

    // Update cache for this category
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching external deals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch external deals' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
