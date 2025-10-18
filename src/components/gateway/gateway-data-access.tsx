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
import { useCluster } from '@/components/cluster/cluster-data-access'

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
 * Sanctum Gateway is enabled by default for optimal transaction delivery
 */
const defaultGatewayConfig: GatewayConfig = {
  enabled: true, // Enabled by default for judges to see it in action
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
  isSupported: boolean // Whether Gateway is supported on current cluster
  apiKey: string | null
  updateConfig: (updates: Partial<GatewayConfig>) => void
  toggleEnabled: () => void
  getBuildOptions: () => BuildGatewayTransactionOptions
  getCluster: () => GatewayCluster | null // null if not supported
  resetConfig: () => void
}

const Context = createContext<GatewayProviderContext>({} as GatewayProviderContext)

/**
 * Convert Solana cluster to Gateway cluster
 * Gateway only supports mainnet and devnet
 */
function getGatewayCluster(clusterName: string): GatewayCluster | null {
  const name = clusterName.toLowerCase()

  if (name === 'mainnet' || name === 'mainnet-beta') {
    return 'mainnet'
  }

  if (name === 'devnet') {
    return 'devnet'
  }

  // Gateway doesn't support localnet, testnet, or custom clusters
  return null
}

export function GatewayProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useAtom(gatewayConfigAtom)
  const [isEnabled, setIsEnabled] = useAtom(gatewayEnabledAtom)
  const { cluster } = useCluster()

  // Get API key from env or config
  const apiKey = useMemo(() => {
    return process.env.NEXT_PUBLIC_GATEWAY_API_KEY || config.apiKey
  }, [config.apiKey])

  // Determine if Gateway is supported on current cluster
  const gatewayCluster = useMemo(() => getGatewayCluster(cluster.name), [cluster.name])
  const isSupported = gatewayCluster !== null

  const value: GatewayProviderContext = {
    config,
    isEnabled: isEnabled && !!apiKey && isSupported,
    isSupported,
    apiKey,
    updateConfig: (updates) => {
      setConfig({ ...config, ...updates })
    },
    toggleEnabled: () => {
      setIsEnabled(!isEnabled)
    },
    getBuildOptions: (): BuildGatewayTransactionOptions => {
      // Sanctum Sender only works on mainnet - use RPC for devnet
      const deliveryMethod = gatewayCluster === 'devnet' ? 'rpc' : config.deliveryMethodType

      const options: BuildGatewayTransactionOptions = {
        deliveryMethodType: deliveryMethod,
        cuPriceRange: config.cuPriceRange,
        skipSimulation: config.skipSimulation,
        skipPriorityFee: config.skipPriorityFee,
      }

      // Only add jitoTipRange for jito-based delivery methods
      if (deliveryMethod === 'jito' || deliveryMethod === 'sanctum-sender' || deliveryMethod === 'helius-sender') {
        options.jitoTipRange = config.jitoTipRange
      }

      // Only add expireInSlots if it's defined
      if (config.expireInSlots !== undefined) {
        options.expireInSlots = config.expireInSlots
      }

      return options
    },
    getCluster: (): GatewayCluster | null => {
      return gatewayCluster
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
