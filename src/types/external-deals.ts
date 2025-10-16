export interface ExternalDeal {
  id: string
  source: 'amadeus' | 'rapidapi' | 'yelp' | 'fakestore'
  category: 'flights' | 'hotels' | 'shopping' | 'restaurants'
  title: string
  description: string
  discountPercent: number
  originalPrice: number
  discountedPrice: number
  currency: string
  imageUrl?: string
  externalUrl?: string
  location?: string
  validUntil?: string
  metadata?: Record<string, unknown>
}

export interface AmadeusFlightOffer {
  id: string
  source: string
  price: {
    total: string
    currency: string
  }
  itineraries: Array<{
    segments: Array<{
      departure: {
        iataCode: string
        at: string
      }
      arrival: {
        iataCode: string
        at: string
      }
      carrierCode: string
      number: string
    }>
  }>
}

export interface AmadeusHotelOffer {
  hotel: {
    name: string
    hotelId: string
  }
  offers: Array<{
    id: string
    price: {
      total: string
      currency: string
    }
    room: {
      type: string
      description: {
        text: string
      }
    }
  }>
}

export interface YelpBusiness {
  id: string
  name: string
  image_url: string
  url: string
  price?: string
  rating: number
  location: {
    city: string
    state: string
    address1: string
  }
  categories: Array<{
    alias: string
    title: string
  }>
  transactions?: string[]
}

export interface FakeStoreProduct {
  id: number
  title: string
  price: number
  description: string
  category: string
  image: string
  rating: {
    rate: number
    count: number
  }
}

export interface RapidAPIBookingHotel {
  hotel_id: string
  hotel_name: string
  price: number
  currency: string
  city: string
  country: string
  image_url: string
  review_score: number
  url: string
}

export interface ExternalDealsResponse {
  deals: ExternalDeal[]
  sources: {
    amadeus: { flights: number; hotels: number }
    rapidapi: { hotels: number; restaurants: number }
    yelp: { restaurants: number }
    fakestore: { products: number }
  }
  timestamp: string
}
