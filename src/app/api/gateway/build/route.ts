import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_BASE_URL = 'https://tpg.sanctum.so/v1'

interface BuildGatewayTransactionOptions {
  skipSimulation?: boolean
  skipPriorityFee?: boolean
  cuPriceRange?: 'low' | 'medium' | 'high'
  jitoTipRange?: 'low' | 'medium' | 'high' | 'max'
  expireInSlots?: number
  deliveryMethodType?: 'rpc' | 'jito' | 'sanctum-sender' | 'helius-sender'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Gateway Build API] Received request body:', JSON.stringify(body, null, 2))

    const { cluster, transaction, options } = body as {
      cluster: 'mainnet' | 'devnet'
      transaction: string // base64-encoded transaction
      options?: BuildGatewayTransactionOptions
    }

    // Validate required fields
    if (!cluster) {
      console.error('[Gateway Build API] Missing cluster')
      return NextResponse.json(
        { error: 'Missing required field: cluster' },
        { status: 400 }
      )
    }

    if (!transaction) {
      console.error('[Gateway Build API] Missing transaction')
      return NextResponse.json(
        { error: 'Missing required field: transaction' },
        { status: 400 }
      )
    }

    if (cluster !== 'mainnet' && cluster !== 'devnet') {
      console.error('[Gateway Build API] Invalid cluster:', cluster)
      return NextResponse.json(
        { error: `Invalid cluster: ${cluster}. Must be 'mainnet' or 'devnet'` },
        { status: 400 }
      )
    }

    // Get API key from environment
    const apiKey = process.env.SANCTUM_GATEWAY_API_KEY
    if (!apiKey) {
      console.error('[Gateway Build API] SANCTUM_GATEWAY_API_KEY not configured')
      return NextResponse.json(
        { error: 'Gateway API key not configured' },
        { status: 500 }
      )
    }

    const endpoint = `${GATEWAY_BASE_URL}/${cluster}?apiKey=${apiKey}`

    console.log(`[Gateway Build API] Building transaction for ${cluster}`)
    console.log(`[Gateway Build API] Transaction length:`, transaction.length)
    console.log(`[Gateway Build API] Options:`, JSON.stringify(options, null, 2))

    // Try different option strategies to find what works
    // Strategy 1: Try with empty options first
    let filteredOptions: Record<string, any> = {}

    console.log(`[Gateway Build API] Trying minimal options first...`)

    // Strategy 2: If that fails, we'll add encoding
    // Strategy 3: If that fails, we'll add other options

    // For now, let's try: encoding + no deliveryMethodType (let Gateway auto-route)
    filteredOptions = {
      encoding: 'base64', // Explicitly specify encoding
    }

    // Add boolean flags if provided
    if (options) {
      if (typeof options.skipSimulation === 'boolean') {
        filteredOptions.skipSimulation = options.skipSimulation
      }
      if (typeof options.skipPriorityFee === 'boolean') {
        filteredOptions.skipPriorityFee = options.skipPriorityFee
      }

      // Try WITHOUT deliveryMethodType - let Gateway auto-route based on project config
      // if (options.cuPriceRange) filteredOptions.cuPriceRange = options.cuPriceRange
    }

    // According to Sanctum docs, params array expects [transaction, options]
    // The options object is the second parameter in the params array
    const requestBody = {
      id: `build-${Date.now()}`,
      jsonrpc: '2.0',
      method: 'buildGatewayTransaction',
      params: [transaction, filteredOptions],
    }

    console.log(`[Gateway Build API] Request body:`, JSON.stringify(requestBody, null, 2))

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Gateway Build API] Gateway request failed:', errorText)
      return NextResponse.json(
        { error: `Gateway request failed: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    if ('error' in data) {
      console.error('[Gateway Build API] Gateway error:', JSON.stringify(data.error, null, 2))
      console.error('[Gateway Build API] Full response:', JSON.stringify(data, null, 2))

      // Provide helpful error messages
      let errorMessage = data.error.message || 'Gateway error'

      if (data.error.data?.gatewayErrorCode === 'BAD_REQUEST') {
        errorMessage += '. This might be due to: (1) Delivery method not configured in Gateway dashboard, (2) Invalid options for the delivery method, or (3) Delivery method not supported on this cluster. For devnet, make sure you have an RPC delivery method configured in your Gateway dashboard at https://gateway.sanctum.so/dashboard/delivery-methods'
      }

      return NextResponse.json(
        { error: errorMessage, details: data.error },
        { status: 400 }
      )
    }

    console.log('[Gateway Build API] Successfully built transaction')

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Gateway Build API] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to build transaction' },
      { status: 500 }
    )
  }
}
