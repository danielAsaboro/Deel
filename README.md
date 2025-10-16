# Deal - Web3 Discount Marketplace

[![Built for MonkeDAO Cypherpunk Hackathon](https://img.shields.io/badge/Hackathon-MonkeDAO%20Cypherpunk-purple)](https://earn.superteam.fun/hackathon/cypherpunk)
[![Solana](https://img.shields.io/badge/Solana-Powered-14F195?logo=solana)](https://solana.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org)
[![Anchor](https://img.shields.io/badge/Anchor-0.31-663399)](https://www.anchor-lang.com)

> The next evolution of Groupon - user-owned, borderless, and Web3-powered.

Deal is a Web3 deal discovery and loyalty platform where every promotion lives as a collectible, tradable NFT that grants real-world savings. Built on Solana for the MonkeDAO Cypherpunk Hackathon.

## 🌟 Features

### Core Features Implemented

- **✅ NFT Promotions / Coupons**: Each deal is minted as a transferable NFT with detailed metadata (discount %, expiry, merchant ID, redemption rules)
- **✅ Merchant Dashboard**: User-friendly interface for merchants to create promotions (discounts, bundles, flash sales) that automatically mint NFT coupons
- **✅ User Wallet & Marketplace**: Browse, purchase, or claim discount NFTs with option to view and manage your collection
- **✅ Deal Aggregator Feed**: Dynamic feed showing all active deals with filtering by status (active/expired)
- **✅ Redemption Verification Flow**: QR code-based verification system for merchants to redeem coupons on-chain
- **✅ Transfer & Trade**: Full ownership model allowing users to transfer or gift their coupon NFTs

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
```

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
│   │   └── src/lib.rs          # Main program with deal & coupon logic
│   ├── src/
│   │   └── basic-exports.ts    # TypeScript program interface
│   └── tests/                  # Anchor tests
│
├── src/                        # Next.js frontend
│   ├── app/                    # Next.js App Router pages
│   │   ├── deals/             # Deal marketplace page
│   │   ├── coupons/           # User coupons page
│   │   └── layout.tsx         # Root layout with navigation
│   │
│   └── components/
│       ├── deals/             # Deal creation & browsing
│       │   ├── deals-data-access.tsx
│       │   ├── deals-ui.tsx
│       │   └── deals-feature.tsx
│       │
│       ├── coupons/           # Coupon management & QR codes
│       │   ├── coupons-data-access.tsx
│       │   ├── coupons-ui.tsx
│       │   └── coupons-feature.tsx
│       │
│       ├── ui/                # Reusable UI components (Radix)
│       ├── solana/            # Wallet adapter & provider
│       └── cluster/           # Cluster selection (devnet/mainnet)
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

**Key Instructions:**
- `create_deal`: Merchants create new deals with metadata and constraints
- `update_deal`: Update deal status and pricing
- `mint_coupon`: Users mint NFT coupons for active deals
- `redeem_coupon`: Merchants redeem coupons (marks as used on-chain)
- `transfer_coupon`: Transfer coupon ownership to another wallet

**Account Structure:**
- **Deal**: Stores merchant, title, description, discount%, supply, expiry, category, price, active status
- **Coupon**: Stores deal reference, owner, mint address, redemption status, timestamps

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

## 🎓 Hackathon Submission

This project was built for the **MonkeDAO Cypherpunk Hackathon** track on Superteam Earn.

### Submission Checklist

- ✅ Deployed application with working demo
- ✅ GitHub repository with clear instructions
- ✅ Smart contracts handling NFT coupons and redemption
- ✅ Merchant dashboard for deal creation
- ✅ User interface for browsing and claiming deals
- ✅ QR code redemption flow
- ✅ On-chain verification and tracking
- ✅ Transfer and ownership features
- ✅ Comprehensive documentation

### Web3 Integration Challenges Addressed

1. **NFT Representation**: Using Metaplex Token Metadata standard with detailed on-chain attributes
2. **Redemption Flow**: QR code + on-chain signature verification ensures single-use coupons
3. **UX Abstraction**: Wallet adapter handles complexity, users just click and sign
4. **Merchant Onboarding**: Simple form-based deal creation with automatic NFT minting
5. **Coupon Liquidity**: Full transfer support enables secondary markets

## 📝 Future Enhancements

- [ ] Integration with external deal APIs (Skyscanner, Booking.com, Shopify)
- [ ] Social features (ratings, comments, sharing)
- [ ] Loyalty rewards and staking mechanisms
- [ ] Geo-based deal discovery
- [ ] Group buying for tiered discounts
- [ ] Mobile app with camera QR scanning
- [ ] Analytics dashboard for merchants
- [ ] Multi-signature merchant accounts
- [ ] Automated deal expiry and cleanup
- [ ] Fiat payment integration

## 📄 License

MIT License - feel free to use this project as a template for your own Web3 marketplace!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Contact

Built with ❤️ for the Solana ecosystem

- Hackathon: [MonkeDAO Cypherpunk Track](https://earn.superteam.fun/hackathon/cypherpunk)
- Solana: [https://solana.com](https://solana.com)
- Anchor: [https://www.anchor-lang.com](https://www.anchor-lang.com)
