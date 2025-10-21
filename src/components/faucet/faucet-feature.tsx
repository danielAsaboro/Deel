'use client'

import { useCluster } from '../cluster/cluster-data-access'
import { useFaucet } from './faucet-data-access'
import { FaucetCard } from './faucet-ui'

export function FaucetFeature() {
  const { cluster } = useCluster()
  const { usdcBalance, isLoadingBalance, mintUsdc } = useFaucet()

  const isMainnet = cluster.name === 'mainnet-beta'

  return (
    <div className="container mx-auto px-4 py-8">
      <FaucetCard
        usdcBalance={usdcBalance}
        onMint={() => mintUsdc.mutate()}
        isLoading={mintUsdc.isPending || isLoadingBalance}
        isMainnet={isMainnet}
      />
    </div>
  )
}
