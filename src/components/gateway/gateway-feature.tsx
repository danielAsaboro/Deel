'use client'

import { GatewayConfigPanel, GatewayStatusBadge } from './gateway-ui'
import { GatewayMonitoringDashboard } from './gateway-monitoring'
import { useState } from 'react'

export function GatewayFeature() {
  const [activeTab, setActiveTab] = useState<'config' | 'monitoring'>('config')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sanctum Gateway</h2>
          <p className="text-muted-foreground mt-1">
            Optimize transaction delivery with real-time control and observability
          </p>
        </div>
        <GatewayStatusBadge />
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'monitoring'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Transaction Monitoring
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'config' && <GatewayConfigPanel />}
      {activeTab === 'monitoring' && <GatewayMonitoringDashboard />}

      {/* Documentation Link */}
      <div className="bg-muted/50 border rounded-lg p-4">
        <h4 className="font-semibold mb-2">Learn More</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Explore the full capabilities of Sanctum Gateway and how it can improve your transaction delivery
        </p>
        <div className="flex gap-3">
          <a
            href="https://gateway.sanctum.so/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Documentation
          </a>
          <a
            href="https://gateway.sanctum.so/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-4 py-2 bg-background border rounded-md hover:bg-muted transition-colors"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
