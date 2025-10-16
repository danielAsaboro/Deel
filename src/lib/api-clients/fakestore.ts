import { FakeStoreProduct, ExternalDeal } from '@/types/external-deals'

export class FakeStoreClient {
  private baseUrl = 'https://fakestoreapi.com'

  async getProductDeals(): Promise<ExternalDeal[]> {
    try {
      const response = await fetch(`${this.baseUrl}/products?limit=20`)

      if (!response.ok) {
        console.error('FakeStore API error:', response.statusText)
        return []
      }

      const products: FakeStoreProduct[] = await response.json()

      return products.map((product) => {
        // Generate random discount between 10-50%
        const discountPercent = Math.floor(Math.random() * 40) + 10
        const discountedPrice = product.price * (1 - discountPercent / 100)

        return {
          id: `fakestore-${product.id}`,
          source: 'fakestore' as const,
          category: 'shopping' as const,
          title: product.title,
          description: product.description,
          discountPercent,
          originalPrice: product.price,
          discountedPrice,
          currency: 'USD',
          imageUrl: product.image,
          metadata: {
            category: product.category,
            rating: product.rating.rate,
            reviews: product.rating.count,
          },
        }
      })
    } catch (error) {
      console.error('Error fetching FakeStore products:', error)
      return []
    }
  }

  async getAllDeals(): Promise<ExternalDeal[]> {
    return this.getProductDeals()
  }
}
