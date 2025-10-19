'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { ReactQueryProvider } from './react-query-provider'
import { ClusterProvider } from '@/components/cluster/cluster-data-access'
import { SolanaProvider } from '@/components/solana/solana-provider'
import { GatewayProvider } from '@/components/gateway/gateway-data-access'
import { UsdcPriceProvider } from '@/hooks/use-usdc-price'
import React from 'react'

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ReactQueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ClusterProvider>
          <GatewayProvider>
            <UsdcPriceProvider>
              <SolanaProvider>{children}</SolanaProvider>
            </UsdcPriceProvider>
          </GatewayProvider>
        </ClusterProvider>
      </ThemeProvider>
    </ReactQueryProvider>
  )
}
