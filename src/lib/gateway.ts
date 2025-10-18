import { Transaction, VersionedTransaction } from '@solana/web3.js'

/**
 * Gateway API Configuration
 */
export const GATEWAY_BASE_URL = 'https://tpg.sanctum.so/v1'

export type GatewayCluster = 'mainnet' | 'devnet'

export type DeliveryMethodType = 'rpc' | 'jito' | 'sanctum-sender' | 'helius-sender'

export type FeeRange = 'low' | 'medium' | 'high'

export type JitoTipRange = 'low' | 'medium' | 'high' | 'max'

/**
 * Options for buildGatewayTransaction
 */
export interface BuildGatewayTransactionOptions {
  skipSimulation?: boolean
  skipPriorityFee?: boolean
  cuPriceRange?: FeeRange
  jitoTipRange?: JitoTipRange
  expireInSlots?: number
  deliveryMethodType?: DeliveryMethodType
}

/**
 * Options for sendTransaction
 */
export interface SendTransactionOptions {
  encoding?: 'base64' | 'base58'
  startSlot?: number
}

/**
 * Response from buildGatewayTransaction
 */
export interface BuildGatewayTransactionResponse {
  jsonrpc: '2.0'
  id: string
  result: {
    transaction: string // base64-encoded transaction
    latestBlockhash: {
      blockhash: string
      lastValidBlockHeight: string
    }
  }
}

/**
 * Response from sendTransaction
 */
export interface SendTransactionResponse {
  jsonrpc: '2.0'
  id: string
  result?: string // transaction signature
  error?: {
    code: number
    message: string
  }
}

/**
 * Get the Gateway endpoint URL for a specific cluster
 */
export function getGatewayEndpoint(cluster: GatewayCluster, apiKey: string): string {
  return `${GATEWAY_BASE_URL}/${cluster}?apiKey=${apiKey}`
}

/**
 * Convert a transaction to base64-encoded wire format
 *
 * For Legacy Transactions: Allows serialization of unsigned transactions
 * by disabling signature requirements. This is necessary when sending
 * unsigned transactions to buildGatewayTransaction for optimization.
 *
 * For Versioned Transactions: Can be serialized unsigned by default.
 */
export function serializeTransaction(transaction: Transaction | VersionedTransaction): string {
  // Legacy Transactions require explicit options to serialize unsigned
  if (transaction instanceof Transaction) {
    const serialized = transaction.serialize({
      requireAllSignatures: false,  // Allow unsigned transactions
      verifySignatures: false,      // Don't verify signatures
    })
    return Buffer.from(serialized).toString('base64')
  }

  // VersionedTransactions can be serialized unsigned by default
  const serialized = transaction.serialize()
  return Buffer.from(serialized).toString('base64')
}

/**
 * Build a Gateway-optimized transaction (CLIENT-SIDE)
 *
 * This function calls the Next.js API route which proxies the request to Sanctum Gateway.
 * This keeps the API key secure on the server-side and avoids CORS issues.
 *
 * @param cluster - The Solana cluster (mainnet or devnet)
 * @param transaction - The unsigned transaction to optimize
 * @param options - Build options (priority fees, Jito tips, etc.)
 * @returns The optimized transaction from Gateway
 */
export async function buildGatewayTransaction(
  cluster: GatewayCluster,
  transaction: Transaction | VersionedTransaction,
  options: BuildGatewayTransactionOptions = {}
): Promise<BuildGatewayTransactionResponse> {
  const serializedTx = serializeTransaction(transaction)

  console.log('[Gateway Client] Building transaction:', {
    cluster,
    transactionLength: serializedTx.length,
    options
  })

  const response = await fetch('/api/gateway/build', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cluster,
      transaction: serializedTx,
      options,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }))
    console.error('[Gateway Client] Build failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData
    })
    throw new Error(`Failed to build gateway transaction: ${errorData.error || response.statusText}`)
  }

  const data = (await response.json()) as BuildGatewayTransactionResponse

  if ('error' in data) {
    const errorData = data as unknown as { error: { message: string } }
    throw new Error(`Gateway error: ${errorData.error.message}`)
  }

  return data
}

