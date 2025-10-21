# Deal - MonkeDAO Track Demo Script

## Introduction (45 seconds)

"Hi judges. I'm excited to present **Deal** for the MonkeDAO track. This is the next evolution of Groupon. User-owned. Borderless. Web3-powered.

We're solving a fundamental problem. Traditional discount platforms trap users with non-transferable coupons. These platforms control everything through centralized databases. Deal transforms every promotion into a collectible, tradable NFT. These NFTs grant real-world savings. Built entirely on Solana.

The market opportunity is massive. Groupon processes billions in transactions annually. But users have zero ownership. Merchants have limited control. Deals cannot be transferred. We're changing that with blockchain technology."

## The Problem (30 seconds)

"Think about the last time you bought a Groupon. You couldn't transfer it if your plans changed. You couldn't verify its authenticity. The company controlled everything.

Traditional platforms lack transparency. They lack ownership. They lack liquidity. Coupons expire worthless in databases. Users lose money. Merchants lose customers. We're fixing this with Web3."

## The Solution (1 minute)

"Deal creates a trustless, transparent, and liquid deal economy.

Here's how it works. Every coupon is a verifiable NFT with metadata - discount percentage, expiry date, merchant ID, redemption rules. True ownership lives in your wallet. Redemption is tracked on-chain with immutable proof. Coupons can be transferred, traded, or gifted freely. Unused deals aren't wasted - they have resale value.

Merchants maintain full control through our dashboard. They set supply limits. They choose expiry dates. They determine pricing. Users discover deals globally in this borderless marketplace."

## Live Demo - Step by Step (3 minutes)

### STEP 1: Navigate to Deals Page
**ACTION:** Open localhost:3000/deals

"I'm starting on the Deals page. This is our main marketplace where users discover deals globally. You can see all active promotions here. Each card shows the merchant name, discount percentage, price in SOL, and current supply available.

Notice the clean, intuitive interface. No Web3 complexity visible to users. Just browse, click, and own. This abstracts away blockchain complexity."

### STEP 2: Create a Deal (Merchant Dashboard)
**ACTION:** Scroll to "Create Deal" section at top of /deals page

"Now I'll demonstrate the merchant dashboard. I'm a coffee shop owner creating a promotion.

I enter the details:
- Title: 'Premium Latte 25% Off'
- Description: 'Enjoy our signature espresso drinks'
- Category: Food & Dining
- Discount: 25 percent
- Max Supply: 100 coupons total (merchant-controlled issuance limits)
- Expiry: 30 days from now
- Price: 0.1 SOL

**ACTION:** Click "Create Deal" button

The transaction processes through our Anchor smart contract. This mints the deal as an NFT promotion with full metadata. Notice Solana's speed - under 400 milliseconds.

**ACTION:** Wait for success toast, scroll down to see new deal appear

The deal now appears live in the marketplace. On-chain. Ready for customers. Merchants can create promotions this easily - no blockchain knowledge required."

### STEP 3: Claim a Coupon (User Wallet & Purchase Flow)
**ACTION:** Find the deal you just created, click "Claim Coupon" button

"Now I'm a customer browsing the marketplace. I find that coffee deal. I click 'Claim Coupon'.

**ACTION:** Approve wallet transaction

My wallet prompts me. I approve. Within seconds I own an NFT coupon. This NFT represents my discount. It lives in my wallet - not in a company database. I have true ownership.

**ACTION:** Navigate to localhost:3000/coupons

This is the user wallet view - all my owned coupons in one place. Each one is a real NFT compatible with any Solana wallet. I can view it in Phantom, Solflare, anywhere.

See the Transfer button? This demonstrates liquidity and ownership transfer. I can gift this to a friend. I can re-list it for resale if I can't use it. This is impossible with traditional platforms."

### STEP 4: Redemption Verification Flow
**ACTION:** Click "Show QR Code" on a coupon

"Here's our redemption verification system. The QR code appears instantly. This contains the coupon's on-chain address and cryptographic verification data.

When I visit the coffee shop, I show this QR code. The merchant scans it with their device. They verify everything on-chain - checking ownership, expiry, and redemption status.

**ACTION:** Click "Redeem" button to demonstrate

Watch this redemption transaction. It marks the coupon as used permanently on-chain. It prevents double-spending through smart contract logic. It creates an immutable audit trail. Everything happens on-chain with verifiable proof.

