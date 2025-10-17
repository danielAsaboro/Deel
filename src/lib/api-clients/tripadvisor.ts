import { ExternalDeal } from '@/types/external-deals'

export class TripAdvisorClient {
  private apiKey: string
  private baseUrl = 'https://tripadvisor16.p.rapidapi.com/api/v1'

  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY || ''
  }

  async searchRestaurantDeals(location?: string): Promise<ExternalDeal[]> {
    const searchLocation = location || process.env.TRIPADVISOR_DEFAULT_LOCATION || 'New York'

    try {
      // Search for location ID first
      const locationResponse = await fetch(
        `${this.baseUrl}/restaurant/searchLocation?query=${encodeURIComponent(searchLocation)}`,
        {
          headers: {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'tripadvisor16.p.rapidapi.com',
          },
        }
      )

      if (!locationResponse.ok) {
        const errorText = await locationResponse.text()
        console.error('TripAdvisor location search error:', locationResponse.status, locationResponse.statusText)
        console.error('TripAdvisor location error details:', errorText)
        return []
      }

      const locationData = await locationResponse.json()
      const geoId = locationData?.data?.[0]?.geoId

      if (!geoId) {
        console.error('No TripAdvisor geoId found for location:', searchLocation)
        return []
      }

      // Search restaurants in that location
      const restaurantsResponse = await fetch(
        `${this.baseUrl}/restaurant/searchRestaurants?locationId=${geoId}`,
        {
          headers: {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'tripadvisor16.p.rapidapi.com',
          },
        }
      )

      if (!restaurantsResponse.ok) {
        const errorText = await restaurantsResponse.text()
        console.error('TripAdvisor restaurants search error:', restaurantsResponse.status, restaurantsResponse.statusText)
        console.error('TripAdvisor restaurants error details:', errorText)
        return []
      }

      const restaurantsData = await restaurantsResponse.json()
      const restaurants = restaurantsData?.data?.data || []

      return restaurants.slice(0, 20).map((restaurant: any) => {
        // Estimate price based on price level
        const priceMap: Record<string, number> = {
          '$': 15,
          '$$ - $$$': 30,
          '$$$$': 60,
        }
        const estimatedPrice = priceMap[restaurant.priceTag || '$$ - $$$'] || 30

        // Generate a realistic discount (10-25%)
        const discountPercent = Math.floor(Math.random() * 16) + 10 // 10-25%
        const discountedPrice = estimatedPrice * (1 - discountPercent / 100)

        return {
          id: `tripadvisor-${restaurant.restaurantsId}`,
          source: 'tripadvisor' as const,
          category: 'restaurants' as const,
          title: restaurant.name || 'Restaurant',
          description: `${restaurant.establishmentTypeAndCuisineTags?.join(', ') || 'Dining'} • ${restaurant.priceTag || '$$'}`,
          discountPercent,
          originalPrice: estimatedPrice,
          discountedPrice,
          currency: 'USD',
          imageUrl: restaurant.heroImgUrl || restaurant.thumbImgUrl,
          externalUrl: restaurant.restaurantsId ? `https://www.tripadvisor.com/Restaurant_Review-g${geoId}-d${restaurant.restaurantsId}` : undefined,
          location: restaurant.parentGeoName || searchLocation,
          metadata: {
            rating: restaurant.averageRating,
            reviewCount: restaurant.userReviewCount,
            priceTag: restaurant.priceTag,
            cuisines: restaurant.establishmentTypeAndCuisineTags || [],
          },
        }
      })
    } catch (error) {
      console.error('Error fetching TripAdvisor restaurants:', error)
      return []
    }
  }

  async getAllDeals(): Promise<ExternalDeal[]> {
    return this.searchRestaurantDeals()
  }
}
