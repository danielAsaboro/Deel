# Deal - MonkeDAO Track Demo Script

## Introduction (45 seconds)

"Hi judges, my name is Daniel

I'm excited to present **Deal** for the MonkeDAO track.

This is the next evolution of Groupon.

It's User-owned.
Borderless.
and Web3-powered.

We're solving a fundamental problem.

Traditional discount platforms trap users with non-transferable coupons.
These platforms control everything through centralized databases.

Deal transforms every promotion into a collectible, tradable NFT.

These NFTs grant real-world savings.
Built entirely on Solana with real USDC transactions.

The market opportunity is massive.

Groupon processes billions in transactions annually.
But users have zero ownership.
Merchants have limited control.
Deals cannot be transferred.

We're changing that with blockchain technology."

====================

## The Problem (30 seconds)

"Think about the last time you bought a Groupon.

You couldn't transfer it if your plans changed.
You couldn't verify its authenticity.
The company controlled everything.
There was no community trust system.

Traditional platforms lack transparency.

- They lack ownership.
- They lack liquidity.
- They lack social proof.

Coupons expire worthless in databases.
Users lose money.
Merchants lose customers.

We're fixing this with Web3.

====================

## The Solution (1 minute)

"Deal creates a trustless, transparent, and liquid deal economy.

Here's how it works.

Every coupon is a verifiable NFT with metadata - discount percentage, expiry date, merchant ID, redemption rules.

True ownership lives in your wallet.
All transactions use USDC - the stablecoin standard.

Redemption is tracked on-chain with immutable proof.
Coupons can be transferred, traded, or gifted freely.

Users discover deals globally in this borderless marketplace with social features - star ratings, comments, and sharing.

Unused deals have real resale value on our secondary marketplace.
You can even stake your coupons to earn rewards.

Merchants maintain full control through our dashboard.

They set supply limits.
They choose expiry dates.
They determine pricing in USDC.

Everything is transparent on-chain.

====================

## Live Demo - Step by Step (4-5 minutes)

### Bounty Requirements Coverage:

- **NFT Promotions/Coupons:** Demonstrated in STEP 4 (Claim) and STEP 5 (View/Redeem)
- **Merchant Dashboard:** Demonstrated in STEP 2 (Create Deal)
- **User Wallet & Marketplace:** Demonstrated in STEP 1 (Browse), STEP 4 (Purchase), STEP 6 (Secondary Market)
- **Deal Aggregator Feed:** Demonstrated in STEP 1 (External APIs)
- **Social Discovery Layer:** Demonstrated in STEP 3 (Ratings, Comments, Sharing)
- **Redemption Verification Flow:** Demonstrated in STEP 5 (QR Code & Merchant Verification)
- **Reward Staking/Cashback:** Demonstrated in STEP 7 (Staking System)

====================

### STEP 0: Get Test USDC (Faucet)

**ACTION:** Navigate to localhost:3000/faucet

"First, let's get some test USDC. We've implemented a faucet for demonstration purposes.
This mints fake USDC that works identically to real USDC on mainnet.

**ACTION:** Connect wallet if not connected

I connect my wallet. I can see my current USDC balance here.

**ACTION:** Click 'Get 1,000 USDC' button

The faucet mints 1,000 USDC instantly to my wallet.

This shows how we handle real stablecoin transactions. On mainnet, users would purchase USDC through any exchange.

The smart contracts are identical.

**ACTION:** Wait for transaction to complete

Transaction confirmed.

I now have USDC to interact with the platform.

This is critical - all deals are priced in USDC, not volatile SOL tokens.

====================

### STEP 1: Deal Aggregator Feed & User Marketplace (Bounty Requirement #3 & #4)

**ACTION:** Navigate to localhost:3000/deals

"Now let's explore the Deals marketplace.

This demonstrates our deal aggregator feed and user browsing experience.

Notice the advanced filtering system.

Users can search by keyword, filter by category - flights, hotels, shopping, restaurants.
Sort by price, discount percentage, popularity, or expiry date.
We even support geo-based discovery with nearby deals.

**ACTION:** Scroll to show deals

Each deal card displays rich information:

- Merchant name and title
- Discount percentage highlighted in green
- Price in USDC - real stablecoin pricing
- Supply availability with progress bar
- Star ratings showing community trust
- Comment count for social proof
- Share buttons for viral growth

**ACTION:** Toggle to show external deals if visible

We've integrated external APIs to populate real-world deals:

- Amadeus API for flights and hotels
- RapidAPI Booking.com for accommodations
- TheMealDB for restaurant deals
- FakeStore API for shopping

These external deals appear alongside blockchain deals.
Users can discover any deal and merchants can mint them on-chain.
This creates critical mass immediately."

====================

### STEP 2: Merchant Dashboard (Bounty Requirement #2)

**ACTION:** Click "Create New Deal" button

"Now I'll demonstrate the merchant dashboard.
This shows how merchants easily create promotions that automatically mint NFT coupons.

**ACTION:** Fill out the form

I enter the details:

