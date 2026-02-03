#!/bin/bash

# Quantum Safe Pools - Contract Redeployment Script
# This script redeploys all contracts to Sepolia testnet

set -e  # Exit on error

echo "================================"
echo "Quantum Safe Pools Redeployment"
echo "================================"
echo ""

# Load environment variables
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

source .env

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env"
    exit 1
fi

# Check if SEPOLIA_RPC_URL is set
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "❌ Error: SEPOLIA_RPC_URL not set in .env"
    exit 1
fi

echo "📋 Deployment Configuration:"
echo "   Network: Sepolia Testnet"
echo "   RPC URL: $SEPOLIA_RPC_URL"
echo ""

# Clean previous build artifacts
echo "🧹 Cleaning previous build artifacts..."
forge clean

# Build contracts
echo "🔨 Building contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Deploy contracts
echo "🚀 Deploying contracts to Sepolia..."
echo ""

forge script script/Deploy.s.sol:Deploy \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vvvv

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""

# Extract deployed addresses from broadcast
BROADCAST_FILE=$(ls -t broadcast/Deploy.s.sol/11155111/run-latest.json 2>/dev/null | head -1)

if [ -f "$BROADCAST_FILE" ]; then
    echo "📝 Extracting deployed addresses..."
    echo ""
    
    # Parse addresses from broadcast file (this is a simplified extraction)
    # You may need to adjust this based on your actual broadcast file structure
    
    echo "📋 Deployed Contract Addresses:"
    echo "================================"
    
    # Note: Update frontend/shared/contracts.ts with these addresses
    echo ""
    echo "⚠️  IMPORTANT: Update the following files with new addresses:"
    echo "   1. frontend/shared/contracts.ts"
    echo "   2. snap/packages/snap/src/userOps.ts (if needed)"
    echo ""
    echo "Run the following command to update frontend automatically:"
    echo "   node script/update-frontend.js"
    echo ""
else
    echo "⚠️  Warning: Could not find broadcast file to extract addresses"
    echo "   Please manually update contract addresses in:"
    echo "   - frontend/shared/contracts.ts"
    echo "   - snap/packages/snap/src/userOps.ts"
fi

echo "================================"
echo "✅ Redeployment Complete!"
echo "================================"
