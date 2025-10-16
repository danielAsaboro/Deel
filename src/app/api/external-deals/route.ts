import { NextRequest, NextResponse } from 'next/server'
import { AmadeusClient } from '@/lib/api-clients/amadeus'
import { RapidAPIClient } from '@/lib/api-clients/rapidapi'
import { YelpClient } from '@/lib/api-clients/yelp'
import { FakeStoreClient } from '@/lib/api-clients/fakestore'
import { ExternalDeal, ExternalDealsResponse } from '@/types/external-deals'

// Cache results for 5 minutes to avoid hitting rate limits
let cache: { data: ExternalDealsResponse; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data)
    }

    // Get category filter from query params
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') as
      | 'flights'
      | 'hotels'
      | 'shopping'
      | 'restaurants'
      | null

    // Initialize clients
    const amadeusClient = new AmadeusClient()
    const rapidAPIClient = new RapidAPIClient()
    const yelpClient = new YelpClient()
    const fakeStoreClient = new FakeStoreClient()

    // Fetch deals from all sources in parallel (with error handling)
    const results = await Promise.allSettled([
      amadeusClient.getAllDeals().catch(() => []),
      rapidAPIClient.getAllDeals().catch(() => []),
      yelpClient.getAllDeals().catch(() => []),
      fakeStoreClient.getAllDeals().catch(() => []),
    ])

    // Collect all successful deals
    const allDeals: ExternalDeal[] = []
    const sources = {
      amadeus: { flights: 0, hotels: 0 },
      rapidapi: { hotels: 0, restaurants: 0 },
      yelp: { restaurants: 0 },
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
            } else if (deal.source === 'yelp') {
              sources.yelp.restaurants++
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

    // Update cache
    cache = {
      data: response,
      timestamp: Date.now(),
    }

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
