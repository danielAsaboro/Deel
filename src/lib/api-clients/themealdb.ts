import { ExternalDeal } from '@/types/external-deals'

export class TheMealDBClient {
  private baseUrl = 'https://www.themealdb.com/api/json/v1/1'

  async searchRestaurantDeals(): Promise<ExternalDeal[]> {
    try {
      // Get random meals to simulate restaurant deals
      // TheMealDB is free and requires no API key
      const categories = ['Seafood', 'Chicken', 'Beef', 'Pasta', 'Vegetarian', 'Dessert']
      const randomCategory = categories[Math.floor(Math.random() * categories.length)]

      const response = await fetch(`${this.baseUrl}/filter.php?c=${randomCategory}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('TheMealDB API error:', response.status, response.statusText)
        console.error('TheMealDB error details:', errorText)
        return []
      }

      const data = await response.json()
      const meals = data.meals || []

      return meals.slice(0, 20).map((meal: any) => {
        // Generate realistic restaurant pricing
        const basePrice = Math.floor(Math.random() * 30) + 15 // $15-45
        const discountPercent = Math.floor(Math.random() * 16) + 10 // 10-25% off
        const discountedPrice = basePrice * (1 - discountPercent / 100)

        // Create restaurant-style descriptions
        const cuisineType = randomCategory
        const locations = ['Downtown', 'Midtown', 'Brooklyn', 'Queens', 'Manhattan']
        const randomLocation = locations[Math.floor(Math.random() * locations.length)]

        return {
          id: `themealdb-${meal.idMeal}`,
          source: 'themealdb' as const,
          category: 'restaurants' as const,
          title: `${cuisineType} Kitchen - ${meal.strMeal}`,
          description: `Authentic ${cuisineType} cuisine featuring ${meal.strMeal}`,
          discountPercent,
          originalPrice: basePrice,
          discountedPrice,
          currency: 'USD',
          imageUrl: meal.strMealThumb,
          location: `${randomLocation}, New York`,
          metadata: {
            mealId: meal.idMeal,
            category: cuisineType,
            mealName: meal.strMeal,
          },
        }
      })
    } catch (error) {
      console.error('Error fetching TheMealDB data:', error)
      return []
    }
  }

  async getAllDeals(): Promise<ExternalDeal[]> {
    return this.searchRestaurantDeals()
  }
}