- Title: 'Premium Latte 25% Off'
- Description: 'Enjoy our signature espresso drinks at our downtown location'
- Category: Food & Dining
- Discount: 25 percent
- Max Supply: 100 coupons total (merchant-controlled issuance limits)
- Expiry: 30 days from now
- Price: 5 USDC (real stablecoin pricing)

**ACTION:** Click "Create Deal" button, approve wallet transaction

The transaction processes through our Anchor smart contract.

This creates the deal with full metadata on-chain.
Notice Solana's speed - under 400 milliseconds to finality.

**ACTION:** Wait for success toast

Success! The deal is now live on-chain. Merchants can create promotions this easily - no blockchain knowledge required. The form handles all complexity.

====================

### STEP 3: Social Discovery Layer (Bounty Requirement #5)

**ACTION:** Click on a deal card to view full details

"This demonstrates our social discovery layer with ratings, comments, and sharing features.
Each deal has a dedicated page with community engagement tools.

**ACTION:** Scroll through deal detail page

At the top, we show:

- Full deal description and merchant information
- Current stats: claimed count, available supply, expiry countdown
- Price in USDC with supply progress bar
- Average star rating calculated on-chain

**ACTION:** Scroll to ratings section

Here's our social discovery layer. Users can rate deals from 1 to 5 stars.
These ratings are stored on-chain and aggregated to show average ratings.
This builds community trust.

**ACTION:** Rate the deal with 4 or 5 stars, click submit

I'll rate this deal 5 stars. The transaction submits to the blockchain.
Ratings are permanent and verifiable.

**ACTION:** Scroll to comments section

Users can also comment on deals. This creates community discussions about quality, merchant reliability, and redemption experiences. All comments are stored on-chain with full transparency.

**ACTION:** Type a comment like 'Great deal! Used it yesterday at the downtown location.' and submit

Comments are stored on-chain with timestamps and author addresses. 
This prevents fake reviews - every comment is tied to a real wallet.

**ACTION:** Click share button

The share feature lets users spread deals virally. 
Share to Twitter with pre-filled text, or copy the link. 
Each deal has a unique URL making it shareable across Web2 platforms.

**ACTION:** Go back to deals page

====================

### STEP 4: NFT Coupon Minting (Bounty Requirement #1 - Part 1)

**ACTION:** Click "Claim Coupon" on a deal

"This demonstrates NFT coupon minting. When users claim a coupon, a transferable NFT is minted with full metadata.

**ACTION:** Approve wallet transaction

My wallet prompts me to pay 5 USDC. I approve. Within 400 milliseconds I own an NFT coupon. 
This NFT represents my discount. It lives in my wallet - not in a company database. 
I have true ownership.

**ACTION:** Wait for transaction confirmation

Transaction confirmed. The coupon is minted as a unique NFT. 
The deal's supply counter decrements on-chain automatically.

====================

### STEP 5: Redemption Verification Flow (Bounty Requirement #6 & #1 - Part 2)

**ACTION:** Navigate to localhost:3000/coupons

"This demonstrates the redemption verification flow and NFT coupon management. 
Every coupon is a real NFT with on-chain verification.

Each coupon shows:

- The deal it's for with discount percentage
- Price I paid in USDC
- Expiry date
- Redemption status
- Actions: Show QR Code, Transfer, Redeem

**ACTION:** Click "Show QR Code" on a coupon

The QR code appears instantly. This contains the coupon's on-chain address and cryptographic verification data.

When I visit the merchant, I show this QR code. The merchant scans it with their device. 
They verify everything on-chain - checking ownership, expiry, and redemption status.

**ACTION:** Click "Redeem" button to demonstrate

Watch this redemption transaction. The merchant signs to verify they're the deal creator. 
The smart contract marks the coupon as used permanently. 
It prevents double-spending through on-chain logic. 
It creates an immutable audit trail.

**ACTION:** Wait for transaction to confirm

The coupon status updates to 'Redeemed'. I cannot use it again. 
The merchant has cryptographic proof of redemption. 
No fraud possible. 
Single-use enforcement is automatic.

**ACTION:** Show a different unredeemed coupon

For unused coupons, I have options. 
I can transfer it to a friend as a gift. 
Or I can list it on the secondary marketplace for resale. 

This is impossible with traditional coupons."

====================

### STEP 6: Secondary Marketplace for Re-listing (Bounty Requirement #3 - Part 2)

**ACTION:** Navigate to localhost:3000/marketplace

"This demonstrates the marketplace liquidity and re-listing capability. 
Users can trade unused coupon NFTs, creating real resale value.

**ACTION:** Show active listings

Active listings show:

- The deal details
- Original price vs listing price
- Seller information
- Time listed

**ACTION:** (Optional) List a coupon or buy a listed coupon

Buying automatically transfers ownership and splits payment between seller and platform (2.5% fee).
 All tracked on-chain with full sale history.
Listing a coupon takes one transaction. 

This creates real liquidity. Unused coupons have value. 
Users can recoup their investment if plans change.

====================

