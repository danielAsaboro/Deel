#!/usr/bin/env ts-node

/**
 * Demo Data Seeding Script
 *
 * This script creates realistic demo deals for the hackathon presentation.
 * The deals are based on real categories and pricing from external APIs.
 *
 * Usage:
 *   ts-node anchor/scripts/seed-demo-data.ts
 *
 * Or run via package.json:
 *   pnpm seed-demo
 */

import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import { Basic } from '../target/types/basic'
import { PublicKey } from '@solana/web3.js'

// USDC configuration (matches mainnet USDC: 6 decimals)
const USDC_DECIMALS = 6
const USDC_BASE_UNIT = 10 ** USDC_DECIMALS // 1 USDC = 1,000,000 base units

// Demo deals inspired by external API data
const DEMO_DEALS = [
  {
    title: 'Paris Round-Trip Flight',
    description: 'Direct flight NYC to Paris with Air France. Premium economy class, 2 checked bags included.',
    discountPercent: 40,
    maxSupply: 10,
    expiryDays: 30,
    category: 'flights',
    priceLamports: 750 * USDC_BASE_UNIT, // 750 USDC - Premium economy transatlantic
  },
  {
    title: 'Manhattan Boutique Hotel',
    description: '4-star hotel in Times Square. Breakfast included, free WiFi, rooftop bar access.',
    discountPercent: 25,
    maxSupply: 20,
    expiryDays: 60,
    category: 'hotels',
    priceLamports: 300 * USDC_BASE_UNIT, // 300 USDC - 4-star NYC hotel
  },
  {
    title: 'Authentic Italian Restaurant',
    description: '$50 value at Carbone NYC. Valid for lunch or dinner, wine pairing available.',
    discountPercent: 50,
    maxSupply: 5,
    expiryDays: 7,
    category: 'restaurants',
    priceLamports: 50 * USDC_BASE_UNIT, // 50 USDC - Restaurant voucher
  },
  {
    title: 'Premium Wireless Headphones',
    description: 'Sony WH-1000XM5 with active noise cancellation. Factory sealed, 1-year warranty.',
    discountPercent: 30,
    maxSupply: 15,
    expiryDays: 90,
    category: 'shopping',
    priceLamports: 350 * USDC_BASE_UNIT, // 350 USDC - Premium headphones
  },
  {
    title: 'SF Bay Area Weekend Getaway',
    description: 'Napa Valley hotel + wine tasting tour package. 2 nights accommodation included.',
    discountPercent: 35,
    maxSupply: 8,
    expiryDays: 45,
    category: 'hotels',
    priceLamports: 450 * USDC_BASE_UNIT, // 450 USDC - Weekend package
  },
  {
    title: 'Tokyo Return Flight Deal',
    description: 'LAX to Tokyo Narita, non-stop with ANA. Business class upgrade available.',
    discountPercent: 45,
    maxSupply: 6,
    expiryDays: 60,
    category: 'flights',
    priceLamports: 1200 * USDC_BASE_UNIT, // 1200 USDC - Business class transpacific
  },
  {
    title: 'Sushi Omakase Experience',
    description: "Premium 18-course omakase at Nobu. Chef's selection, sake pairing included.",
    discountPercent: 40,
    maxSupply: 4,
    expiryDays: 14,
    category: 'restaurants',
    priceLamports: 250 * USDC_BASE_UNIT, // 250 USDC - Premium omakase
  },
  {
    title: 'Designer Watch Collection',
    description: 'Authentic Seiko Presage automatic watch. Sapphire crystal, leather strap.',
    discountPercent: 35,
    maxSupply: 10,
    expiryDays: 120,
    category: 'shopping',
    priceLamports: 500 * USDC_BASE_UNIT, // 500 USDC - Luxury watch
  },
]

async function seedDemoData() {
  // Set up provider
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Basic as Program<Basic>
  const merchant = provider.wallet.publicKey

  console.log('\n🌱 Seeding Demo Data for Deal Discovery Platform...\n')
  console.log('Program ID:', program.programId.toString())
  console.log('Merchant:', merchant.toString())
  console.log('Network:', provider.connection.rpcEndpoint)
  console.log('')

  let successCount = 0
  let failCount = 0

  for (const deal of DEMO_DEALS) {
    try {
      const expiryTimestamp = Math.floor(Date.now() / 1000) + deal.expiryDays * 24 * 60 * 60

      // Derive deal PDA
      const [dealPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('deal'), merchant.toBuffer(), Buffer.from(deal.title)],
        program.programId
      )

      // Check if deal already exists
      const existingDeal = await provider.connection.getAccountInfo(dealPda)
      if (existingDeal) {
        console.log(`⏭️  Skipping "${deal.title}" (already exists)`)
        continue
      }

      console.log(`📝 Creating: "${deal.title}"`)
      console.log(`   Category: ${deal.category}`)
      console.log(`   Discount: ${deal.discountPercent}%`)
      console.log(`   Supply: ${deal.maxSupply}`)
      console.log(`   Price: $${(deal.priceLamports / USDC_BASE_UNIT).toFixed(2)} USDC`)
      console.log(`   Expires in: ${deal.expiryDays} days`)

      const signature = await program.methods
        .createDeal(
          deal.title,
          deal.description,
          deal.discountPercent,
          new BN(deal.maxSupply),
          new BN(expiryTimestamp),
          deal.category,
          new BN(deal.priceLamports)
        )
        .accounts({
          deal: dealPda,
          merchant: merchant,
        } as any)
        .rpc()

      console.log(`✅ Created successfully`)
      console.log(`   Deal PDA: ${dealPda.toString()}`)
      console.log(`   Transaction: ${signature}`)
      console.log('')

      successCount++

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`❌ Failed to create "${deal.title}":`, error instanceof Error ? error.message : error)
      console.log('')
      failCount++
    }
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('Demo Data Seeding Complete!')
  console.log('')
  console.log(`✅ Successfully created: ${successCount} deals`)
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} deals`)
  }
  console.log('')
  console.log('You can now:')
  console.log('  • View deals at http://localhost:3000/deals')
  console.log('  • Mint coupons as a user')
  console.log('  • Rate and comment on deals')
  console.log('  • List coupons on the marketplace')
  console.log('═══════════════════════════════════════════════════════════\n')
}

// Run seeding
seedDemoData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  })
