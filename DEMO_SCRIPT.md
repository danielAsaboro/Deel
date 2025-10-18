# Deal - Demo Script for Judges

## Introduction (45 seconds)

"Hi judges. I'm excited to present **Deal**. This is the next evolution of Groupon. User-owned. Borderless. Web3-powered.

We're solving a fundamental problem. Traditional discount platforms trap users with non-transferable coupons. These platforms control everything through centralized databases. Deal transforms every promotion into a collectible NFT. These NFTs grant real-world savings. Built entirely on Solana.

The market opportunity is massive. Groupon processes billions in transactions annually. But users have zero ownership. Merchants have limited control. Deals cannot be transferred. We're changing that with blockchain technology."

## The Problem (30 seconds)

"Think about the last time you bought a Groupon. You couldn't transfer it if your plans changed. You couldn't verify its authenticity. The company controlled everything.

Traditional platforms lack transparency. They lack ownership. They lack liquidity. Coupons expire worthless in databases. Users lose money. Merchants lose customers. We're fixing this with Web3."

## The Solution (1 minute)

"Deal creates a trustless deal economy. Every element is transparent. Everything runs on-chain.

Here's how it works. Every coupon is a verifiable NFT. True ownership lives in your wallet. Redemption is tracked on-chain. Immutable proof prevents fraud. Coupons can be transferred freely. They can be traded. Unused deals aren't wasted anymore.

Merchants maintain full control. They set supply limits. They choose expiry dates. They determine pricing. Users discover deals globally. This is a borderless marketplace. Powered entirely by Solana's speed."

## Live Demo - Step by Step (3 minutes)

### STEP 1: Navigate to Deals Page
**ACTION:** Open localhost:3000/deals

"I'm starting on the Deals page. This is our main marketplace. You can see all active deals here. Each card shows the merchant. The discount percentage. The price in SOL. Current supply available.

Notice the clean interface. No Web3 complexity visible. Just browse. Click. Own."

### STEP 2: Create a Deal (Merchant Flow)
**ACTION:** Scroll to "Create Deal" section at top of /deals page

"Now I'll act as a merchant. I'm a coffee shop owner creating a promotion. Watch this form.

I enter the title: 'Premium Latte 25% Off'.
Description: 'Enjoy our signature espresso drinks'.
Category: Food & Dining.
Discount: 25 percent.
Max Supply: 100 coupons total.
Expiry: 30 days from now.
Price: 0.1 SOL.

**ACTION:** Click "Create Deal" button

The transaction processes. Our Anchor smart contract mints this on-chain. Notice the speed. Under 400 milliseconds. This is Solana performance.

Here's the critical part. We've integrated **Sanctum Gateway** for transaction delivery. Gateway optimizes how transactions reach validators. It provides automatic retry logic. Cost optimization happens automatically. Real-time observability shows exactly what's happening. This ensures transactions land even during network congestion. Building this ourselves would take months. Gateway gives us production-grade reliability immediately.

**ACTION:** Wait for success toast, scroll down to see new deal appear

The deal now appears in the marketplace. Live. On-chain. Ready for customers."

### STEP 3: Claim a Coupon (User Flow)
**ACTION:** Find the deal you just created, click "Claim Coupon" button

"Now I'm a customer. I browse the marketplace. I find that coffee deal. I click 'Claim Coupon'.

**ACTION:** Approve wallet transaction

My wallet prompts me. I approve the transaction. Within seconds I own an NFT. This NFT represents my discount. It lives in my wallet. Not in a company database.

**ACTION:** Navigate to localhost:3000/coupons

This is where it gets interesting. Let me go to the Coupons page. Here are all my owned coupons. Each one is a real NFT. I can view it in Phantom. I can view it in Solflare. Any Solana wallet works.

See this Transfer button? I can gift this to a friend. The QR Code button generates a scannable code. Merchants use this for redemption."

