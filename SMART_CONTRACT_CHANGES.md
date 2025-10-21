# Smart Contract Changes Summary

## Migration to Mock USDC (November 2024)

### Overview

The Deal Discovery Platform smart contract has been migrated from SOL-based payments to **mock USDC (SPL Token)** for all transactions. This provides realistic pricing and a production-ready foundation.

---

## ✅ Completed Changes

### 1. Core Infrastructure

**New Constant** (`lib.rs:14-20`):
```rust
/// Mock USDC mint address for devnet/localnet testing
/// 6 decimals (matches real USDC on mainnet)
#[constant]
pub const MOCK_USDC_MINT: Pubkey =
    pubkey!("HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp");
```

**New Error Code** (`lib.rs:904-905`):
```rust
#[msg("Invalid payment token - must use platform USDC")]
InvalidPaymentToken,
```

### 2. Payment Instructions Updated

All 4 payment flows converted from `system_program::transfer` to `token::transfer`:

#### `mint_coupon` (lib.rs:85-98)
**Before**: SOL payment user → merchant
```rust
transfer(transfer_ctx, deal.price_lamports)?;
```

**After**: USDC payment user → merchant
```rust
token::transfer(
    CpiContext::new(...),
    deal.price_lamports, // Now USDC base units (6 decimals)
)?;
```

#### `buy_coupon` (lib.rs:299-323)
**Before**: 2 SOL transfers (seller + platform)
**After**: 2 USDC transfers with proper split:
- 97.5% to seller
- 2.5% to platform wallet

#### `unstake_coupon` (lib.rs:403-416)
**Before**: SOL rewards from pool
**After**: USDC rewards with PDA signer:
```rust
token::transfer(
    CpiContext::new_with_signer(
        ...,
        &[&[b"rewards_pool", &[ctx.bumps.rewards_pool]]]
    ),
    rewards,
)?;
```

#### `claim_rewards` (lib.rs:437-448)
**Before**: SOL rewards
**After**: USDC rewards (same as unstake)

### 3. Account Structs Updated

All payment contexts now include USDC token accounts with validation:

#### `MintCoupon` (lib.rs:520-532)
```rust
// USDC payment accounts
#[account(
    mut,
    constraint = user_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken
)]
pub user_usdc_account: Account<'info, TokenAccount>,

#[account(
    mut,
    constraint = merchant_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken,
    constraint = merchant_usdc_account.owner == deal.merchant @ DealError::UnauthorizedMerchant
)]
pub merchant_usdc_account: Account<'info, TokenAccount>,
```

#### `BuyCoupon` (lib.rs:689-707)
Added 3 USDC accounts:
- `buyer_usdc_account` - Buyer pays from
- `seller_usdc_account` - Seller receives payment
- `platform_usdc_account` - Platform receives 2.5% fee

#### `UnstakeCouponCtx` (lib.rs:801-812)
Added 2 USDC accounts:
- `rewards_pool_usdc_account` - Pool owned by PDA
- `staker_usdc_account` - Staker receives rewards

#### `ClaimRewardsCtx` (lib.rs:829-840)
Same as unstake (pool → staker)

### 4. Bug Fixes

#### Rating Update Bug (lib.rs:190-205)
**Before**: Always incremented totals, even when updating existing rating
```rust
deal.total_ratings += 1;  // WRONG!
deal.rating_sum += rating as u64;
```

**After**: Checks if rating exists, properly updates
```rust
if deal_rating.rating != 0 {
    // Update: subtract old, add new
    deal.rating_sum = deal.rating_sum
        .checked_sub(deal_rating.rating as u64)
        .unwrap()
        .checked_add(rating as u64)
        .unwrap();
} else {
    // New rating
    deal.total_ratings += 1;
    deal.rating_sum += rating as u64;
}
```

### 5. Documentation Added

**Inline Comments** (lib.rs):
- `transfer_coupon` - Explains logical vs SPL ownership (lib.rs:169-176)
- `list_coupon` - Explains listing_count collision prevention (lib.rs:241-247)
- `BuyCoupon` - Explains Sale PDA design (lib.rs:628-634)

---

## 📦 Supporting Infrastructure

### Keypair Generation

**File**: `anchor/scripts/generate-usdc-keys.ts`

Generates:
- `anchor/keys/usdc-mint.json` - Public mint address
- `anchor/keys/usdc-mint-authority.json` - Private authority (gitignored)

### USDC Initialization

**File**: `anchor/scripts/init-usdc.ts`

Creates:
1. USDC mint with 6 decimals
2. Admin USDC account (1M USDC)
3. Rewards pool USDC account (100k USDC)
4. Mints initial supply using authority keypair

### Dev Script Integration

**File**: `dev.sh` (lines 259-273)

