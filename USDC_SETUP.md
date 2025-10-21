# Mock USDC Setup Guide

## Overview

The Deal Discovery Platform uses **mock USDC** (SPL Token) for all payments and rewards on localnet/devnet. This provides a realistic pricing experience while making development and testing easier.

### Why USDC?

- ✅ **Realistic pricing**: "$50 USDC" is clearer than "0.00023 SOL"
- ✅ **Mainnet-ready**: Switch to real USDC by changing 1 constant
- ✅ **6 decimals**: Matches real USDC token standard
- ✅ **Easy testing**: Unlimited faucet for development

---

## Quick Start

### 1. Generate USDC Keypairs (One-time)

```bash
pnpm generate-usdc-keys
```

This creates:
- `anchor/keys/usdc-mint.json` - The USDC mint address (commit this)
- `anchor/keys/usdc-mint-authority.json` - Mint authority (keep private!)

**Output**:
```
✅ Generated USDC mint keypair
   Address: HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp
   Saved to: anchor/keys/usdc-mint.json

✅ Generated mint authority keypair
   Address: 3Ns1ii8P57cX2AYgnF24DFGqo9UosEXxCLq4c9fw1ZoH
   Saved to: anchor/keys/usdc-mint-authority.json
```

### 2. Run Development Environment

```bash
./dev.sh
```

The dev script automatically:
1. Builds the Anchor program
2. Starts validator (or connects to devnet)
3. Deploys the program
4. **🪙 Initializes mock USDC**
5. Initializes platform accounts
6. Seeds demo data
7. Starts Next.js

---

## What Gets Created

### USDC Mint

```
Address: HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp
Decimals: 6 (matches real USDC)
Authority: 3Ns1ii8P57cX2AYgnF24DFGqo9UosEXxCLq4c9fw1ZoH
```

### Initial Balances

| Account | Balance | Purpose |
|---------|---------|---------|
| Admin Wallet | 1,000,000 USDC | Testing deals, marketplace |
| Rewards Pool | 100,000 USDC | Staking rewards |

---

## How It Works

### Smart Contract Integration

The program uses a constant for the USDC mint:

```rust
// anchor/programs/basic/src/lib.rs

#[constant]
pub const MOCK_USDC_MINT: Pubkey =
    pubkey!("HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp");
```

All payment instructions validate the token mint:

```rust
#[account(
    mut,
    constraint = user_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken
)]
pub user_usdc_account: Account<'info, TokenAccount>,
```

### Payment Flows Using USDC

#### 1. Mint Coupon (User → Merchant)

```rust
token::transfer(
    CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.user_usdc_account.to_account_info(),
            to: ctx.accounts.merchant_usdc_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    ),
    deal.price_lamports, // Now USDC base units (6 decimals)
)?;
```

#### 2. Buy Coupon (Buyer → Seller + Platform)

```rust
// 97.5% to seller
token::transfer(..., seller_amount)?;

// 2.5% platform fee
token::transfer(..., platform_fee)?;
```

#### 3. Staking Rewards (Pool → Staker)

```rust
token::transfer(
    CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
            from: ctx.accounts.rewards_pool_usdc_account.to_account_info(),
            to: ctx.accounts.staker_usdc_account.to_account_info(),
            authority: ctx.accounts.rewards_pool.to_account_info(),
        },
        &[&[b"rewards_pool", &[ctx.bumps.rewards_pool]]], // PDA signer
    ),
    rewards,
)?;
```

---

## Manual Initialization

If you need to initialize USDC separately:

### Generate Keys

```bash
pnpm generate-usdc-keys
```

### Deploy Program

```bash
cd anchor
anchor build
anchor deploy
cd ..
```

### Initialize USDC

```bash
pnpm init-usdc
```

This will:
1. Create the USDC mint (6 decimals)
2. Mint 1M USDC to your wallet
3. Create rewards pool USDC account
4. Fund rewards pool with 100k USDC

---

## Testing

### Get USDC Balance

```bash
spl-token balance HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp
```

### Check Rewards Pool USDC

```bash
# Get rewards pool PDA
solana address --program-derived-address rewards_pool GUudyUKazJCyL2f7dTG6Nm7EgUsro3acDtbbMWFuUrRd

# Get associated token account
# Then check balance
```

