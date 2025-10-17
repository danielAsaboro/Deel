#!/usr/bin/env ts-node

/**
 * Platform Initialization Script
 *
 * This script initializes all necessary platform accounts:
 * - Rewards pool for staking
 * - Funds the rewards pool with SOL for payouts
 *
 * Usage:
 *   ts-node initialize.ts
 *
 * Or run via dev.sh which calls this automatically
 */

import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import { Basic } from '../target/types/basic'
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'

const REWARDS_RATE_PER_DAY = new BN(100_000) // 100k lamports per day (~0.0001 SOL)
const POOL_FUNDING_AMOUNT = 10 * LAMPORTS_PER_SOL // 10 SOL for rewards

async function initialize() {
  // Set up provider
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Basic as Program<Basic>
  const admin = provider.wallet.publicKey

  console.log('\n🚀 Initializing Deal Discovery Platform...\n')
  console.log('Program ID:', program.programId.toString())
  console.log('Admin:', admin.toString())
  console.log('')

  // Derive rewards pool PDA
  const [rewardsPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('rewards_pool')],
    program.programId
  )

  console.log('Rewards Pool PDA:', rewardsPoolPda.toString())

  try {
    // Check if rewards pool already exists
    const existingPool = await provider.connection.getAccountInfo(rewardsPoolPda)

    if (existingPool) {
      console.log('✅ Rewards pool already initialized')

      // Fetch and display pool info
      const poolAccount = await program.account.rewardsPool.fetch(rewardsPoolPda)
      console.log('   Total Staked:', poolAccount.totalStaked.toString())
      console.log('   Reward Rate:', poolAccount.rewardRatePerDay.toString(), 'lamports/day')
      console.log('   Admin:', poolAccount.admin.toString())

      // Check pool balance
      const poolBalance = await provider.connection.getBalance(rewardsPoolPda)
      console.log('   Pool Balance:', (poolBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL')

      // Fund pool if balance is low
      if (poolBalance < POOL_FUNDING_AMOUNT) {
        console.log('\n💰 Funding rewards pool with additional SOL...')
        const fundAmount = POOL_FUNDING_AMOUNT - poolBalance

        const fundTx = await provider.sendAndConfirm(
          new anchor.web3.Transaction().add(
            SystemProgram.transfer({
              fromPubkey: admin,
              toPubkey: rewardsPoolPda,
              lamports: fundAmount,
            })
          )
        )

        console.log('✅ Pool funded with', (fundAmount / LAMPORTS_PER_SOL).toFixed(4), 'SOL')
        console.log('   Transaction:', fundTx)

        const newBalance = await provider.connection.getBalance(rewardsPoolPda)
        console.log('   New Balance:', (newBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL')
      }
    } else {
      console.log('📝 Initializing rewards pool...')

      // Initialize rewards pool
      const initTx = await program.methods
        .initializeRewardsPool(REWARDS_RATE_PER_DAY)
        .accounts({
          rewardsPool: rewardsPoolPda,
          admin: admin,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc()

      console.log('✅ Rewards pool initialized')
      console.log('   Transaction:', initTx)
      console.log('   Reward Rate:', REWARDS_RATE_PER_DAY.toString(), 'lamports/day')

      // Fund the rewards pool
      console.log('\n💰 Funding rewards pool with', POOL_FUNDING_AMOUNT / LAMPORTS_PER_SOL, 'SOL...')

      const fundTx = await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(
          SystemProgram.transfer({
            fromPubkey: admin,
            toPubkey: rewardsPoolPda,
            lamports: POOL_FUNDING_AMOUNT,
          })
        )
      )

      console.log('✅ Pool funded')
      console.log('   Transaction:', fundTx)

      const poolBalance = await provider.connection.getBalance(rewardsPoolPda)
      console.log('   Pool Balance:', (poolBalance / LAMPORTS_PER_SOL).toFixed(4), 'SOL')
    }

    console.log('\n✨ Platform initialization complete!\n')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('Platform is ready for:')
    console.log('  • Creating deals')
    console.log('  • Minting coupon NFTs')
    console.log('  • Staking coupons for rewards')
    console.log('  • Secondary marketplace trading')
    console.log('  • Sanctum Gateway transaction optimization')
    console.log('═══════════════════════════════════════════════════════════\n')

  } catch (error) {
    console.error('\n❌ Initialization failed:', error)
    throw error
  }
}

// Run initialization
initialize()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