### STEP 7: Reward Staking System (Bounty Requirement #7 - Optional)

**ACTION:** Navigate to localhost:3000/staking

"This demonstrates the optional reward staking feature. 
Users can stake unredeemed coupons to earn daily rewards.

Users can stake unredeemed coupons to earn daily rewards from the rewards pool. 
The longer you stake, the more you earn. 
This gamifies the platform and rewards active community members.

**ACTION:** Show staking interface with any staked coupons

Staked coupons are locked but continue earning. 
Users can claim rewards anytime or unstake to get their coupon back. 
All calculations happen on-chain transparently.

====================

### STEP 8: Analytics Dashboard (Bonus Feature)

**ACTION:** Navigate to localhost:3000/analytics

"This is a bonus feature providing full transparency into platform metrics.

Charts show:

- Total deals created over time
- Coupons minted volume
- Redemption rates
- Active users
- Top merchants
- Top deals by popularity

Everything is calculated from on-chain data. No centralized database. 
Full transparency for users and investors.

====================

## Technical Architecture (1 minute)

"Under the hood, we've built comprehensive infrastructure addressing all the Web3 integration challenges.

Our Anchor program handles all business logic on-chain with 13 instructions across 8 account types:

**Core Features:**

- Deal creation with full metadata
- Coupon minting as transferable NFTs using SPL Token standard
- USDC payment integration with SPL Token transfers
- Redemption verification with merchant signature checking
- Ownership transfers with security
- Supply limit and expiry enforcement

**Marketplace Features:**

- List coupons for secondary sale
- Buy coupons with automatic ownership transfer
- Platform fee collection (2.5%)
- Complete sale history on-chain

**Staking Features:**

- Rewards pool initialization
- Stake unredeemed coupons
- Daily reward calculation
- Claim and unstake with rewards

**Social Features:**

- On-chain star ratings (1-5 stars) with aggregation
- Comment system (500 char limit per comment)
- All ratings and comments are permanent and verifiable

The frontend uses Next.js 15 with App Router, React Query for state management, and Tailwind CSS. QR code generation is built-in. Wallet abstraction makes Web3 simple for mainstream users.

External API integration provides:

- Amadeus for flights/hotels
- RapidAPI for accommodations
- TheMealDB for restaurants
- FakeStore for shopping

All aggregated through our unified API endpoint with 5-minute caching.

====================

## Web3 Integration Solutions (45 seconds)

"We've addressed all the key Web3 challenges from the MonkeDAO bounty:

**NFT Representation:** Each coupon is a transferable SPL Token with Metaplex Token Metadata standard. Compatible with all Solana wallets and marketplaces.

**Redemption Flow:** QR code verification with on-chain attestation. Smart contract validates merchant authority and prevents double-redemption automatically.

**User Experience:** USDC pricing eliminates volatility concerns. Wallet integration is streamlined. No blockchain knowledge required. Simple forms. Clear confirmations. Real stablecoin transactions.

**Merchant Onboarding:** Easy dashboard accessible to anyone. Fill out a form. Click create. No coding needed. Small businesses can onboard in minutes.

**Marketplace Liquidity:** Full secondary market with listing, buying, and sale history. Transfer functionality enables gifts. Unused coupons have real resale value.

**Social Trust:** On-chain ratings and comments build community trust. Share deals virally on Twitter and Web2 platforms.

**External Integration:** API aggregator pulls real deals from flights, hotels, restaurants, shopping. Ready to convert to on-chain deals."

## Core Features Delivered (30 seconds)

"We've implemented ALL required features plus bonus features:

✅ NFT Promotions/Coupons with full metadata and IPFS storage
✅ Merchant Dashboard for easy creation with USDC pricing
✅ User Wallet & Marketplace for discovery and management
✅ Deal Aggregator Feed with 4 external API integrations
✅ Social Discovery Layer with ratings, comments, and sharing
✅ Redemption Verification Flow with QR codes
✅ Transfer capability for liquidity and gifting
✅ Secondary Marketplace with listing/buying (2.5% platform fee)
✅ Staking & Rewards system for engagement
✅ On-chain tracking and full transparency
✅ Analytics dashboard with charts and statistics
✅ USDC faucet for testing
✅ Sanctum Gateway integration for optimized transactions"

## Future Roadmap (15 seconds)

"Next steps to scale this platform:

- Premium API tiers for more deal sources (Skyscanner, Shopify)
- Mobile app with camera-based QR scanning
- Fiat on-ramps for mainstream users (Stripe, Moonpay)
- Multi-signature merchant accounts for businesses
- Group buying for tiered discounts
- Automated deal expiry and cleanup"

## Closing (15 seconds)

"Deal reimagines discounts for the Web3 era. We've built a fully functional, production-ready, user-owned discount marketplace on Solana.

Every promotion becomes a tradable asset. Merchants maintain full control. Users gain unprecedented ownership and flexibility. Social features build trust. USDC provides stability. The platform is ready for real-world adoption.

Thank you. I'm happy to answer questions."

====================
