#!/usr/bin/env ts-node

/**
 * USDC Initialization Script
 *
 * This script initializes the mock USDC token mint for local/devnet testing:
 * - Creates USDC mint with 6 decimals (matches real USDC)
 * - Mints initial supply to admin wallet
 * - Creates and funds rewards pool USDC account
 * - Sets up platform wallet USDC account for marketplace fees
 *
 * Usage:
 *   ts-node init-usdc.ts
 *
 * Prerequisites:
 *   - Run generate-usdc-keys.ts first to create keypairs
 *   - Ensure anchor/keys/usdc-mint.json exists
 *   - Ensure anchor/keys/usdc-mint-authority.json exists
 */

import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import { Basic } from '../target/types/basic'
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Connection,
  Transaction,
} from '@solana/web3.js'
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

// USDC configuration
const USDC_DECIMALS = 6 // Match real USDC
const INITIAL_SUPPLY = 1_000_000 * 10 ** USDC_DECIMALS // 1M USDC for testing
const REWARDS_POOL_FUNDING = 100_000 * 10 ** USDC_DECIMALS // 100k USDC for rewards

async function initializeUsdc() {
  console.log('\n🪙 Initializing Mock USDC for Deal Discovery Platform\n')

  // Set up provider
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Basic as Program<Basic>
  const admin = provider.wallet.publicKey

  console.log('Program ID:', program.programId.toString())
  console.log('Admin Wallet:', admin.toString())
  console.log('Cluster:', provider.connection.rpcEndpoint)
  console.log('')

  // Load USDC mint and authority keypairs
  const keysDir = path.join(__dirname, '..', 'keys')
  const mintPath = path.join(keysDir, 'usdc-mint.json')
  const authorityPath = path.join(keysDir, 'usdc-mint-authority.json')

  if (!fs.existsSync(mintPath) || !fs.existsSync(authorityPath)) {
    console.error('❌ Error: USDC keypairs not found!')
    console.error('   Run: npx ts-node scripts/generate-usdc-keys.ts')
    process.exit(1)
  }

  const mintKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(mintPath, 'utf-8')))
  )
  const mintAuthority = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(authorityPath, 'utf-8')))
  )

  console.log('USDC Mint:', mintKeypair.publicKey.toString())
  console.log('Mint Authority:', mintAuthority.publicKey.toString())
  console.log('')

  try {
    // Check if mint already exists
    const existingMint = await provider.connection.getAccountInfo(
      mintKeypair.publicKey
    )

    if (existingMint) {
      console.log('✅ USDC mint already exists')
    } else {
      console.log('📝 Creating USDC mint...')

      const lamports = await getMinimumBalanceForRentExemptMint(
        provider.connection
      )

      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: admin,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          USDC_DECIMALS,
          mintAuthority.publicKey,
          null // No freeze authority for testing
        )
      )

      const sig = await provider.sendAndConfirm(tx, [mintKeypair])
      console.log('✅ USDC mint created')
      console.log('   Transaction:', sig)
      console.log('   Decimals:', USDC_DECIMALS)
    }

    // Create admin's USDC account
    const adminUsdcAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      admin
    )

    console.log('\n💳 Setting up admin USDC account...')
    console.log('   Address:', adminUsdcAccount.toString())

    const existingAdminAccount = await provider.connection.getAccountInfo(
      adminUsdcAccount
    )

    if (!existingAdminAccount) {
      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          admin,
          adminUsdcAccount,
          admin,
          mintKeypair.publicKey
        )
      )
      await provider.sendAndConfirm(tx)
      console.log('✅ Admin USDC account created')
    } else {
      console.log('✅ Admin USDC account already exists')
    }

    // Mint initial supply to admin
    console.log('\n💰 Minting initial USDC supply to admin...')
    console.log(
      '   Amount:',
      (INITIAL_SUPPLY / 10 ** USDC_DECIMALS).toLocaleString(),
      'USDC'
    )

    const mintTx = new Transaction().add(
      createMintToInstruction(
        mintKeypair.publicKey,
        adminUsdcAccount,
        mintAuthority.publicKey,
        INITIAL_SUPPLY
      )
    )

    const mintSig = await provider.sendAndConfirm(mintTx, [mintAuthority])
    console.log('✅ USDC minted to admin')
    console.log('   Transaction:', mintSig)

    // Get admin balance
    const adminBalance = await provider.connection.getTokenAccountBalance(
      adminUsdcAccount
    )
    console.log('   Admin Balance:', adminBalance.value.uiAmountString, 'USDC')

    // Set up rewards pool USDC account
    console.log('\n🏊 Setting up rewards pool USDC account...')

    const [rewardsPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('rewards_pool')],
      program.programId
    )

    const rewardsPoolUsdcAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      rewardsPoolPda,
      true // allowOwnerOffCurve = true for PDA
    )

    console.log('   Rewards Pool PDA:', rewardsPoolPda.toString())
    console.log('   USDC Account:', rewardsPoolUsdcAccount.toString())

    const existingPoolAccount = await provider.connection.getAccountInfo(
      rewardsPoolUsdcAccount
    )

    if (!existingPoolAccount) {
      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          admin,
          rewardsPoolUsdcAccount,
          rewardsPoolPda,
          mintKeypair.publicKey
        )
      )
      await provider.sendAndConfirm(tx)
      console.log('✅ Rewards pool USDC account created')
    } else {
      console.log('✅ Rewards pool USDC account already exists')
    }

    // Fund rewards pool
    console.log('\n💸 Funding rewards pool...')
    console.log(
      '   Amount:',
      (REWARDS_POOL_FUNDING / 10 ** USDC_DECIMALS).toLocaleString(),
      'USDC'
    )

    const fundTx = new Transaction().add(
      createMintToInstruction(
        mintKeypair.publicKey,
        rewardsPoolUsdcAccount,
        mintAuthority.publicKey,
        REWARDS_POOL_FUNDING
      )
    )

    const fundSig = await provider.sendAndConfirm(fundTx, [mintAuthority])
    console.log('✅ Rewards pool funded')
    console.log('   Transaction:', fundSig)

    const poolBalance = await provider.connection.getTokenAccountBalance(
      rewardsPoolUsdcAccount
    )
    console.log('   Pool Balance:', poolBalance.value.uiAmountString, 'USDC')

    // Summary
    console.log('\n✨ USDC initialization complete!\n')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('Mock USDC Setup Summary:')
    console.log('  • Mint Address:', mintKeypair.publicKey.toString())
    console.log('  • Decimals:', USDC_DECIMALS)
    console.log(
      '  • Admin Balance:',
      (INITIAL_SUPPLY / 10 ** USDC_DECIMALS).toLocaleString(),
      'USDC'
    )
    console.log(
      '  • Rewards Pool:',
      (REWARDS_POOL_FUNDING / 10 ** USDC_DECIMALS).toLocaleString(),
      'USDC'
    )
    console.log('')
    console.log('Ready for:')
    console.log('  • Creating deals priced in USDC')
    console.log('  • Minting coupons with USDC payment')
    console.log('  • Marketplace trading in USDC')
    console.log('  • Staking rewards in USDC')
    console.log('')
    console.log('⚠️  For mainnet: Replace mint address with')
    console.log('    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    console.log('═══════════════════════════════════════════════════════════\n')
  } catch (error) {
    console.error('\n❌ USDC initialization failed:', error)
    throw error
  }
}

// Run initialization
initializeUsdc()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