**ACTION:** Wait for transaction to confirm

The coupon status updates to 'Redeemed'. I cannot use it again. The merchant has cryptographic proof of redemption. No fraud possible. Single-use enforcement is automatic."

## Technical Architecture (45 seconds)

"Under the hood, we've built robust infrastructure addressing all the Web3 integration challenges.

Our Anchor program handles all business logic on-chain:
- Deal creation with metadata standards (Metaplex Token Metadata)
- Coupon minting as transferable NFTs
- Redemption verification with merchant signature checking
- Ownership transfers with security
- Supply limit enforcement
- Expiry date validation

The frontend uses Next.js 15 with React Query for real-time state management. Mobile-first responsive design ensures accessibility. QR code generation is built-in for merchant verification. Wallet abstraction makes Web3 simple for mainstream users."

## Web3 Integration Solutions (30 seconds)

"We've addressed all the key Web3 challenges:

**NFT Representation:** Metaplex Token Metadata standard ensures compatibility with all Solana marketplaces and wallets.

**Redemption Flow:** QR code-based verification with on-chain attestation. Smart contract validates merchant authority before allowing redemption.

**User Experience:** Wallet integration is streamlined. No blockchain knowledge required. Simple forms. Clear confirmations.

**Merchant Onboarding:** Easy dashboard. Fill out a form. Click create. No coding needed. Accessible to small businesses.

**Marketplace Liquidity:** Transfer functionality enables secondary markets. Unused coupons have resale value on any NFT marketplace."

## Core Features Delivered (20 seconds)

"We've implemented all required features:

✓ NFT Promotions/Coupons with full metadata
✓ Merchant Dashboard for easy creation
✓ User Wallet & Marketplace for discovery
✓ Redemption Verification Flow with QR codes
✓ Transfer capability for liquidity
✓ On-chain tracking and transparency"

## Future Roadmap (20 seconds)

"Next steps to scale this platform:

External deal APIs - Skyscanner for flights, Booking.com for hotels, Shopify for products. This creates critical mass of offers.

Social discovery layer - Users can rate deals, comment, share. Community-driven virality like RedFlagDeals.

Geo-based discovery - 'Deals near me' with location verification.

Loyalty staking - Stake NFTs for rewards and merchant tokens."

## Closing (15 seconds)

"Deal reimagines discounts for the Web3 era. We've built a fully functional, user-owned discount marketplace. Promotions become tradable assets. Merchants maintain control. Users gain unprecedented ownership and flexibility.

Thank you. I'm happy to answer questions."

---

**Total Time: ~5.5 minutes**

## Navigation Cheat Sheet

1. **Start:** localhost:3000/deals (main marketplace)
2. **Create Deal:** Scroll to top form on /deals page
3. **View Coupons:** localhost:3000/coupons (your owned NFTs)

## Quick Talking Points for Q&A

**MonkeDAO Bounty Requirements Met:**
- ✓ NFT Promotions/Coupons: Fully implemented with Metaplex standard
- ✓ Merchant Dashboard: Simple form-based creation, no blockchain knowledge needed
- ✓ User Wallet & Marketplace: Browse, purchase, own NFT coupons
- ✓ Deal Aggregator Feed: Marketplace displays all active deals (ready for API integration)
- ✓ Social Discovery Layer: Foundation built (ratings/comments ready to add)
- ✓ Redemption Verification Flow: QR code + on-chain verification
- ✓ Transfer/Trade: Built-in transfer button, works with any NFT marketplace

**Web3 Integration Challenges Addressed:**
- NFT metadata uses Metaplex Token Metadata standard for compatibility
- Redemption flow: QR code verification with on-chain attestation
- UX abstraction: Wallet integration streamlined, no crypto knowledge needed
- Merchant onboarding: Simple dashboard, accessible to small businesses
- Marketplace liquidity: Transfer functionality enables resale

**Technical Highlights:**
- Metaplex Token Metadata standard for broad NFT compatibility
- PDA-based accounts for security and deterministic addressing
- Merchant verification ensures only deal creators can redeem
- On-chain expiry enforcement prevents expired coupon usage
- Solana's 400ms blocks enable real-time user experience
- Smart contract enforces all business rules: supply limits, redemption status, ownership

**Deployment Status:**
- Deployed to devnet with working transactions
- Smart contracts verified on-chain
- Frontend hosted and accessible
- All core features functional and tested
