'use client'

import { useEffect, useState } from 'react'
import { gatewayTransactionTracker, type TransactionMetrics } from '@/lib/gateway'
import { Card } from '@/components/ui/card'
import { useCluster } from '../cluster/cluster-data-access'

export function GatewayMonitoringDashboard() {
  const [transactions, setTransactions] = useState<TransactionMetrics[]>([])
  const { getExplorerUrl } = useCluster()

  useEffect(() => {
    // Update transactions list every second
    const interval = setInterval(() => {
      setTransactions(gatewayTransactionTracker.getAll())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const stats = {
    total: transactions.length,
    success: transactions.filter((t) => t.status === 'success').length,
    failed: transactions.filter((t) => t.status === 'failed').length,
    pending: transactions.filter((t) => !['success', 'failed'].includes(t.status)).length,
    avgDuration:
      transactions.filter((t) => t.duration).reduce((acc, t) => acc + (t.duration || 0), 0) /
        (transactions.filter((t) => t.duration).length || 1) || 0,
  }

  return (
    <div className="space-y-6">
      {/* Cost Tracking Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-1 text-blue-800 dark:text-blue-200">
          About Cost Tracking
        </h4>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Cost estimates shown below are based on your configuration settings (priority fee range, Jito tip range).
          For actual Jito tip refund data and real cost metrics, check the{' '}
          <a
            href="https://gateway.sanctum.so/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Gateway Dashboard
          </a>.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Transactions</div>
          <div className="text-3xl font-bold mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Successful</div>
          <div className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">
            {stats.success}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Failed</div>
          <div className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{stats.failed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Avg Duration</div>
          <div className="text-3xl font-bold mt-1">{stats.avgDuration.toFixed(0)}ms</div>
        </Card>
      </div>

      {/* Transaction List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>

        {transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No transactions yet</p>
            <p className="text-sm mt-2">Transactions will appear here when you use Gateway</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Signature</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Delivery Method</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Priority Fee</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Jito Tip</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Duration</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="py-3 px-4">
                      {tx.signature ? (
                        <a
                          href={getExplorerUrl(`tx/${tx.signature}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-mono text-sm"
                        >
                          {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <DeliveryMethodBadge method={tx.deliveryMethod} />
                    </td>
                    <td className="py-3 px-4 text-sm">{tx.cuPriceRange || '-'}</td>
                    <td className="py-3 px-4 text-sm">{tx.jitoTipRange || '-'}</td>
                    <td className="py-3 px-4 text-sm">
                      {tx.duration ? `${tx.duration}ms` : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(tx.startTime).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Clear Button */}
      {transactions.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              gatewayTransactionTracker.clear()
              setTransactions([])
            }}
            className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md"
          >
            Clear History
          </button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: TransactionMetrics['status'] }) {
  const styles = {
    building: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    signing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
    sending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  }

  const icons = {
    building: '🔨',
    signing: '✍️',
    sending: '📤',
    success: '✅',
    failed: '❌',
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      <span>{icons[status]}</span>
      <span className="capitalize">{status}</span>
    </span>
  )
}

function DeliveryMethodBadge({ method }: { method?: string }) {
  if (!method) return <span className="text-muted-foreground text-sm">-</span>

  const labels: Record<string, string> = {
    'sanctum-sender': 'Sanctum Sender',
    'helius-sender': 'Helius Sender',
    jito: 'Jito',
    rpc: 'RPC',
  }

  const colors: Record<string, string> = {
    'sanctum-sender': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
    'helius-sender': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    jito: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    rpc: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
  }

  return (
    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${colors[method] || colors.rpc}`}>
      {labels[method] || method}
    </span>
  )
}
