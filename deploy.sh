#!/bin/bash

# Deployment script for Quantum Safe Pools contracts
# Make sure you have your environment variables set:
# - PRIVATE_KEY: Your deployer private key (without 0x prefix)
# - SEPOLIA_RPC_URL: Your Sepolia RPC endpoint
# - ETHERSCAN_API_KEY: (Optional) For contract verification

set -e  # Exit on error

echo "🚀 Starting deployment to Sepolia..."

# Navigate to contracts directory
cd contracts

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable is not set"
    echo "   Set it with: export PRIVATE_KEY=your_private_key_here"
    exit 1
fi

# Check if SEPOLIA_RPC_URL is set
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "❌ Error: SEPOLIA_RPC_URL environment variable is not set"
    echo "   Set it with: export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"
    exit 1
fi

echo "✅ Environment variables set"
echo "📝 Deploying contracts..."

# Run the deployment script
forge script script/Deploy.s.sol:Deploy \
    --rpc-url sepolia \
    --broadcast \
    --verify \
    -vvvv

echo ""
echo "✅ Deployment complete!"
echo "📋 Check the output above for deployed contract addresses"
echo "💡 Update frontend/shared/contracts.ts with the new addresses"
