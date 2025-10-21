import { NextRequest, NextResponse } from 'next/server'
import {
  Keypair,
  PublicKey,
  Transaction,
  Connection,
  SendTransactionError,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAccount,
} from '@solana/spl-token'
import fs from 'fs'
import path from 'path'

const MOCK_USDC_MINT = new PublicKey('HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp')
const USDC_DECIMALS = 6
const FAUCET_AMOUNT = 1000 // 1000 USDC

export async function POST(request: NextRequest) {
  try {
    const { userPublicKey, connectionUrl } = await request.json() as {
      userPublicKey: string
      connectionUrl?: string
    }

    if (!userPublicKey) {
      return NextResponse.json(
        { error: 'User public key is required' },
        { status: 400 }
      )
    }

    const userPubkey = new PublicKey(userPublicKey)
    const connection = new Connection(
      connectionUrl || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'http://localhost:8899'
    )

    // Load mint authority from keys
    const authorityPath = path.join(
      process.cwd(),
      'anchor',
      'keys',
      'usdc-mint-authority.json'
    )

    let usdcMintAuthority: Keypair
    try {
      const authorityData = JSON.parse(fs.readFileSync(authorityPath, 'utf-8'))
      usdcMintAuthority = Keypair.fromSecretKey(new Uint8Array(authorityData))
    } catch (error) {
      console.error('[Faucet API] Failed to load authority:', error)
      return NextResponse.json(
        { error: 'USDC mint authority not available. Please ensure the faucet is configured.' },
        { status: 500 }
      )
    }

    const userUsdcAccount = getAssociatedTokenAddressSync(MOCK_USDC_MINT, userPubkey)

    const transaction = new Transaction()

    // Check if user's USDC account exists
    try {
      await getAccount(connection, userUsdcAccount)
    } catch (error) {
      // Account doesn't exist, create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          usdcMintAuthority.publicKey,
          userUsdcAccount,
          userPubkey,
          MOCK_USDC_MINT
        )
      )
    }

    // Mint USDC to user
    transaction.add(
      createMintToInstruction(
        MOCK_USDC_MINT,
        userUsdcAccount,
        usdcMintAuthority.publicKey,
        FAUCET_AMOUNT * 10 ** USDC_DECIMALS
      )
    )

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = usdcMintAuthority.publicKey

    // Fully sign with authority since the backend executes the faucet mint
    transaction.sign(usdcMintAuthority)

    let signature: string
    try {
      signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      })
    } catch (error) {
      if (error instanceof SendTransactionError) {
        const logs = await error.getLogs(connection)
        console.error('[Faucet API] Transaction simulation failed:', {
          message: error.message,
          logs,
        })
        return NextResponse.json(
          {
            error: 'Transaction simulation failed',
            message: error.message,
            logs: logs ?? [],
          },
          { status: 500 }
        )
      }
      throw error
    }

    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    )

    return NextResponse.json({
      signature,
    })
  } catch (error) {
    console.error('[Faucet API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create mint transaction' },
      { status: 500 }
    )
  }
}