/**
 * Send a transaction through Gateway (CLIENT-SIDE)
 *
 * This function calls the Next.js API route which proxies the request to Sanctum Gateway.
 * This keeps the API key secure on the server-side and avoids CORS issues.
 *
 * @param cluster - The Solana cluster (mainnet or devnet)
 * @param signedTransaction - The base64-encoded signed transaction
 * @param options - Send options (encoding, start slot, etc.)
 * @returns The transaction signature from Gateway
 */
export async function sendGatewayTransaction(
  cluster: GatewayCluster,
  signedTransaction: string,
  options: SendTransactionOptions = { encoding: 'base64' }
): Promise<SendTransactionResponse> {
  const response = await fetch('/api/gateway/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cluster,
      signedTransaction,
      options,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`Failed to send gateway transaction: ${errorData.error || response.statusText}`)
  }

  const data = (await response.json()) as SendTransactionResponse

  if (data.error) {
    throw new Error(`Gateway delivery error: ${data.error.message}`)
  }

  return data
}

/**
 * Complete Gateway transaction flow: build -> sign -> send
 * This is a convenience function that combines all steps
 * @deprecated Use buildGatewayTransaction and sendGatewayTransaction directly
 */
export async function processGatewayTransaction(
  cluster: GatewayCluster,
  apiKey: string,
  transaction: Transaction | VersionedTransaction,
  _signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>,
  buildOptions?: BuildGatewayTransactionOptions
): Promise<{ signature: string; response: SendTransactionResponse }> {
  // Step 1: Build the transaction with Gateway optimizations
  const buildResponse = await buildGatewayTransaction(cluster, apiKey, transaction, buildOptions)

  // Step 2: Return the response for manual signing in the hook
  // Note: The actual signing depends on whether it's a legacy or versioned transaction
  // Handle signing in the hook level for better control

  return {
    signature: '',
    response: {
      jsonrpc: '2.0',
      id: `process-${Date.now()}`,
      result: buildResponse.result.transaction,
    },
  }
}

/**
 * Track transaction metrics for observability and cost analysis
 */
export interface TransactionMetrics {
  id: string
  signature?: string
  status: 'building' | 'signing' | 'sending' | 'success' | 'failed'
  startTime: number
  endTime?: number
  duration?: number
  deliveryMethod?: DeliveryMethodType
  cuPriceRange?: FeeRange
  jitoTipRange?: JitoTipRange
  error?: string
  // Cost tracking fields
  jitoTipPaid?: number // in lamports
  jitoTipRefunded?: boolean
  priorityFeePaid?: number // in lamports
  totalCost?: number // total transaction cost in lamports
  costSavings?: number // savings from tip refund in lamports
}

/**
 * Aggregate statistics for cost analysis
 */
export interface CostStatistics {
  totalTransactions: number
  successfulTransactions: number
  failedTransactions: number
  totalJitoTipsPaid: number
  totalJitoTipsRefunded: number
  totalPriorityFeesPaid: number
  totalCostSavings: number
  averageDuration: number
  successRate: number
}

const STORAGE_KEY = 'gateway-transaction-history'
const MAX_STORED_TRANSACTIONS = 100

/**
 * Enhanced transaction tracker with persistence and cost tracking
 */
