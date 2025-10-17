'use client'

import { atom, useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { createContext, ReactNode, useContext, useMemo } from 'react'
import type {
  BuildGatewayTransactionOptions,
  DeliveryMethodType,
  FeeRange,
  GatewayCluster,
  JitoTipRange,
} from '@/lib/gateway'

/**
 * Gateway configuration stored in localStorage
 */
export interface GatewayConfig {
  enabled: boolean
  apiKey: string | null
  deliveryMethodType: DeliveryMethodType
  cuPriceRange: FeeRange
  jitoTipRange: JitoTipRange
  skipSimulation: boolean
  skipPriorityFee: boolean
  expireInSlots?: number
}

/**
 * Default Gateway configuration
 */
const defaultGatewayConfig: GatewayConfig = {
  enabled: false,
  apiKey: null,
  deliveryMethodType: 'sanctum-sender', // Default to Sanctum Sender (dual-path)
  cuPriceRange: 'medium',
  jitoTipRange: 'medium',
  skipSimulation: false,
  skipPriorityFee: false,
  expireInSlots: undefined,
}

/**
 * Atoms for Gateway configuration
 */
const gatewayConfigAtom = atomWithStorage<GatewayConfig>('gateway-config', defaultGatewayConfig)

const gatewayEnabledAtom = atom(
  (get) => {
    const config = get(gatewayConfigAtom)
    const apiKey = process.env.NEXT_PUBLIC_GATEWAY_API_KEY || config.apiKey
    return config.enabled && !!apiKey
  },
  (get, set, enabled: boolean) => {
    const config = get(gatewayConfigAtom)
    set(gatewayConfigAtom, { ...config, enabled })
  }
)

export interface GatewayProviderContext {
  config: GatewayConfig
  isEnabled: boolean
  apiKey: string | null
  updateConfig: (updates: Partial<GatewayConfig>) => void
  toggleEnabled: () => void
  getBuildOptions: () => BuildGatewayTransactionOptions
  getCluster: () => GatewayCluster
  resetConfig: () => void
}

const Context = createContext<GatewayProviderContext>({} as GatewayProviderContext)

export function GatewayProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useAtom(gatewayConfigAtom)
  const [isEnabled, setIsEnabled] = useAtom(gatewayEnabledAtom)

  // Get API key from env or config
  const apiKey = useMemo(() => {
    return process.env.NEXT_PUBLIC_GATEWAY_API_KEY || config.apiKey
  }, [config.apiKey])

  const value: GatewayProviderContext = {
    config,
    isEnabled: isEnabled && !!apiKey,
    apiKey,
    updateConfig: (updates) => {
      setConfig({ ...config, ...updates })
    },
    toggleEnabled: () => {
      setIsEnabled(!isEnabled)
    },
    getBuildOptions: (): BuildGatewayTransactionOptions => ({
      encoding: 'base64',
      deliveryMethodType: config.deliveryMethodType,
      cuPriceRange: config.cuPriceRange,
      jitoTipRange: config.jitoTipRange,
      skipSimulation: config.skipSimulation,
      skipPriorityFee: config.skipPriorityFee,
      expireInSlots: config.expireInSlots,
    }),
    getCluster: (): GatewayCluster => {
      // This should ideally come from the cluster provider
      // For now, we'll default to devnet for testing
      return 'devnet'
    },
    resetConfig: () => {
      setConfig(defaultGatewayConfig)
    },
  }

  return <Context.Provider value={value}>{children}</Context.Provider>
}

/**
 * Hook to access Gateway configuration and controls
 */
export function useGateway() {
  return useContext(Context)
}

/**
 * Hook to check if Gateway is enabled and configured
 */
export function useIsGatewayEnabled() {
  const { isEnabled, apiKey } = useGateway()
  return isEnabled && !!apiKey
}
