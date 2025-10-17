import { YelpBusiness, ExternalDeal } from '@/types/external-deals'

export class YelpClient {
  private apiKey: string
  private baseUrl = 'https://api.yelp.com/v3'

  constructor() {
    this.apiKey = process.env.YELP_API_KEY || ''
  }

  async searchRestaurantDeals(location?: string): Promise<ExternalDeal[]> {
    // Use environment variable or fallback to New York
    const searchLocation = location || process.env.YELP_DEFAULT_LOCATION || 'New York'
    try {
      const response = await fetch(
        `${this.baseUrl}/businesses/search?` +
          new URLSearchParams({
            location: searchLocation,
            term: 'restaurants',
            limit: '20',
            sort_by: 'rating',
            attributes: 'deals',
          }),
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      )

      if (!response.ok) {
        console.error('Yelp API error:', response.statusText)
        return []
      }

      const data = await response.json()
      const businesses: YelpBusiness[] = data.businesses || []

      return businesses.map((business) => {
        // Estimate price based on Yelp's price indicator ($, $$, $$$, $$$$)
        const priceMap: Record<string, number> = {
          $: 15,
          $$: 30,
          $$$: 50,
          $$$$: 100,
        }
        const estimatedPrice = priceMap[business.price || '$$'] || 30
        // Note: Yelp API doesn't provide discount information
        // Setting discount to 0 since this is for informational purposes only
        const discountPercent = 0
        const discountedPrice = estimatedPrice

        return {
          id: `yelp-${business.id}`,
          source: 'yelp' as const,
          category: 'restaurants' as const,
          title: business.name,
          description: `${business.categories.map((c) => c.title).join(', ')} • ${business.price || '$$'}`,
          discountPercent,
          originalPrice: estimatedPrice,
          discountedPrice,
          currency: 'USD',
          imageUrl: business.image_url,
          externalUrl: business.url,
          location: `${business.location.city}, ${business.location.state}`,
          metadata: {
            rating: business.rating,
            address: business.location.address1,
            categories: business.categories.map((c) => c.title),
            transactions: business.transactions || [],
          },
        }
      })
    } catch (error) {
      console.error('Error fetching Yelp restaurants:', error)
      return []
    }
  }

  async getAllDeals(): Promise<ExternalDeal[]> {
    return this.searchRestaurantDeals()
  }
}
