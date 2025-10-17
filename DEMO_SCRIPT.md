# Deal - Demo Script for Judges

## Introduction (30 seconds)

"Hi judges! I'm excited to present **Deal** - the next evolution of Groupon, but user-owned, borderless, and Web3-powered. We're solving a fundamental problem: traditional discount platforms trap users with non-transferable coupons controlled by centralized databases. Deal transforms every promotion into a collectible, tradable NFT that grants real-world savings - built on Solana."

## The Problem (30 seconds)

"Think about the last time you bought a Groupon. You couldn't transfer it if your plans changed. You couldn't verify its authenticity. The company controlled everything. Traditional platforms lack transparency, ownership, and liquidity. We're changing that with blockchain technology."

## The Solution (1 minute)

"Deal creates a trustless, transparent deal economy where:
- **Every coupon is a verifiable NFT** - true ownership lives in your wallet
- **Redemption is tracked on-chain** - immutable proof prevents fraud
- **Coupons can be transferred or traded** - unused deals aren't wasted
- **Merchants control issuance** - they set supply limits and expiry dates
- **Users discover globally** - borderless marketplace powered by Solana"

## Live Demo (2.5 minutes)

### Part 1: Merchant Flow
"Let me show you the merchant dashboard. As a coffee shop owner, I'll create a deal:
- 25% discount on premium lattes
- Limited to 100 coupons
- Valid for 30 days
- Priced at 0.1 SOL

When I click Create Deal, our Anchor smart contract mints this promotion on-chain. The transaction completes in under 400ms thanks to Solana's speed - and we've integrated **Sanctum Gateway** to optimize transaction delivery, ensuring the best chances of landing even during network congestion."

### Part 2: User Experience
"Now switching to a customer's view. I browse the deals marketplace and find that coffee promotion. I click 'Claim Coupon' and within seconds, I own an NFT in my wallet representing this discount.

Here's where it gets interesting - this isn't just a database entry. I can:
- View it in any Solana wallet
- Transfer it to a friend as a gift
- Potentially resell it on secondary markets
- Generate a QR code for redemption"

### Part 3: Redemption
"When I visit the coffee shop, I show my QR code. The merchant scans it, verifies the coupon details on-chain, and redeems it. This single transaction:
- Marks the coupon as used permanently
- Prevents double-spending
- Creates an immutable audit trail
- Completes in real-time"

## Technical Highlights (45 seconds)

"Under the hood, we've built a robust architecture:

**Smart Contracts**: Our Anchor program handles deal creation, coupon minting, redemption verification, and transfers. We use PDA-based accounts for security and enforce all business rules on-chain - supply limits, expiry dates, and redemption status.

**Frontend**: Next.js 15 with React Query for real-time updates. Mobile-first responsive design with QR code generation built-in.

**Sanctum Gateway Integration**: We've integrated Gateway's `buildGatewayTransaction` and `sendTransaction` APIs across all critical user actions. This gives us real-time transaction observability, automatic retry logic, and cost optimization. Gateway enables us to provide consistent transaction delivery that would be extremely difficult to build ourselves."

## Web3 Advantages (30 seconds)

"This is impossible with traditional tech:
- **True ownership** - coupons live in your wallet, not a company's database
- **Composability** - our NFTs work with any Solana marketplace
- **Transparency** - all redemptions are publicly verifiable
- **Permissionless** - anyone globally can participate
- **Liquidity** - unused coupons have resale value"

## Future Vision (20 seconds)

"We're just getting started. Next steps include integrating external deal APIs like Skyscanner and Booking.com, adding social features for viral discovery, implementing loyalty staking rewards, and building geo-based deal recommendations."

## Closing (15 seconds)

"Deal reimagines discounts for the Web3 era. We've built a fully functional platform where promotions become assets, merchants maintain control, and users gain unprecedented flexibility. Thank you for your time - I'm happy to answer questions!"

---

**Total Time: ~5 minutes**
**Word Count: ~695 words**

## Quick Talking Points for Q&A

- **Metaplex Standard**: We use Token Metadata for NFT compatibility
- **Security**: PDA-based accounts, merchant verification, on-chain expiry enforcement
- **Scalability**: Solana's 400ms blocks + Gateway's optimization = production-ready
- **Bounty Fit**: Addresses all MonkeDAO requirements + meaningful Sanctum Gateway integration
- **Demo-ready**: Deployed to devnet with working transactions
