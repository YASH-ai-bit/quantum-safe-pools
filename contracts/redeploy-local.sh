#!/bin/bash

# Quantum Safe Pools - Local Deployment Script (Anvil)
# This script deploys all contracts to a local Anvil instance

set -e  # Exit on error

echo "================================"
echo "Quantum Safe Pools Local Deploy"
echo "================================"
echo ""

# Check if Anvil is running
if ! nc -z localhost 8545 2>/dev/null; then
    echo "❌ Error: Anvil is not running on localhost:8545"
    echo "   Start Anvil in another terminal with: anvil"
    exit 1
fi

echo "📋 Deployment Configuration:"
echo "   Network: Local (Anvil)"
echo "   RPC URL: http://127.0.0.1:8545"
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

# Deploy contracts (using Anvil's default private key)
echo "🚀 Deploying contracts to local Anvil..."
echo ""

ANVIL_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

forge script script/Deploy.s.sol:Deploy \
    --rpc-url http://127.0.0.1:8545 \
    --private-key $ANVIL_PRIVATE_KEY \
    --broadcast \
    -vvvv

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Local deployment successful!"
echo ""
echo "📋 Note: Update frontend/shared/contracts.ts LOCAL section with new addresses"
echo ""
echo "================================"
echo "✅ Local Deployment Complete!"
echo "================================"
