'use client'

import { use } from 'react'
import { PublicKey } from '@solana/web3.js'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DealDetailView } from './deal-detail-view'

export default function DealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = use(params)

  let dealPublicKey: PublicKey
  try {
    dealPublicKey = new PublicKey(dealId)
  } catch (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Deal ID</h1>
          <p className="text-muted-foreground mb-4">The deal ID provided is not valid.</p>
          <Link href="/deals">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Deals
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/deals">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to All Deals
        </Button>
      </Link>
      <DealDetailView dealPublicKey={dealPublicKey} />
    </div>
  )
}

