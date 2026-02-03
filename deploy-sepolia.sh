#!/bin/bash
# Single command deployment script
# Usage: bash deploy-sepolia.sh

set -e

cd contracts

# Load environment variables from .env file (if exists in root)
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Deploy all contracts
forge script script/Deploy.s.sol:Deploy \
    --rpc-url sepolia \
    --broadcast \
    --verify \
    -vvvv

echo ""
echo "✅ Deployment complete! Update frontend/shared/contracts.ts with the addresses above."
