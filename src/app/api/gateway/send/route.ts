import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_BASE_URL = 'https://tpg.sanctum.so/v1'

interface SendTransactionOptions {
  encoding?: 'base64' | 'base58'
  startSlot?: number
}

export async function POST(request: NextRequest) {
  try {
    const { cluster, signedTransaction, options } = await request.json() as {
      cluster: 'mainnet' | 'devnet'
      signedTransaction: string // base64-encoded signed transaction
      options?: SendTransactionOptions
    }

    // Get API key from environment
    const apiKey = process.env.SANCTUM_GATEWAY_API_KEY
    if (!apiKey) {
      console.error('[Gateway Send API] SANCTUM_GATEWAY_API_KEY not configured')
      return NextResponse.json(
        { error: 'Gateway API key not configured' },
        { status: 500 }
      )
    }

    const endpoint = `${GATEWAY_BASE_URL}/${cluster}?apiKey=${apiKey}`

    console.log(`[Gateway Send API] Sending transaction to ${cluster}`)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: `send-${Date.now()}`,
        jsonrpc: '2.0',
        method: 'sendTransaction',
        params: [signedTransaction, options || { encoding: 'base64' }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Gateway Send API] Gateway request failed:', errorText)
      return NextResponse.json(
        { error: `Gateway request failed: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (data.error) {
      console.error('[Gateway Send API] Gateway error:', data.error)
      return NextResponse.json(
        { error: data.error.message || 'Gateway error' },
        { status: 400 }
      )
    }

    console.log('[Gateway Send API] Successfully sent transaction:', data.result)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Gateway Send API] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send transaction' },
      { status: 500 }
    )
  }
}