### Mint More USDC (Development)

```typescript
import { createMintToInstruction } from '@solana/spl-token';

// Requires mint authority keypair
const mintTx = new Transaction().add(
  createMintToInstruction(
    usdcMint,
    userUsdcAccount,
    mintAuthority.publicKey,
    1000 * 10**6 // 1000 USDC
  )
);

await provider.sendAndConfirm(mintTx, [mintAuthority]);
```

---

## Switching to Mainnet USDC

When deploying to mainnet, change **ONE** constant:

### In `anchor/programs/basic/src/lib.rs`:

```rust
// BEFORE (mock USDC)
#[constant]
pub const MOCK_USDC_MINT: Pubkey =
    pubkey!("HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp");

// AFTER (real USDC mainnet)
#[constant]
pub const MOCK_USDC_MINT: Pubkey =
    pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
```

Then:
1. Rebuild: `pnpm anchor-build`
2. Deploy to mainnet
3. Remove faucet page from production
4. Update documentation

---

## Troubleshooting

### Error: "Invalid payment token"

**Cause**: Transaction is using wrong USDC mint

**Fix**: Ensure your token accounts are for mint `HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp`

### Error: "Insufficient USDC balance"

**Cause**: User doesn't have enough USDC

**Fix**: Run `pnpm init-usdc` or use faucet page (http://localhost:3000/faucet)

### Program doesn't recognize USDC constant

**Cause**: Program not rebuilt after changing mock mint address

**Fix**:
```bash
pnpm anchor-build
./dev.sh  # Redeploy
```

### Rewards pool empty

**Cause**: Rewards pool USDC account not funded

**Fix**:
```bash
pnpm init-usdc
```

---

## Architecture Notes

### Why PDA Authority for Rewards?

The rewards pool is a PDA that owns its USDC token account:

```rust
#[account(mut, seeds = [b"rewards_pool"], bump)]
pub rewards_pool: Account<'info, RewardsPool>,
```

This allows the program to sign for transfers:

```rust
CpiContext::new_with_signer(
    ...,
    &[&[b"rewards_pool", &[ctx.bumps.rewards_pool]]]
)
```

### Why Keep Mint Authority Keypair?

- ✅ Easy minting during development
- ✅ Can refill rewards pool without program changes
- ✅ Faucet functionality for users

For mainnet, you won't have mint authority (Circle controls real USDC).

---

## Price Conversion Examples

### Creating a Deal

```typescript
// User wants: "$50 USDC"
// Smart contract needs: 50 * 10^6 = 50,000,000 base units

const priceUsdc = 50;
const priceBaseUnits = priceUsdc * 10**6;

await program.methods
  .createDeal(
    "Pizza Deal",
    "50% off large pizza",
    50, // discount %
    new BN(100), // max supply
    expiryTimestamp,
    "Food",
    new BN(priceBaseUnits) // 50,000,000
  )
  .rpc();
```

### Displaying Prices

```typescript
// Smart contract returns: 50000000 (base units)
// Display to user: "50.00 USDC"

const baseUnits = deal.priceLamports.toNumber(); // 50000000
const usdc = baseUnits / 10**6; // 50
console.log(`$${usdc.toFixed(2)} USDC`); // "$50.00 USDC"
```

---

## Security Considerations

### Development (Current)

- ✅ Unlimited minting possible (mint authority in repo)
- ✅ Easy testing and development
- ⚠️ **Never deploy this to mainnet**

### Production (Mainnet)

- ✅ Real USDC has no mint authority we control
- ✅ Circle manages supply
- ✅ Users must acquire USDC from exchanges
- ✅ Much more secure

---

## Related Files

- `anchor/scripts/generate-usdc-keys.ts` - Keypair generation
- `anchor/scripts/init-usdc.ts` - On-chain initialization
- `anchor/programs/basic/src/lib.rs` - USDC constant definition
- `dev.sh` - Automated setup script
- `.gitignore` - Excludes `usdc-mint-authority.json`

---

## Questions?

- Check program logs: `solana logs` (while dev.sh is running)
- Inspect accounts: `solana account <address>`
- Check token balances: `spl-token balance <mint>`