Added USDC initialization step:
```bash
# Initialize USDC mint
echo -e "${CYAN}🪙 Initializing mock USDC...${NC}"
cd anchor
ANCHOR_PROVIDER_URL=$RPC_URL ANCHOR_WALLET=~/.config/solana/id.json \
  npx ts-node scripts/init-usdc.ts
USDC_STATUS=$?
cd ..

if [ $USDC_STATUS -ne 0 ]; then
    echo -e "${RED}❌ USDC initialization failed${NC}"
    exit 1
fi
```

### Package Scripts

**File**: `package.json`

Added:
```json
"init-usdc": "ts-node anchor/scripts/init-usdc.ts",
"generate-usdc-keys": "ts-node anchor/scripts/generate-usdc-keys.ts",
```

---

## 🔄 Breaking Changes

### For Frontend

All transaction builders must now:

1. **Pass USDC token accounts** instead of wallet addresses
2. **Convert prices** to base units (multiply by 10^6)
3. **Get associated token addresses** for users/merchants

#### Example: Mint Coupon (BEFORE)

```typescript
await program.methods
  .mintCoupon(dealPda, metadataUri)
  .accounts({
    deal: dealPda,
    merchant: merchantWallet,  // ❌ Wallet address
    user: userWallet,           // ❌ Wallet address
    systemProgram: SystemProgram.programId,
    // ...
  })
  .rpc();
```

#### Example: Mint Coupon (AFTER)

```typescript
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

// Get USDC token accounts
const userUsdcAccount = getAssociatedTokenAddressSync(
  MOCK_USDC_MINT,
  userWallet
);

const merchantUsdcAccount = getAssociatedTokenAddressSync(
  MOCK_USDC_MINT,
  merchantWallet
);

await program.methods
  .mintCoupon(dealPda, metadataUri)
  .accounts({
    deal: dealPda,
    userUsdcAccount,           // ✅ Token account
    merchantUsdcAccount,       // ✅ Token account
    merchant: merchantWallet,  // ✅ Still needed for validation
    user: userWallet,
    tokenProgram: TOKEN_PROGRAM_ID,
    // ...
  })
  .rpc();
```

### For Tests

All test files must:

1. **Initialize USDC mint** before tests
2. **Create USDC accounts** for test wallets
3. **Mint USDC** to test wallets
4. **Update assertions** (USDC balances instead of SOL)

---

## 🚀 Mainnet Migration Path

To switch from mock USDC to real USDC on mainnet:

### Step 1: Update Constant (1 line change)

```rust
// In anchor/programs/basic/src/lib.rs

// BEFORE (mock)
pub const MOCK_USDC_MINT: Pubkey =
    pubkey!("HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp");

// AFTER (mainnet)
pub const MOCK_USDC_MINT: Pubkey =
    pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
```

### Step 2: Rebuild and Deploy

```bash
pnpm anchor-build
anchor deploy --provider.cluster mainnet
```

### Step 3: Frontend Updates

- Remove faucet page
- Update UI to show "USDC" instead of "Mock USDC"
- Add instructions for users to acquire USDC

### Step 4: Operational Changes

- **Rewards pool**: Must be funded with real USDC (no minting)
- **Platform fees**: Collected in real USDC
- **Users**: Must have USDC in wallets

---

## 🧪 Testing Checklist

Before deploying, verify:

- [ ] USDC mint created (6 decimals)
- [ ] Rewards pool USDC account exists and is funded
- [ ] Platform wallet USDC account exists
- [ ] All payment flows work (mint, buy, stake, claim)
- [ ] Invalid token mint is rejected (error: InvalidPaymentToken)
- [ ] Rating update bug is fixed
- [ ] Sale PDAs created correctly
- [ ] Marketplace transactions complete successfully

---

## 📊 Impact Analysis

### Lines Changed: ~300+

**Added**:
- USDC constant definition (7 lines)
- USDC token account validation (60+ lines across 4 contexts)
- Token transfer calls (80+ lines replacing system transfers)
- Documentation comments (40+ lines)
- init-usdc.ts script (220 lines)
- generate-usdc-keys.ts script (50 lines)

**Modified**:
- 4 payment instruction handlers
- 4 account context structs
- dev.sh integration
- .gitignore (exclude mint authority)

**Removed**:
- system_program::transfer imports (2 lines)
- SOL balance checks (future)

### Compilation Status: ✅ CLEAN

```bash
$ anchor build
✓ Compiling basic v0.1.0
✓ Finished release [optimized] target(s) in 5.19s
✓ 2 warnings (unused imports - cosmetic)
```

---

## 📝 Next Steps

1. **Update test suite** - Modify all tests for USDC
2. **Update frontend** - Transaction builders + price displays
3. **Create faucet page** - UI for minting test USDC
4. **Run integration tests** - Full flow verification
5. **Document migration** - For team/community

---

## 🔗 Related Documents

- [USDC_SETUP.md](./USDC_SETUP.md) - Full setup guide
- [README.md](./README.md) - Project overview
- [dev.sh](./dev.sh) - Development script

---

**Last Updated**: November 18, 2024
**Status**: Smart contract migration ✅ COMPLETE
**Next**: Test suite updates 🚧
