#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  # Use sed to remove carriage returns often found in Windows files
  export $(grep -v '^#' .env | sed 's/\r$//' | xargs)
fi

# Check if required variables are set
if [ -z "$SEPOLIA_RPC_URL" ]; then
  echo "Error: SEPOLIA_RPC_URL is not set."
  exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
  echo "Error: PRIVATE_KEY is not set."
  exit 1
fi

# Run verification flow
echo "Running Verification Flow..."
forge script script/VerifyFlow.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast -vvvv
