import { Keypair } from '@solana/web3.js'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Generate keypairs for mock USDC mint and mint authority
 *
 * This creates two keypairs:
 * 1. usdc-mint.json - The mock USDC SPL token mint address
 * 2. usdc-mint-authority.json - Authority that can mint tokens (for faucet)
 *
 * Usage: ts-node scripts/generate-usdc-keys.ts
 */

const KEYS_DIR = path.join(__dirname, '..', 'keys')
const MINT_PATH = path.join(KEYS_DIR, 'usdc-mint.json')
const AUTHORITY_PATH = path.join(KEYS_DIR, 'usdc-mint-authority.json')

// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true })
  console.log('✅ Created keys directory:', KEYS_DIR)
}

// Generate mint keypair
const mintKeypair = Keypair.generate()
fs.writeFileSync(
  MINT_PATH,
  JSON.stringify(Array.from(mintKeypair.secretKey))
)
console.log('✅ Generated USDC mint keypair')
console.log('   Address:', mintKeypair.publicKey.toBase58())
console.log('   Saved to:', MINT_PATH)

// Generate mint authority keypair
const authorityKeypair = Keypair.generate()
fs.writeFileSync(
  AUTHORITY_PATH,
  JSON.stringify(Array.from(authorityKeypair.secretKey))
)
console.log('\n✅ Generated mint authority keypair')
console.log('   Address:', authorityKeypair.publicKey.toBase58())
console.log('   Saved to:', AUTHORITY_PATH)

console.log('\n📋 Next steps:')
console.log('   1. Copy mint address to lib.rs:')
console.log(`      pub const MOCK_USDC_MINT: Pubkey = pubkey!("${mintKeypair.publicKey.toBase58()}");`)
console.log('   2. Run: pnpm init-usdc (to create the mint on-chain)')
console.log('   3. Commit usdc-mint.json, but keep usdc-mint-authority.json private!')
