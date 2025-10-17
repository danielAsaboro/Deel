import { AmadeusFlightOffer, AmadeusHotelOffer, ExternalDeal } from '@/types/external-deals'

interface AmadeusToken {
  access_token: string
  expires_in: number
  token_type: string
}

let cachedToken: { token: string; expiresAt: number } | null = null

export class AmadeusClient {
  private apiKey: string
  private apiSecret: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY || ''
    this.apiSecret = process.env.AMADEUS_API_SECRET || ''
    // Use test environment for free tier
    this.baseUrl = 'https://test.api.amadeus.com'
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return cachedToken.token
    }

    const response = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.apiKey,
        client_secret: this.apiSecret,
      }),
    })

    if (!response.ok) {
      throw new Error(`Amadeus auth failed: ${response.statusText}`)
    }

    const data: AmadeusToken = await response.json()

    // Cache token (expires in ~30 minutes, cache for 25 to be safe)
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000,
    }

    return data.access_token
  }

  async searchFlightDeals(
    originCode: string = 'NYC',
    destinationCode: string = 'LAX'
  ): Promise<ExternalDeal[]> {
    try {
      const token = await this.getAccessToken()

      // Search for flights based on provided origin and destination
      const response = await fetch(
        `${this.baseUrl}/v2/shopping/flight-offers?` +
          new URLSearchParams({
            originLocationCode: originCode,
            destinationLocationCode: destinationCode,
            departureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            adults: '1',
            max: '10',
          }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        console.error('Amadeus flights API error:', response.statusText)
        return []
      }

      const data = await response.json()
      const flights: AmadeusFlightOffer[] = data.data || []

      return flights.map((flight) => {
        const firstSegment = flight.itineraries[0]?.segments[0]
        const lastSegment = flight.itineraries[0]?.segments.slice(-1)[0]
        const price = parseFloat(flight.price.total)
        // Note: Amadeus provides actual prices, not discounts
        // Setting discount to 0 to show real market prices
        const discountPercent = 0

        return {
          id: `amadeus-flight-${flight.id}`,
          source: 'amadeus' as const,
          category: 'flights' as const,
          title: `${firstSegment?.departure.iataCode} → ${lastSegment?.arrival.iataCode}`,
          description: `Flight with ${firstSegment?.carrierCode}${firstSegment?.number}`,
          discountPercent,
          originalPrice: price,
          discountedPrice: price,
          currency: flight.price.currency,
          location: `${firstSegment?.departure.iataCode} to ${lastSegment?.arrival.iataCode}`,
          validUntil: firstSegment?.departure.at,
          metadata: {
            carrier: firstSegment?.carrierCode,
            flightNumber: firstSegment?.number,
          },
        }
      })
    } catch (error) {
      console.error('Error fetching Amadeus flights:', error)
      return []
    }
  }

  async searchHotelDeals(cityCode: string = 'NYC', cityName: string = 'New York City'): Promise<ExternalDeal[]> {
    try {
      const token = await this.getAccessToken()

      // Search hotels based on provided city
      const response = await fetch(
        `${this.baseUrl}/v3/shopping/hotel-offers?` +
          new URLSearchParams({
            cityCode,
            checkInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            checkOutDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            adults: '2',
            radius: '5',
            radiusUnit: 'KM',
            ratings: '4,5',
          }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        console.error('Amadeus hotels API error:', response.statusText)
        return []
      }

      const data = await response.json()
      const hotels: AmadeusHotelOffer[] = data.data || []

      return hotels.slice(0, 10).map((hotel) => {
        const offer = hotel.offers[0]
        const price = parseFloat(offer.price.total)
        // Note: Amadeus provides actual prices, not discounts
        // Setting discount to 0 to show real market prices
        const discountPercent = 0

        return {
          id: `amadeus-hotel-${hotel.hotel.hotelId}-${offer.id}`,
          source: 'amadeus' as const,
          category: 'hotels' as const,
          title: hotel.hotel.name,
          description: offer.room.description.text || 'Hotel room',
          discountPercent,
          originalPrice: price,
          discountedPrice: price,
          currency: offer.price.currency,
          location: cityName,
          metadata: {
            hotelId: hotel.hotel.hotelId,
            roomType: offer.room.type,
          },
        }
      })
    } catch (error) {
      console.error('Error fetching Amadeus hotels:', error)
      return []
    }
  }

  async getAllDeals(): Promise<ExternalDeal[]> {
    const [flights, hotels] = await Promise.all([
      this.searchFlightDeals(),
      this.searchHotelDeals(),
    ])

    return [...flights, ...hotels]
  }
}
