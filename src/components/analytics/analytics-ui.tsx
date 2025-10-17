'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MerchantAnalytics } from './analytics-data-access'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function AnalyticsDashboard({ analytics }: { analytics: MerchantAnalytics }) {
  const formatSOL = (lamports: number) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(4)
  }

  // Prepare chart data
  const revenueChartData = analytics.dealPerformance.map(deal => ({
    name: deal.dealTitle.length > 20 ? deal.dealTitle.substring(0, 20) + '...' : deal.dealTitle,
    revenue: parseFloat(formatSOL(deal.revenue.toNumber())),
    minted: deal.couponsMinted,
  }))

  const redemptionData = [
    { name: 'Redeemed', value: analytics.totalRedemptions, color: '#22c55e' },
    { name: 'Unredeemed', value: analytics.totalCouponsMinted - analytics.totalRedemptions, color: '#94a3b8' }
  ]

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Deals"
          value={analytics.totalDeals.toString()}
          subtitle={`${analytics.activeDeals} active`}
        />
        <MetricCard
          title="Coupons Minted"
          value={analytics.totalCouponsMinted.toString()}
          subtitle={`${analytics.totalRedemptions} redeemed (${analytics.redemptionRate.toFixed(1)}%)`}
        />
        <MetricCard
          title="Total Revenue"
          value={`${formatSOL(analytics.totalRevenue.toNumber())} SOL`}
          subtitle="From coupon sales"
        />
        <MetricCard
          title="Average Rating"
          value={analytics.averageRating.toFixed(1)}
          subtitle="⭐ Out of 5.0"
        />
      </div>

      {/* Charts Section */}
      {analytics.dealPerformance.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Deal Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Deal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} className="text-xs" />
                  <YAxis label={{ value: 'SOL', angle: -90, position: 'insideLeft' }} className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue (SOL)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Redemption Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Coupon Redemption Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={redemptionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${entry.value} (${(entry.percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {redemptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deal Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.dealPerformance.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No deals created yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal Title</TableHead>
                  <TableHead className="text-right">Minted</TableHead>
                  <TableHead className="text-right">Revenue (SOL)</TableHead>
                  <TableHead className="text-right">Redemption Rate</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.dealPerformance.map((deal) => (
                  <TableRow key={deal.dealPublicKey.toString()}>
                    <TableCell className="font-medium">{deal.dealTitle}</TableCell>
                    <TableCell className="text-right">{deal.couponsMinted}</TableCell>
                    <TableCell className="text-right">
                      {formatSOL(deal.revenue.toNumber())}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={deal.redemptionRate > 50 ? 'default' : 'secondary'}>
                        {deal.redemptionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {deal.totalRatings > 0 ? (
                        <span>
                          ⭐ {deal.averageRating.toFixed(1)} ({deal.totalRatings})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No ratings</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{deal.totalComments}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total Unique Customers</span>
            <span className="text-2xl font-bold">{analytics.totalCustomers}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Average Coupons per Customer</span>
            <span className="text-2xl font-bold">
              {analytics.totalCustomers > 0
                ? (analytics.totalCouponsMinted / analytics.totalCustomers).toFixed(1)
                : '0'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Average Revenue per Customer</span>
            <span className="text-2xl font-bold">
              {analytics.totalCustomers > 0
                ? formatSOL(
                    analytics.totalRevenue.toNumber() / analytics.totalCustomers
                  )
                : '0'}{' '}
              SOL
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

export function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded animate-pulse w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function AnalyticsError({ error }: { error: Error }) {
  return (
    <Card>
      <CardContent className="py-8">
        <p className="text-destructive text-center">Failed to load analytics: {error.message}</p>
      </CardContent>
    </Card>
  )
}
