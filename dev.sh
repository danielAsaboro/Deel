#!/bin/bash

# Deal Discovery Platform - Enhanced Development Script
# This script sets up the complete local development environment

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Parse command-line arguments
show_help() {
    echo "Usage: ./dev.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --network [devnet|localnet]  Network to use (default: localnet)"
    echo "  -h, --help                       Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SKIP_BUILD=true                  Skip building the Anchor program"
    echo "  SEED_DEMO=false                  Skip seeding demo data"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh                         # Use localnet (default)"
    echo "  ./dev.sh -n devnet               # Use devnet"
    echo "  SKIP_BUILD=true ./dev.sh         # Skip build, use localnet"
    echo "  SKIP_BUILD=true ./dev.sh -n devnet  # Skip build, use devnet"
    exit 0
}

# Default configuration
SKIP_BUILD=${SKIP_BUILD:-false}
SEED_DEMO=${SEED_DEMO:-true}
NETWORK=${NETWORK:-localnet}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--network)
            NETWORK="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Validate network
if [[ "$NETWORK" != "localnet" && "$NETWORK" != "devnet" ]]; then
    echo -e "${RED}Error: Invalid network '$NETWORK'. Must be 'localnet' or 'devnet'${NC}"
    exit 1
fi

# Set RPC URL based on network
if [ "$NETWORK" = "devnet" ]; then
    RPC_URL="https://api.devnet.solana.com"
else
    RPC_URL="http://127.0.0.1:8899"
fi

echo -e "${MAGENTA}"
echo "═══════════════════════════════════════════════════════════"
echo "           Deal Discovery Platform - Dev Setup             "
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"
echo -e "${CYAN}Configuration:${NC}"
echo "  • Network: $NETWORK"
echo "  • Skip Build: $SKIP_BUILD"
echo "  • Seed Demo Data: $SEED_DEMO"
echo ""

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

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    if [ ! -z "$VALIDATOR_PID" ]; then
        kill $VALIDATOR_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Validator stopped${NC}"
    fi
    if [ ! -z "$NEXT_PID" ]; then
        kill $NEXT_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Next.js stopped${NC}"
    fi
    pkill -f "solana-test-validator" 2>/dev/null || true
    echo -e "${CYAN}👋 Goodbye!${NC}"
    exit 0
}

trap cleanup EXIT INT TERM

# Kill any existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
pkill -f "solana-test-validator" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

# Build Anchor program
if [ "$SKIP_BUILD" = "false" ]; then
    echo -e "${BLUE}🔨 Building Anchor program...${NC}"
    pnpm anchor-build
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping build (SKIP_BUILD=true)${NC}"
fi
echo ""

# Start validator or connect to devnet
if [ "$NETWORK" = "localnet" ]; then
    echo -e "${BLUE}🚀 Starting local validator...${NC}"
    cd anchor
    solana-test-validator --reset --quiet &
    VALIDATOR_PID=$!
    cd ..
    echo -e "${CYAN}   Validator PID: $VALIDATOR_PID${NC}"

    # Wait for validator with better feedback
    echo -e "${BLUE}⏳ Waiting for validator to be ready...${NC}"
    MAX_RETRIES=20
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if solana cluster-version --url $RPC_URL &>/dev/null; then
            echo -e "${GREEN}✅ Validator is ready${NC}"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo -ne "${CYAN}   Attempt $RETRY_COUNT/$MAX_RETRIES...\r${NC}"
        sleep 1
    done

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${RED}❌ Validator failed to start${NC}"
        exit 1
    fi

    # Check if validator is still running
    if ! ps -p $VALIDATOR_PID > /dev/null; then
        echo -e "${RED}❌ Validator process died${NC}"
        exit 1
    fi
else
    echo -e "${BLUE}🌐 Connecting to devnet...${NC}"
    echo -e "${CYAN}   RPC URL: $RPC_URL${NC}"

    # Test connection to devnet
    if ! solana cluster-version --url $RPC_URL &>/dev/null; then
        echo -e "${RED}❌ Failed to connect to devnet${NC}"
        echo -e "${YELLOW}   Please check your internet connection${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Connected to devnet${NC}"
fi

# Get current wallet balance
WALLET_BALANCE=$(solana balance --url $RPC_URL 2>/dev/null || echo "0")
echo -e "${CYAN}   Wallet balance: $WALLET_BALANCE${NC}"

# Airdrop if on devnet and balance is low
if [ "$NETWORK" = "devnet" ]; then
    BALANCE_NUM=$(echo $WALLET_BALANCE | cut -d' ' -f1)
    if (( $(echo "$BALANCE_NUM < 5" | bc -l) )); then
        echo -e "${YELLOW}   Low balance detected ($BALANCE_NUM SOL), requesting airdrop...${NC}"
        echo -e "${CYAN}   Note: Deploying requires ~2-3 SOL for rent and fees${NC}"
        solana airdrop 2 --url $RPC_URL 2>/dev/null || echo -e "${YELLOW}   Airdrop failed (rate limited?)${NC}"
        sleep 2
        # Try one more airdrop if still low
        WALLET_BALANCE=$(solana balance --url $RPC_URL 2>/dev/null || echo "0")
        BALANCE_NUM=$(echo $WALLET_BALANCE | cut -d' ' -f1)
        if (( $(echo "$BALANCE_NUM < 3" | bc -l) )); then
            solana airdrop 2 --url $RPC_URL 2>/dev/null || true
        fi
    fi
fi
echo ""

echo -e "${BLUE}📦 Deploying program to $NETWORK...${NC}"
cd anchor

# Get the program keypair path
PROGRAM_KEYPAIR="target/deploy/basic-keypair.json"