### STEP 4: View Coupon Details
**ACTION:** Click "Show QR Code" on a coupon

"The QR code appears instantly. This contains the coupon's on-chain address. When I visit the coffee shop, I show this. The merchant scans it. They verify everything on-chain. Then they redeem it.

**ACTION:** Click "Redeem" button to demonstrate

Watch this redemption transaction. It marks the coupon as used permanently. It prevents double-spending. It creates an immutable audit trail. Everything happens on-chain. Everything completes in real-time.

The coupon status updates. Now it shows 'Redeemed'. I cannot use it again. The merchant has cryptographic proof. No fraud possible."

### STEP 5: Gateway Monitoring
**ACTION:** Navigate to localhost:3000/gateway

"This is our Gateway integration dashboard. Here we see transaction monitoring in real-time. Every deal creation. Every coupon mint. Every redemption. Gateway tracks delivery status. We see confirmation times. We see retry attempts. We see cost savings.

This observability is crucial. Traditional Solana apps are blind. Gateway gives us visibility. We can optimize performance. We can debug issues instantly."

## Technical Architecture (45 seconds)

"Under the hood, we've built robust infrastructure.

Our Anchor program handles everything. Deal creation. Coupon minting. Redemption verification. Ownership transfers. We use PDA-based accounts. This ensures security. All business rules enforce on-chain. Supply limits. Expiry dates. Redemption status.

The frontend uses Next.js 15. React Query manages state. Mobile-first responsive design. QR code generation built-in. Everything updates in real-time.

Sanctum Gateway wraps all transactions. We call buildGatewayTransaction first. Then sendTransaction. This gives us enterprise-grade delivery. Automatic optimization. Detailed analytics."

## Web3 Advantages (30 seconds)

"This is impossible with traditional technology.

True ownership. Coupons live in your wallet. Not in a company's database. Composability. Our NFTs work with any Solana marketplace. Transparency. All redemptions are publicly verifiable. Permissionless access. Anyone globally can participate. Liquidity. Unused coupons have resale value.

Traditional platforms cannot offer this. Blockchain makes it possible."

## Future Roadmap (20 seconds)

"We're just getting started.

Next we'll integrate external deal APIs. Skyscanner for flights. Booking.com for hotels. Shopify for products. Social features enable viral discovery. Users can rate deals. Comment on experiences. Share with friends. Loyalty staking rewards long-term users. Geo-based recommendations show nearby deals."

## Closing (20 seconds)

"Deal reimagines discounts for the Web3 era.

We've built a fully functional platform. Promotions become assets. Merchants maintain control. Users gain unprecedented flexibility. Everything runs on Solana. Optimized by Sanctum Gateway.

Thank you for your time. I'm happy to answer questions."

---

**Total Time: ~6 minutes**
**Word Count: ~900 words**

## Navigation Cheat Sheet

1. **Start:** localhost:3000/deals (main marketplace)
2. **Create Deal:** Scroll to top form on /deals page
3. **View Coupons:** localhost:3000/coupons (your owned NFTs)
4. **Gateway Dashboard:** localhost:3000/gateway (transaction monitoring)

## Quick Talking Points for Q&A

**Technical Implementation:**
- Metaplex Token Metadata standard for NFT compatibility
- PDA-based accounts for security
- Merchant verification ensures only deal creators can redeem
- On-chain expiry enforcement prevents expired coupon usage
- Solana's 400ms blocks plus Gateway optimization equals production-ready performance

**Bounty Requirements:**
- MonkeDAO track: All core features implemented. NFT coupons. Merchant dashboard. Redemption flow. Transfer capability.
- Sanctum Gateway track: Meaningful integration. buildGatewayTransaction and sendTransaction wrapped around all critical operations. Observable delivery. Cost optimization. Real-time monitoring dashboard.

**Deployment Status:**
- Deployed to devnet with working transactions
- Smart contracts verified on-chain
- Frontend hosted and accessible
- All features functional and tested
