import { ExternalDeal } from '@/types/external-deals'

export class RapidAPIClient {
  private apiKey: string
  private baseUrl = 'https://booking-com.p.rapidapi.com/v1'

  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY || ''
  }

  async searchHotelDeals(city?: string): Promise<ExternalDeal[]> {
    // Use environment variable or fallback to New York
    const searchCity = city || process.env.RAPIDAPI_DEFAULT_CITY || 'New York'
    try {
      // Get location ID first
      const locationResponse = await fetch(
        `${this.baseUrl}/hotels/locations?name=${encodeURIComponent(searchCity)}&locale=en-gb`,
        {
          headers: {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
          },
        }
      )

      if (!locationResponse.ok) {
        console.error('RapidAPI location search error:', locationResponse.statusText)
        return []
      }

      const locationData = await locationResponse.json()
      const destId = locationData[0]?.dest_id

      if (!destId) {
        console.error('No destination ID found for city:', searchCity)
        return []
      }

      // Search hotels
      const checkIn = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
      const checkOut = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const hotelsResponse = await fetch(
        `${this.baseUrl}/hotels/search?` +
          new URLSearchParams({
            dest_id: destId.toString(),
            dest_type: 'city',
            checkin_date: checkIn,
            checkout_date: checkOut,
            adults_number: '2',
            room_number: '1',
            units: 'metric',
            order_by: 'popularity',
          }),
        {
          headers: {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'booking-com.p.rapidapi.com',
          },
        }
      )

      if (!hotelsResponse.ok) {
        console.error('RapidAPI hotels search error:', hotelsResponse.statusText)
        return []
      }

      const hotelsData = await hotelsResponse.json()
      const hotels = hotelsData.result || []

      return hotels.slice(0, 15).map((hotel: Record<string, unknown>) => {
        const minPrice = hotel.min_total_price as string | undefined
        const priceBreakdown = hotel.price_breakdown as { gross_price?: string } | undefined
        const price = parseFloat(minPrice || priceBreakdown?.gross_price || '200')

        const ribbonText = hotel.ribbon_text as string | undefined
        const discountPercent = ribbonText?.includes('%')
          ? parseInt(ribbonText.match(/\d+/)?.[0] || '15')
          : 15
        const originalPrice = price / (1 - discountPercent / 100)

        return {
          id: `rapidapi-hotel-${hotel.hotel_id as string}`,
          source: 'rapidapi' as const,
          category: 'hotels' as const,
          title: (hotel.hotel_name as string) || 'Hotel Deal',
          description: `${(hotel.review_score_word as string) || 'Good'} • ${(hotel.distance as string) || '0'} from center`,
          discountPercent,
          originalPrice,
          discountedPrice: price,
          currency: (hotel.currency_code as string) || 'USD',
          imageUrl: (hotel.max_photo_url as string) || (hotel.main_photo_url as string),
          externalUrl: hotel.url as string,
          location: `${hotel.city as string}, ${hotel.country_trans as string}`,
          metadata: {
            hotelId: hotel.hotel_id as string,
            reviewScore: hotel.review_score as number,
            reviewCount: hotel.review_nr as number,
            address: hotel.address as string,
          },
        }
      })
    } catch (error) {
      console.error('Error fetching RapidAPI hotels:', error)
      return []
    }
  }

  async getAllDeals(): Promise<ExternalDeal[]> {
    return this.searchHotelDeals()
  }
}