if [ "$NETWORK" = "devnet" ]; then
    # For devnet, use solana program deploy with extended timeout and max retries
    echo -e "${CYAN}   Using extended timeout for devnet deployment...${NC}"
    solana program deploy \
        --url $RPC_URL \
        --keypair ~/.config/solana/id.json \
        --program-id $PROGRAM_KEYPAIR \
        --max-sign-attempts 50 \
        --use-rpc \
        target/deploy/basic.so
    DEPLOY_STATUS=$?
else
    # For localnet, use standard anchor deploy
    anchor deploy --provider.cluster $NETWORK
    DEPLOY_STATUS=$?
fi

cd ..

if [ $DEPLOY_STATUS -ne 0 ]; then
    echo -e "${RED}❌ Deploy failed${NC}"
    if [ "$NETWORK" = "localnet" ]; then
        kill $VALIDATOR_PID 2>/dev/null
    fi
    exit 1
fi

# Get program ID
PROGRAM_ID=$(grep "basic =" anchor/Anchor.toml | head -1 | cut -d'"' -f2)
echo -e "${GREEN}✅ Program deployed${NC}"
echo -e "${CYAN}   Program ID: $PROGRAM_ID${NC}"
echo -e "${GREEN}✅ Connected to $NETWORK ($RPC_URL)${NC}"
echo ""

# Initialize platform (rewards pool, etc.)
echo -e "${CYAN}⚙️  Initializing platform accounts...${NC}"
cd anchor
ANCHOR_PROVIDER_URL=$RPC_URL ANCHOR_WALLET=~/.config/solana/id.json npx ts-node scripts/initialize.ts
INIT_STATUS=$?
cd ..

if [ $INIT_STATUS -ne 0 ]; then
    echo -e "${RED}❌ Platform initialization failed${NC}"
    if [ "$NETWORK" = "localnet" ]; then
        kill $VALIDATOR_PID 2>/dev/null
    fi
    exit 1
fi
echo ""

# Seed demo data
if [ "$SEED_DEMO" = "true" ]; then
    echo -e "${CYAN}🌱 Seeding demo data...${NC}"
    cd anchor
    ANCHOR_PROVIDER_URL=$RPC_URL ANCHOR_WALLET=~/.config/solana/id.json npx ts-node scripts/seed-demo-data.ts
    SEED_STATUS=$?
    cd ..

    if [ $SEED_STATUS -eq 0 ]; then
        echo -e "${GREEN}✅ Demo data seeded successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Demo seeding failed (continuing anyway)${NC}"
    fi
    echo ""
else
    echo -e "${YELLOW}⏭️  Skipping demo data (SEED_DEMO=false)${NC}"
    echo ""
fi

# Summary
echo -e "${MAGENTA}"
echo "═══════════════════════════════════════════════════════════"
echo "       🎉 Deal Discovery Platform is Ready! 🎉            "
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"
echo -e "${GREEN}✅ Services Running:${NC}"
if [ "$NETWORK" = "localnet" ]; then
    echo "   • Solana Test Validator: $RPC_URL"
else
    echo "   • Solana Devnet: $RPC_URL"
fi
echo "   • Next.js Application: Starting on http://localhost:3000"
echo -e ""
echo -e "${GREEN}✅ Smart Contract:${NC}"
echo "   • Program ID: $PROGRAM_ID"
echo "   • Network: $NETWORK"
echo -e ""
echo -e "${GREEN}✅ Features Available:${NC}"
echo "   • Deal creation with social features (ratings, comments, sharing)"
echo "   • NFT coupon minting via Metaplex"
echo "   • Secondary marketplace (list, buy, trade coupons)"
echo "   • Coupon staking with rewards"
if [ "$NETWORK" = "devnet" ]; then
    echo "   • Sanctum Gateway integration (optimized transactions) ✨"
else
    echo "   • Sanctum Gateway (switch to devnet to enable)"
fi
echo "   • External API aggregation (65+ real deals)"
echo -e ""
echo -e "${CYAN}📊 Demo Data:${NC}"
if [ "$SEED_DEMO" = "true" ]; then
    echo "   • 8 demo deals created and ready to explore"
    echo "   • Visit http://localhost:3000/deals to see them"
else
    echo "   • No demo data seeded"
    echo "   • Run 'pnpm seed-demo' to add demo deals"
fi
echo -e ""
echo -e "${CYAN}🔗 Quick Links:${NC}"
echo "   • Deals Marketplace: http://localhost:3000/deals"
echo "   • Secondary Market: http://localhost:3000/marketplace"
echo "   • My Coupons: http://localhost:3000/coupons"
echo "   • Gateway Config: http://localhost:3000/gateway"
echo "   • Staking: http://localhost:3000/staking"
echo -e ""
echo -e "${CYAN}💡 Usage Tips:${NC}"
echo "   • Use -n devnet or --network devnet to run on devnet"
echo "   • Set SKIP_BUILD=true to skip building on restart"
echo "   • Set SEED_DEMO=false to skip demo data seeding"
echo "   • Example: ./dev.sh -n devnet"
echo "   • Example: SKIP_BUILD=true ./dev.sh -n devnet"
echo -e ""
if [ "$NETWORK" = "devnet" ]; then
    echo -e "${YELLOW}⚠️  Devnet Notes:${NC}"
    echo "   • Sanctum Gateway is enabled on devnet"
    echo "   • Airdrops may be rate-limited"
    echo "   • Program state persists between restarts"
    echo "   • Use 'localnet' for isolated testing"
    echo -e ""
fi
echo -e "${YELLOW}⌨️  Press Ctrl+C to stop all services${NC}"
echo -e "${MAGENTA}"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"
echo ""

echo -e "${BLUE}🌐 Starting Next.js development server...${NC}"
echo ""
pnpm dev
