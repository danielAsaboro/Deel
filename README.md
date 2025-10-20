# Deal - Web3 Discount Marketplace

[![Built for MonkeDAO Cypherpunk Hackathon](https://img.shields.io/badge/Hackathon-MonkeDAO%20Cypherpunk-purple)](https://earn.superteam.fun/hackathon/cypherpunk)
[![Solana](https://img.shields.io/badge/Solana-Powered-14F195?logo=solana)](https://solana.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org)
[![Anchor](https://img.shields.io/badge/Anchor-0.31-663399)](https://www.anchor-lang.com)

> The next evolution of Groupon - user-owned, borderless, and Web3-powered.

Deal is a Web3 deal discovery and loyalty platform where every promotion lives as a collectible, tradable NFT that grants real-world savings. Built on Solana for the MonkeDAO Cypherpunk Hackathon.

## 🎥 Demo Video

**[Watch Demo Playlist on YouTube](https://www.youtube.com/playlist?list=PLeERy8YL4mpSpahpNPAGL2GzO32A4j9O-)**

Full walkthrough demonstrating all features including deal creation, coupon minting, QR redemption, secondary marketplace, and external API integration.

## 🌟 Features

### Core Features Implemented

- **✅ NFT Promotions / Coupons**: Each deal is minted as a transferable NFT with detailed metadata (discount %, expiry, merchant ID, redemption rules)
- **✅ Merchant Dashboard**: User-friendly interface for merchants to create promotions (discounts, bundles, flash sales) that automatically mint NFT coupons
- **✅ User Wallet & Marketplace**: Browse, purchase, or claim discount NFTs with option to view and manage your collection
- **✅ Deal Aggregator Feed**: Live integration with external APIs populating real-world deals from multiple sources:
  - **Amadeus API** - Flight and hotel deals with OAuth2 authentication
  - **RapidAPI (Booking.com)** - Hotel search and booking deals
  - **TheMealDB** - Restaurant and food deals
  - **FakeStore API** - Shopping and product deals
  - Unified `/api/external-deals` endpoint with category filtering and caching
- **✅ Redemption Verification Flow**: QR code-based verification system for merchants to redeem coupons on-chain
- **✅ Transfer & Trade**: Full ownership model allowing users to transfer or gift their coupon NFTs
- **✅ Secondary Marketplace**: List, buy, and sell coupon NFTs with platform fee collection (2.5%)
- **✅ Staking & Rewards**: Stake unredeemed coupons to earn daily rewards from the rewards pool
- **✅ Social Discovery**: Rate deals (5-star system) and add comments to build community trust
- **✅ IPFS Metadata**: Automatic NFT metadata generation and upload to IPFS via Pinata

### Technical Highlights

- **On-chain Deal Management**: Smart contracts handle deal creation, supply limits, and expiry timestamps
- **Verifiable NFT Coupons**: Each coupon is a unique NFT with on-chain redemption tracking
- **QR Code Integration**: Generate QR codes for easy merchant scanning and redemption
- **Real-time Updates**: React Query for efficient state management and automatic refetching
- **Responsive Design**: Mobile-first design with Tailwind CSS and Radix UI components
- **Type-safe**: Full TypeScript implementation with Anchor-generated types

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Rust and Solana CLI tools
- Anchor CLI 0.31.0+
- A Solana wallet (Phantom, Solflare, etc.)

### Installation

```shell
# Clone the repository
git clone <your-repo-url>
cd Deal

# Install dependencies
pnpm install

# Set up environment variables (optional for external APIs)
cp .env.example .env.local
```

### Environment Variables (Optional)

To enable external API integrations, create a `.env.local` file with the following:

```env
# External Deal APIs (all optional, app works without them)
AMADEUS_API_KEY=your_amadeus_key
AMADEUS_API_SECRET=your_amadeus_secret
RAPIDAPI_KEY=your_rapidapi_key
YELP_API_KEY=your_yelp_key

# IPFS Metadata Upload (optional, falls back to mock URLs in development)
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt

# Default locations for API searches
RAPIDAPI_DEFAULT_CITY="New York"
YELP_DEFAULT_LOCATION="New York"
```

**API Key Resources:**
- **Amadeus** (Flights/Hotels): [developers.amadeus.com](https://developers.amadeus.com) - Free test tier
- **RapidAPI** (Hotels): [rapidapi.com/booking-com](https://rapidapi.com/apidojo/api/booking-com) - Free tier available
- **Yelp**: [yelp.com/developers](https://www.yelp.com/developers) - Free tier
- **Pinata** (IPFS): [pinata.cloud](https://pinata.cloud) - Free tier

**Note:** TheMealDB and FakeStore APIs are free and require no API keys.

### Development

#### 1. Build the Anchor Program

```shell
# Build the Solana program
pnpm anchor-build

# Sync program keys (if needed)
pnpm anchor keys sync
```

#### 2. Start Local Validator (Optional)

```shell
# Start a local Solana validator with the program deployed
pnpm anchor-localnet
```

#### 3. Run the Web App

```shell
# Start the Next.js development server
pnpm dev
```

The app will be available at http://localhost:3000

### Testing

```shell
# Run Anchor program tests
pnpm anchor-test

# Build Next.js for production (includes linting and type checking)
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format
```

### Deployment

#### Deploy Anchor Program to Devnet

```shell
pnpm anchor deploy --provider.cluster devnet
```

#### Build and Deploy Web App

```shell
pnpm build
pnpm start
```

## 📁 Project Structure

```
Deal/
├── anchor/                      # Solana Anchor program
│   ├── programs/basic/
│   │   └── src/lib.rs          # Main program (13 instructions, 8 accounts)
│   ├── src/
│   │   └── basic-exports.ts    # TypeScript program interface
│   └── tests/                  # Comprehensive integration tests (1,303 lines)
│
├── src/                        # Next.js frontend
│   ├── app/                    # Next.js App Router pages
│   │   ├── deals/             # Deal marketplace page
│   │   ├── coupons/           # User coupons page
│   │   ├── marketplace/       # Secondary marketplace
│   │   ├── staking/           # Staking rewards page
│   │   ├── analytics/         # Analytics dashboard
│   │   └── api/               # API routes
│   │       └── external-deals/  # External API aggregator endpoint
│   │
│   ├── components/
│   │   ├── deals/             # Deal creation & browsing
│   │   ├── coupons/           # Coupon management & QR codes
│   │   ├── marketplace/       # Secondary market (list/buy/sell)
│   │   ├── staking/           # Staking UI
│   │   ├── analytics/         # Charts & statistics
│   │   ├── gateway/           # Sanctum Gateway integration
│   │   ├── ui/                # Reusable UI components (Radix)
│   │   ├── solana/            # Wallet adapter & provider
│   │   └── cluster/           # Cluster selection
│   │
│   ├── lib/                   # Utility libraries
│   │   ├── api-clients/       # External API integrations
│   │   │   ├── amadeus.ts     # Amadeus flights/hotels
│   │   │   ├── rapidapi.ts    # RapidAPI hotels
│   │   │   ├── themealdb.ts   # TheMealDB restaurants
│   │   │   ├── fakestore.ts   # FakeStore products
│   │   │   └── yelp.ts        # Yelp restaurants
│   │   ├── metadata-upload.ts # IPFS metadata generation
│   │   └── gateway.ts         # Sanctum Gateway client
│   │
│   └── types/
│       └── external-deals.ts  # TypeScript types for external APIs
│
└── package.json
```

## 🎯 How It Works

### For Users

1. **Connect Wallet**: Connect your Solana wallet (Phantom, Solflare, etc.)
2. **Browse Deals**: Explore the marketplace to find deals you're interested in
3. **Claim Coupons**: Mint NFT coupons for deals you want (requires small transaction fee)
4. **Redeem**: Show your QR code to merchants to redeem your coupon and save money
5. **Trade**: Transfer or gift unused coupons to other users

### For Merchants

1. **Connect Wallet**: Connect your merchant wallet
2. **Create Deals**: Use the merchant dashboard to create new deals with:
   - Title, description, and category
   - Discount percentage (1-100%)
   - Maximum supply limit
   - Expiry date
   - Price in SOL
3. **Manage**: Activate/deactivate deals and update pricing
4. **Redeem**: Scan customer QR codes to verify and redeem coupons on-chain

## 🏗️ Architecture

### Smart Contract (Anchor Program)

**Core Instructions:**
- `create_deal`: Merchants create new deals with metadata and constraints
- `update_deal`: Update deal status and pricing
- `mint_coupon`: Users mint NFT coupons for active deals
- `redeem_coupon`: Merchants redeem coupons (marks as used on-chain)
- `transfer_coupon`: Transfer coupon ownership to another wallet

**Marketplace Instructions:**
- `list_coupon`: List coupon NFT for sale on secondary market
- `buy_coupon`: Purchase listed coupon (with 2.5% platform fee)
- `delist_coupon`: Remove listing from marketplace

**Staking Instructions:**
- `initialize_rewards_pool`: Set up rewards pool for staking
- `stake_coupon`: Stake unredeemed coupon to earn rewards
- `unstake_coupon`: Unstake and claim accumulated rewards
- `claim_rewards`: Claim rewards without unstaking

**Social Instructions:**
- `rate_deal`: Rate deal 1-5 stars (aggregated on-chain)
- `add_comment`: Add comment to deal (500 char limit)

**Account Structure:**
- **Deal**: Merchant, title, description, discount%, supply, expiry, category, price, active status, ratings
- **Coupon**: Deal reference, owner, mint address, redemption status, timestamps, listing/sale counters
- **Listing**: Coupon, seller, price, active status, listing number
- **Sale**: Listing, coupon, seller, buyer, price, sale number (permanent history)
- **StakedCoupon**: Coupon, staker, staked timestamp, last claim timestamp
- **RewardsPool**: Total staked, reward rate per day, admin
- **DealRating**: Deal, user, rating (1-5), timestamp
- **Comment**: Deal, author, content, timestamp

### Frontend (Next.js + React)

**State Management:**
- Jotai for cluster selection (devnet/mainnet)
- TanStack React Query for on-chain data fetching and caching
- React hooks for UI state

**Key Patterns:**
- Three-tier component architecture: Data Access → UI → Feature
- Cluster-aware program IDs for multi-network support
- Automatic PDA derivation for deterministic account addresses
- Real-time transaction toasts with Solana Explorer links

## 🔐 Web3 Integration

### NFT Standard
- Uses Metaplex Token Metadata standard for coupon NFTs
- Each coupon has unique metadata URI pointing to deal information
- NFTs are transferable and tradable like any other Solana NFT
- Automatic metadata generation and IPFS upload via Pinata

### External API Integration
The platform aggregates real-world deals from multiple external sources:

**Architecture:**
```
External APIs → Next.js API Route → Unified Format → Frontend Display
     ↓
1. Amadeus (flights/hotels)
2. RapidAPI (hotels)
3. TheMealDB (restaurants)
4. FakeStore (products)
     ↓
GET /api/external-deals?category=flights
     ↓
Returns standardized ExternalDeal[] with:
- source, category, title, description
- discountPercent, originalPrice, discountedPrice
- location, imageUrl, metadata
     ↓
5-minute caching to respect rate limits
```

**Features:**
- Parallel fetching from all sources for performance
- Category filtering (flights, hotels, restaurants, shopping)
- Graceful error handling (failed APIs don't block others)
- Source tracking for analytics
- Ready for conversion to on-chain deals via merchant dashboard

### Redemption Flow
1. User generates QR code containing coupon account address
2. Merchant scans QR code to get coupon details
3. Merchant signs redemption transaction (verifies ownership)
4. Coupon marked as redeemed on-chain (immutable record)
5. Transaction confirmed on Solana blockchain

### Security Features
- PDA-based accounts prevent unauthorized modifications
- Merchant verification ensures only deal creator can redeem
- Expiry timestamps enforced on-chain
- Supply limits prevent over-minting
- Redemption status prevents double-spending
- Staked coupons cannot be transferred, listed, or redeemed

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first with breakpoints for tablets and desktop
- **Dark Mode**: Full dark mode support with system preference detection
- **Real-time Updates**: Automatic refetching on transaction success
- **Loading States**: Skeleton loaders and loading indicators
- **Error Handling**: User-friendly error messages with toast notifications
- **Wallet Integration**: Seamless wallet connection with multiple wallet support
- **Cluster Selection**: Easy switching between devnet, testnet, and mainnet

## 🛠️ Tech Stack

### Smart Contract
- **Anchor Framework** 0.31.1 - Solana development framework
- **Rust** - Systems programming language
- **Metaplex Token Metadata** - NFT metadata standard

### Frontend
- **Next.js** 15.5.3 - React framework with App Router
- **React** 19.1.1 - UI library
- **TypeScript** 5.9.2 - Type safety
- **Tailwind CSS** 4.1.13 - Utility-first CSS
- **Radix UI** - Accessible component primitives
- **TanStack React Query** 5.89.0 - Server state management
- **Jotai** 2.14.0 - Atomic state management
- **Solana Wallet Adapter** - Wallet integration
- **QRCode** 1.5.4 - QR code generation
- **Lucide React** - Icon library
- **Recharts** 3.3.0 - Analytics charts

### External API Integrations
- **Amadeus API** - Flight and hotel deals (test environment with OAuth2)
- **RapidAPI** - Booking.com hotel search and deals
- **TheMealDB** - Restaurant and meal deals (free tier)
- **FakeStore API** - E-commerce product deals (free tier)
- **Yelp Fusion API** - Restaurant discovery (ready to use)
- **Pinata IPFS** - Decentralized metadata storage for NFTs
- **Sanctum Gateway** - Solana transaction optimization and delivery

### Infrastructure
- **Vercel** - Deployment and hosting
- **IPFS/Pinata** - NFT metadata storage
- **Solana Devnet/Mainnet** - Blockchain network

## 🎓 Hackathon Submission

This project was built for the **MonkeDAO Cypherpunk Hackathon** track on Superteam Earn.

### Submission Checklist

- ✅ **Deployed application** with working demo
- ✅ **GitHub repository** with clear instructions
- ✅ **Demo video** (YouTube playlist)
- ✅ **Smart contracts** handling NFT coupons and redemption
- ✅ **Merchant dashboard** for deal creation
- ✅ **User interface** for browsing and claiming deals
- ✅ **Deal aggregator** with external API integrations (Amadeus, RapidAPI, TheMealDB, FakeStore)
- ✅ **QR code redemption** flow
- ✅ **On-chain verification** and tracking
- ✅ **Transfer and ownership** features
- ✅ **Secondary marketplace** with listing/buying
- ✅ **Staking & rewards** system
- ✅ **Social features** (ratings and comments)
- ✅ **IPFS metadata** upload
- ✅ **Comprehensive documentation**

### Web3 Integration Challenges Addressed

1. **NFT Representation**: Using Metaplex Token Metadata standard with detailed on-chain attributes
2. **Redemption Flow**: QR code + on-chain signature verification ensures single-use coupons
3. **UX Abstraction**: Wallet adapter handles complexity, users just click and sign
4. **Merchant Onboarding**: Simple form-based deal creation with automatic NFT minting
5. **Coupon Liquidity**: Full transfer support enables secondary markets
6. **Metadata Storage**: Automatic IPFS upload via Pinata with fallback for development
7. **External Data Integration**: Transform Web2 APIs (flights, hotels, restaurants) into Web3-compatible deal format
8. **Transaction Optimization**: Sanctum Gateway integration for improved delivery and monitoring

## 📝 Future Enhancements

- [ ] Additional API integrations (Skyscanner premium tier, Shopify)
- [ ] Social sharing features (Twitter, Discord)
- [ ] Geo-based deal discovery ("Deals near me")
- [ ] Group buying for tiered discounts
- [ ] Mobile app with camera QR scanning
- [ ] Multi-signature merchant accounts
- [ ] Automated deal expiry and cleanup
- [ ] Fiat payment integration (Stripe, Moonpay)

## 📄 License

MIT License - feel free to use this project as a template for your own Web3 marketplace!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Contact

Built with ❤️ for the Solana ecosystem

- Hackathon: [MonkeDAO Cypherpunk Track](https://earn.superteam.fun/hackathon/cypherpunk)
- Solana: [https://solana.com](https://solana.com)
- Anchor: [https://www.anchor-lang.com](https://www.anchor-lang.com)
