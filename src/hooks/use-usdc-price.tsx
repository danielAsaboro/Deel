'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

type PriceSource = 'jupiter-v3' | 'jupiter-v2' | 'coingecko'

interface UsdcPriceContextType {
  solPrice: number | null // Price of 1 SOL in USDC
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  priceSource: PriceSource | null // Track which API provided the price
  // Conversion helpers
  solToUsdc: (sol: number) => number
  lamportsToUsdc: (lamports: number) => number
  usdcToLamports: (usdc: number) => number
  usdcToSol: (usdc: number) => number
}

const UsdcPriceContext = createContext<UsdcPriceContextType | undefined>(undefined)

// API endpoints
const JUPITER_V3_API = 'https://lite-api.jup.ag/price/v3'
const JUPITER_V2_API = 'https://api.jup.ag/price/v2'
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price'
const SOL_MINT = 'So11111111111111111111111111111111111111112'
const REFRESH_INTERVAL = 60000 // 60 seconds

/**
 * Fetch SOL price from Jupiter V3 API (recommended)
 */
async function fetchFromJupiterV3(): Promise<number> {
  const response = await fetch(`${JUPITER_V3_API}?ids=${SOL_MINT}`)

  if (!response.ok) {
    throw new Error(`Jupiter V3 API returned ${response.status}`)
  }

  const data = await response.json()

  // V3 response format: { data: { [mint]: { price: "123.45" } } }
  if (data?.data?.[SOL_MINT]?.price) {
    const price = parseFloat(data.data[SOL_MINT].price)
    if (!isNaN(price) && price > 0) {
      return price
    }
  }

  throw new Error('Invalid response structure from Jupiter V3')
}

/**
 * Fetch SOL price from Jupiter V2 API (deprecated Aug 2025)
 */
async function fetchFromJupiterV2(): Promise<number> {
  const response = await fetch(`${JUPITER_V2_API}?ids=${SOL_MINT}`)

  if (!response.ok) {
    throw new Error(`Jupiter V2 API returned ${response.status}`)
  }

  const data = await response.json()

  // V2 response format: { data: { [mint]: { price: "123.45" } } }
  if (data?.data?.[SOL_MINT]?.price) {
    const price = parseFloat(data.data[SOL_MINT].price)
    if (!isNaN(price) && price > 0) {
      return price
    }
  }

  throw new Error('Invalid response structure from Jupiter V2')
}

/**
 * Fetch SOL price from CoinGecko API (tertiary fallback)
 */
async function fetchFromCoinGecko(): Promise<number> {
  const response = await fetch(`${COINGECKO_API}?ids=solana&vs_currencies=usd`)

  if (!response.ok) {
    throw new Error(`CoinGecko API returned ${response.status}`)
  }

  const data = await response.json()

  // CoinGecko response format: { solana: { usd: 123.45 } }
  if (data?.solana?.usd) {
    const price = parseFloat(data.solana.usd)
    if (!isNaN(price) && price > 0) {
      return price
    }
  }

  throw new Error('Invalid response structure from CoinGecko')
}

/**
 * Fetch SOL/USDC price with cascading fallback strategy
 * Tries: Jupiter V3 → Jupiter V2 → CoinGecko
 * Throws error if all APIs fail
 */
async function fetchSolUsdcPrice(): Promise<{ price: number; source: PriceSource }> {
  const errors: string[] = []

  // Try Jupiter V3 (primary)
  try {
    const price = await fetchFromJupiterV3()
    console.log('✓ Price fetched from Jupiter V3:', price)
    return { price, source: 'jupiter-v3' }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    errors.push(`Jupiter V3: ${msg}`)
    console.warn('Jupiter V3 failed:', msg)
  }

  // Try Jupiter V2 (secondary)
  try {
    const price = await fetchFromJupiterV2()
    console.log('✓ Price fetched from Jupiter V2 (fallback):', price)
    return { price, source: 'jupiter-v2' }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    errors.push(`Jupiter V2: ${msg}`)
    console.warn('Jupiter V2 failed:', msg)
  }

  // Try CoinGecko (tertiary)
  try {
    const price = await fetchFromCoinGecko()
    console.log('✓ Price fetched from CoinGecko (fallback):', price)
    return { price, source: 'coingecko' }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    errors.push(`CoinGecko: ${msg}`)
    console.warn('CoinGecko failed:', msg)
  }

  // All APIs failed
  console.error('⚠ All price APIs failed:', errors)
  throw new Error("Can't fetch prices right now. Please try again later.")
}

export function UsdcPriceProvider({ children }: { children: ReactNode }) {
  const [solPrice, setSolPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [priceSource, setPriceSource] = useState<PriceSource | null>(null)

  const fetchPrice = async () => {
    try {
      setError(null)
      const { price, source } = await fetchSolUsdcPrice()
      setSolPrice(price)
      setPriceSource(source)
      setLastUpdated(new Date())
      setIsLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch price'
      setError(errorMessage)
      setIsLoading(false)
      console.error('Price fetch failed:', errorMessage)
      // Keep previous price if we had one, otherwise solPrice stays null
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchPrice()

    // Set up periodic refresh
    const interval = setInterval(fetchPrice, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  // Conversion helpers
  const solToUsdc = (sol: number): number => {
    if (!solPrice) return 0
    return sol * solPrice
  }

  const lamportsToUsdc = (lamports: number): number => {
    if (!solPrice) return 0
    const sol = lamports / LAMPORTS_PER_SOL
    return sol * solPrice
  }

  const usdcToLamports = (usdc: number): number => {
    if (!solPrice) return 0
    const sol = usdc / solPrice
    return Math.floor(sol * LAMPORTS_PER_SOL)
  }

  const usdcToSol = (usdc: number): number => {
    if (!solPrice) return 0
    return usdc / solPrice
  }

  const value: UsdcPriceContextType = {
    solPrice,
    isLoading,
    error,
    lastUpdated,
    priceSource,
    solToUsdc,
    lamportsToUsdc,
    usdcToLamports,
    usdcToSol,
  }

  return <UsdcPriceContext.Provider value={value}>{children}</UsdcPriceContext.Provider>
}

export function useUsdcPrice() {
  const context = useContext(UsdcPriceContext)
  if (context === undefined) {
    throw new Error('useUsdcPrice must be used within a UsdcPriceProvider')
  }
  return context
}
