'use client'

/**
 * USDC Conversion Hook
 *
 * Provides conversion utilities between USDC amounts and base units (6 decimals).
 * No longer fetches SOL/USD prices since the platform uses USDC directly.
 */

const USDC_DECIMALS = 6
const USDC_BASE_UNITS = 10 ** USDC_DECIMALS // 1,000,000

export function useUsdcPrice() {
  /**
   * Convert USDC amount to base units for smart contract
   * @param usdc - USDC amount (e.g., 50 for $50 USDC)
   * @returns Base units (e.g., 50,000,000)
   */
  const usdcToBaseUnits = (usdc: number): number => {
    return Math.floor(usdc * USDC_BASE_UNITS)
  }

  /**
   * Convert base units from smart contract to USDC
   * @param baseUnits - Base units from chain (e.g., 50,000,000)
   * @returns USDC amount (e.g., 50)
   */
  const baseUnitsToUsdc = (baseUnits: number): number => {
    return baseUnits / USDC_BASE_UNITS
  }

  return {
    usdcToBaseUnits,
    baseUnitsToUsdc,
  }
}
