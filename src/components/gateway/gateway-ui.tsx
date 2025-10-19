'use client'

import { useGateway } from './gateway-data-access'
import { useCluster } from '@/components/cluster/cluster-data-access'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import type { DeliveryMethodType, FeeRange, JitoTipRange } from '@/lib/gateway'

export function GatewayConfigPanel() {
  const gateway = useGateway()
  const { cluster } = useCluster()

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Sanctum Gateway Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Optimize transaction delivery with dual-path routing, automatic priority fees, and real-time monitoring
          </p>
        </div>

        {/* Cluster Warning */}
        {!gateway.isSupported && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                  Gateway Not Available on Current Cluster
                </h4>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  You are currently on <strong className="font-bold">{cluster.name}</strong>.
                  Sanctum Gateway only supports <strong>mainnet</strong> and <strong>devnet</strong>.
                  Please switch your cluster to use Gateway features. Transactions will use standard RPC on the current cluster.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Status Info */}
        <div className={`p-4 rounded-lg border-2 ${
          gateway.isBypassed
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-semibold">
                Current Mode: {gateway.isBypassed ? 'Direct RPC' : 'Gateway Active'}
              </div>
              <p className="text-sm text-muted-foreground">
                {gateway.isBypassed
                  ? 'All transactions are using direct RPC connection (Gateway bypassed)'
                  : `Transactions are optimized through Sanctum Gateway${gateway.isSupported ? '' : ` (not available on ${cluster.name})`}`
                }
              </p>
            </div>
            <div className="text-sm font-medium">
              {gateway.isBypassed ? (
                <span className="text-orange-600 dark:text-orange-400">⚡ Direct</span>
              ) : (
                <span className="text-green-600 dark:text-green-400">✓ Optimized</span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-current/10">
            <p className="text-xs text-muted-foreground">
              💡 Use the toggle in the header to switch between Gateway and Direct RPC mode
            </p>
          </div>
        </div>

        {/* Delivery Method Selection */}
        <div className="space-y-2">
          <Label htmlFor="delivery-method">Delivery Method</Label>
          <select
            id="delivery-method"
            value={gateway.config.deliveryMethodType}
            onChange={(e) =>
              gateway.updateConfig({ deliveryMethodType: e.target.value as DeliveryMethodType })
            }
            disabled={!gateway.isEnabled || gateway.isBypassed}
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value="sanctum-sender">Sanctum Sender (Dual-path: RPC + Jito)</option>
            <option value="helius-sender">Helius Sender (Dual-path)</option>
            <option value="jito">Jito Bundles Only</option>
            <option value="rpc">RPC Only</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {gateway.config.deliveryMethodType === 'sanctum-sender' && (
              <>Sends to both RPC and Jito simultaneously. Refunds Jito tip if landed via RPC.</>
            )}
            {gateway.config.deliveryMethodType === 'helius-sender' && (
              <>Optimizes latency by sending to validators and Jito simultaneously.</>
            )}
            {gateway.config.deliveryMethodType === 'jito' && (
              <>Higher success rates with MEV protection, requires Jito tip.</>
            )}
            {gateway.config.deliveryMethodType === 'rpc' && <>Standard RPC node delivery.</>}
          </p>
        </div>

        {/* Priority Fee Range */}
        <div className="space-y-2">
          <Label htmlFor="cu-price-range">Priority Fee Level</Label>
          <select
            id="cu-price-range"
            value={gateway.config.cuPriceRange}
            onChange={(e) => gateway.updateConfig({ cuPriceRange: e.target.value as FeeRange })}
            disabled={!gateway.isEnabled || gateway.config.skipPriorityFee || gateway.isBypassed}
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value="low">Low (25th percentile)</option>
            <option value="medium">Medium (50th percentile)</option>
            <option value="high">High (90th percentile)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Gateway automatically fetches current network priority fees
          </p>
        </div>

        {/* Jito Tip Range */}
        {(gateway.config.deliveryMethodType === 'jito' ||
          gateway.config.deliveryMethodType === 'sanctum-sender' ||
          gateway.config.deliveryMethodType === 'helius-sender') && (
          <div className="space-y-2">
            <Label htmlFor="jito-tip-range">Jito Tip Amount</Label>
            <select
              id="jito-tip-range"
              value={gateway.config.jitoTipRange}
              onChange={(e) => gateway.updateConfig({ jitoTipRange: e.target.value as JitoTipRange })}
              disabled={!gateway.isEnabled || gateway.isBypassed}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="low">Low (25th percentile)</option>
              <option value="medium">Medium (50th percentile)</option>
              <option value="high">High (75th percentile)</option>
              <option value="max">Max (99th percentile)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {gateway.config.deliveryMethodType === 'sanctum-sender' &&
                'Tip is refunded if transaction lands via RPC'}
            </p>
          </div>
        )}

        {/* Advanced Options */}
        <details className="space-y-2">
          <summary className="cursor-pointer text-sm font-medium">Advanced Options</summary>
          <div className="mt-4 space-y-4 pl-4 border-l-2 border-muted">
            <div className="flex items-center space-x-2">
              <input
                id="skip-simulation"
                type="checkbox"
                checked={gateway.config.skipSimulation}
                onChange={(e) => gateway.updateConfig({ skipSimulation: e.target.checked })}
                disabled={!gateway.isEnabled || gateway.isBypassed}
                className="w-4 h-4 text-primary bg-background border-gray-300 rounded focus:ring-primary disabled:opacity-50"
              />
              <Label htmlFor="skip-simulation" className="text-sm font-normal">
                Skip transaction simulation (manually set CU limit)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="skip-priority-fee"
                type="checkbox"
                checked={gateway.config.skipPriorityFee}
                onChange={(e) => gateway.updateConfig({ skipPriorityFee: e.target.checked })}
                disabled={!gateway.isEnabled || gateway.isBypassed}
                className="w-4 h-4 text-primary bg-background border-gray-300 rounded focus:ring-primary disabled:opacity-50"
              />
              <Label htmlFor="skip-priority-fee" className="text-sm font-normal">
                Skip priority fee fetch (manually set CU price)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expire-slots" className="text-sm">
                Transaction Expiry (slots)
              </Label>
              <input
                id="expire-slots"
                type="number"
                value={gateway.config.expireInSlots || ''}
                onChange={(e) =>
                  gateway.updateConfig({
                    expireInSlots: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                disabled={!gateway.isEnabled || gateway.isBypassed}
                placeholder="Default: 150 blocks"
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Customize how long the transaction remains valid
              </p>
            </div>
          </div>
        </details>

        {/* Info Banner */}
        {gateway.isEnabled && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Gateway Benefits</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Automatic priority fee optimization</li>
              <li>• Dual-path delivery for maximum success rates</li>
              <li>• Jito tip refunds when landing via RPC</li>
              <li>• Real-time transaction tracking</li>
              <li>• No code changes needed to adjust parameters</li>
            </ul>
          </div>
        )}

        {/* API Key Warning */}
        {!gateway.apiKey && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-1 text-yellow-800 dark:text-yellow-200">
              API Key Required
            </h4>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Set <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 rounded">
                NEXT_PUBLIC_GATEWAY_API_KEY
              </code> in your <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 rounded">
                .env.local
              </code> file.
              <br />
              Get your API key from{' '}
              <a
                href="https://gateway.sanctum.so/dashboard/settings/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Gateway Dashboard
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

export function GatewayBypassToggle() {
  const gateway = useGateway()

  return (
    <button
      onClick={() => gateway.toggleBypass()}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
        ${
          gateway.isBypassed
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }
      `}
      title={gateway.isBypassed ? 'Using Direct RPC - Click to enable Gateway' : 'Using Gateway - Click to bypass'}
    >
      <span className="relative flex h-2 w-2">
        <span className={`relative inline-flex rounded-full h-2 w-2 ${gateway.isBypassed ? 'bg-white' : 'bg-white animate-pulse'}`}></span>
      </span>
      <span className="hidden sm:inline">
        {gateway.isBypassed ? 'Direct RPC' : 'Gateway'}
      </span>
    </button>
  )
}

export function GatewayStatusBadge() {
  const gateway = useGateway()

  // Show bypass status prominently
  if (gateway.isBypassed) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-full text-xs font-medium">
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
        </span>
        Direct RPC (Gateway Bypassed)
      </div>
    )
  }

  if (!gateway.isEnabled) {
    return null
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      Gateway Active ({gateway.config.deliveryMethodType})
    </div>
  )
}
