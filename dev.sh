#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}"
echo "═══════════════════════════════════════════════════════════"
echo "           Deal Discovery Platform - Dev Setup             "
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"

# Check environment setup
echo -e "${CYAN}🔍 Checking environment...${NC}"

if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  Warning: .env.local not found${NC}"
    echo -e "${YELLOW}   Some API integrations may not work${NC}"
else
    # Check for Gateway API key
    if grep -q "NEXT_PUBLIC_GATEWAY_API_KEY=" .env.local && ! grep -q "NEXT_PUBLIC_GATEWAY_API_KEY=$" .env.local && ! grep -q "NEXT_PUBLIC_GATEWAY_API_KEY=your_" .env.local; then
        echo -e "${GREEN}✅ Sanctum Gateway API key configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: NEXT_PUBLIC_GATEWAY_API_KEY not set${NC}"
        echo -e "${YELLOW}   Get your key from: https://gateway.sanctum.so/dashboard/settings/api-keys${NC}"
    fi

    # Check for Pinata JWT
    if grep -q "NEXT_PUBLIC_PINATA_JWT=" .env.local && ! grep -q "NEXT_PUBLIC_PINATA_JWT=$" .env.local && ! grep -q "NEXT_PUBLIC_PINATA_JWT=your_" .env.local; then
        echo -e "${GREEN}✅ Pinata IPFS configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Info: NEXT_PUBLIC_PINATA_JWT not set (using mock IPFS)${NC}"
    fi
fi

echo ""

# Kill any existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
pkill -f "solana-test-validator" || true
sleep 2

echo -e "${BLUE}🔨 Building Anchor program...${NC}"
pnpm anchor-build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# Start validator in background
echo -e "${BLUE}🚀 Starting local validator...${NC}"
cd anchor
solana-test-validator --reset &
VALIDATOR_PID=$!
cd ..

echo -e "${BLUE}⏳ Waiting for validator to be ready...${NC}"
sleep 8

# Check if validator is running
if ! ps -p $VALIDATOR_PID > /dev/null; then
    echo -e "${RED}❌ Validator failed to start${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Deploying program...${NC}"
cd anchor
anchor deploy
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deploy failed${NC}"
    kill $VALIDATOR_PID 2>/dev/null
    exit 1
fi
cd ..

echo -e "${GREEN}✅ Program deployed${NC}"
echo -e "${GREEN}✅ Validator running on http://127.0.0.1:8899${NC}"

# Initialize platform (rewards pool, etc.)
echo ""
echo -e "${CYAN}⚙️  Initializing platform accounts...${NC}"
cd anchor
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=~/.config/solana/id.json npx ts-node scripts/initialize.ts
INIT_STATUS=$?
cd ..

if [ $INIT_STATUS -ne 0 ]; then
    echo -e "${RED}❌ Platform initialization failed${NC}"
    kill $VALIDATOR_PID 2>/dev/null
    exit 1
fi

echo ""
echo -e "${MAGENTA}"
echo "═══════════════════════════════════════════════════════════"
echo "              Platform Ready for Evaluation                "
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"
echo -e "${GREEN}✅ Solana Test Validator:${NC} http://127.0.0.1:8899"
echo -e "${GREEN}✅ Next.js Application:${NC} Starting on http://localhost:3000"
echo -e "${GREEN}✅ Sanctum Gateway:${NC} Active (optimized transaction delivery)"
echo -e "${GREEN}✅ Staking Rewards:${NC} Initialized and funded"
echo ""
echo -e "${CYAN}Features Available:${NC}"
echo "  • Deal creation and management"
echo "  • NFT coupon minting"
echo "  • Coupon staking with rewards"
echo "  • Secondary marketplace trading"
echo "  • Sanctum Gateway integration"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

echo -e "${BLUE}🌐 Starting Next.js server...${NC}"
pnpm dev

# Cleanup on exit
trap "echo -e '\n${YELLOW}🛑 Shutting down...${NC}'; kill $VALIDATOR_PID 2>/dev/null; exit 0" EXIT INT TERM
