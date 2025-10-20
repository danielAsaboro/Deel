'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Sale } from './sale-history-data-access'
import { useUsdcPrice } from '@/hooks/use-usdc-price'
import { BN } from '@coral-xyz/anchor'
import { TrendingUp, DollarSign, Users, Activity } from 'lucide-react'

export function RecentSalesActivity({ sales, limit = 10 }: { sales: Sale[]; limit?: number }) {
  const { lamportsToUsdc } = useUsdcPrice()

  const formatUSDC = (lamports: number) => {
    return lamportsToUsdc(lamports).toFixed(2)
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000
    const diff = now - timestamp

    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const displaySales = sales.slice(0, limit)

  if (displaySales.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">No sales activity yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Sales Activity
        </CardTitle>
        <CardDescription>Latest marketplace transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coupon</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displaySales.map((sale) => (
              <TableRow key={sale.publicKey.toString()}>
                <TableCell className="font-mono text-sm">
                  {sale.coupon.toString().slice(0, 8)}...
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {sale.seller.toString().slice(0, 8)}...
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {sale.buyer.toString().slice(0, 8)}...
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ${formatUSDC(sale.priceLamports.toNumber())}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatTimeAgo(sale.soldAt.toNumber())}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function MarketStatistics({
  stats,
}: {
  stats: {
    totalSales: number
    sales24h: number
    sales7d: number
    totalVolume: BN
    volume24h: BN
    volume7d: BN
    avgPrice: BN
    highestSale: { price: BN; soldAt: BN } | null
    uniqueBuyers: number
    uniqueSellers: number
    uniqueTraders: number
  }
}) {
  const { lamportsToUsdc } = useUsdcPrice()

  const formatUSDC = (lamports: number) => {
    return lamportsToUsdc(lamports).toFixed(2)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Volume"
        value={`$${formatUSDC(stats.totalVolume.toNumber())}`}
        subtitle={`${stats.totalSales} sales`}
        icon={<DollarSign className="h-4 w-4" />}
      />
      <StatCard
        title="24h Volume"
        value={`$${formatUSDC(stats.volume24h.toNumber())}`}
        subtitle={`${stats.sales24h} sales`}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <StatCard
        title="Average Price"
        value={`$${formatUSDC(stats.avgPrice.toNumber())}`}
        subtitle={`Across all sales`}
        icon={<DollarSign className="h-4 w-4" />}
      />
      <StatCard
        title="Active Traders"
        value={`${stats.uniqueTraders}`}
        subtitle={`${stats.uniqueBuyers} buyers · ${stats.uniqueSellers} sellers`}
        icon={<Users className="h-4 w-4" />}
      />
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

export function CouponSaleHistory({ sales }: { sales: Sale[] }) {
  const { lamportsToUsdc } = useUsdcPrice()

  const formatUSDC = (lamports: number) => {
    return lamportsToUsdc(lamports).toFixed(2)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (sales.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        This coupon has never been sold on the secondary market
      </div>
    )
  }

  const priceChange =
    sales.length > 1
      ? ((sales[sales.length - 1].priceLamports.toNumber() - sales[0].priceLamports.toNumber()) /
          sales[0].priceLamports.toNumber()) *
        100
      : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Sale History</p>
          <p className="text-xs text-muted-foreground">{sales.length} sales</p>
        </div>
        {sales.length > 1 && (
          <Badge variant={priceChange >= 0 ? 'default' : 'secondary'}>
            {priceChange >= 0 ? '+' : ''}
            {priceChange.toFixed(1)}%
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {sales.map((sale, index) => (
          <div
            key={sale.publicKey.toString()}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">Sale #{index + 1}</p>
              <p className="text-xs text-muted-foreground">{formatDate(sale.soldAt.toNumber())}</p>
              <div className="flex gap-2 text-xs">
                <span className="text-muted-foreground">
                  From: {sale.seller.toString().slice(0, 8)}...
                </span>
                <span className="text-muted-foreground">
                  To: {sale.buyer.toString().slice(0, 8)}...
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">${formatUSDC(sale.priceLamports.toNumber())}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SaleHistoryLoading() {
  return (
    <Card>
      <CardContent className="py-12">
        <p className="text-center text-muted-foreground">Loading sale history...</p>
      </CardContent>
    </Card>
  )
}

export function SaleHistoryError({ error }: { error: Error }) {
  return (
    <Card>
      <CardContent className="py-12">
        <p className="text-center text-destructive">
          Failed to load sale history: {error.message}
        </p>
      </CardContent>
    </Card>
  )
}