class TransactionTracker {
  private transactions: Map<string, TransactionMetrics> = new Map()

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as TransactionMetrics[]
        parsed.forEach((tx) => this.transactions.set(tx.id, tx))
      }
    } catch (error) {
      console.error('Failed to load transaction history from storage:', error)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const all = this.getAll()
      // Keep only the most recent transactions
      const toStore = all.slice(0, MAX_STORED_TRANSACTIONS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch (error) {
      console.error('Failed to save transaction history to storage:', error)
    }
  }

  start(id: string, options: Partial<TransactionMetrics> = {}): TransactionMetrics {
    const metrics: TransactionMetrics = {
      id,
      status: 'building',
      startTime: Date.now(),
      ...options,
    }
    this.transactions.set(id, metrics)
    this.saveToStorage()
    return metrics
  }

  update(id: string, updates: Partial<TransactionMetrics>): void {
    const existing = this.transactions.get(id)
    if (existing) {
      const updated = { ...existing, ...updates }

      // Calculate final metrics when transaction completes
      if (updates.status === 'success' || updates.status === 'failed') {
        updated.endTime = Date.now()
        updated.duration = updated.endTime - updated.startTime

        // NOTE: Cost tracking shows ESTIMATED costs based on configuration
        // Real refund data requires checking Gateway dashboard API
        if (!updated.totalCost) {
          const estimatedJitoTip = this.estimateJitoTip(updated.jitoTipRange)
          const estimatedPriorityFee = this.estimatePriorityFee(updated.cuPriceRange)

          updated.jitoTipPaid = estimatedJitoTip
          updated.priorityFeePaid = estimatedPriorityFee

          // Cost tracking: Check Gateway dashboard for actual refund data
          updated.jitoTipRefunded = false
          updated.costSavings = 0
          updated.totalCost = estimatedJitoTip + estimatedPriorityFee
        }
      }

      this.transactions.set(id, updated)
      this.saveToStorage()
    }
  }

  private estimateJitoTip(range?: JitoTipRange): number {
    if (!range) return 0
    const estimates = {
      low: 10000, // 0.00001 SOL
      medium: 50000, // 0.00005 SOL
      high: 100000, // 0.0001 SOL
      max: 500000, // 0.0005 SOL
    }
    return estimates[range] || 0
  }

  private estimatePriorityFee(range?: FeeRange): number {
    if (!range) return 5000
    const estimates = {
      low: 5000,
      medium: 10000,
      high: 20000,
    }
    return estimates[range] || 5000
  }

  get(id: string): TransactionMetrics | undefined {
    return this.transactions.get(id)
  }

  getAll(): TransactionMetrics[] {
    return Array.from(this.transactions.values()).sort((a, b) => b.startTime - a.startTime)
  }

  getStatistics(): CostStatistics {
    const all = this.getAll()
    const successful = all.filter((tx) => tx.status === 'success')
    const failed = all.filter((tx) => tx.status === 'failed')

    // NOTE: Costs are ESTIMATED based on user configuration
    // For actual costs and refunds, check the Gateway dashboard
    const totalJitoTipsPaid = all.reduce((sum, tx) => sum + (tx.jitoTipPaid || 0), 0)
    const totalJitoTipsRefunded = all.reduce(
      (sum, tx) => sum + (tx.jitoTipRefunded && tx.costSavings ? tx.costSavings : 0),
      0
    )
    const totalPriorityFeesPaid = all.reduce((sum, tx) => sum + (tx.priorityFeePaid || 0), 0)
    const totalCostSavings = all.reduce((sum, tx) => sum + (tx.costSavings || 0), 0)

    const completedTransactions = all.filter((tx) => tx.duration !== undefined)
    const averageDuration =
      completedTransactions.length > 0
        ? completedTransactions.reduce((sum, tx) => sum + (tx.duration || 0), 0) /
          completedTransactions.length
        : 0

    return {
      totalTransactions: all.length,
      successfulTransactions: successful.length,
      failedTransactions: failed.length,
      totalJitoTipsPaid,
      totalJitoTipsRefunded,
      totalPriorityFeesPaid,
      totalCostSavings,
      averageDuration,
      successRate: all.length > 0 ? successful.length / all.length : 0,
    }
  }

  clear(): void {
    this.transactions.clear()
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }
}

export const gatewayTransactionTracker = new TransactionTracker()
