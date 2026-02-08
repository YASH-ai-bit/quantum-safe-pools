#!/bin/bash

# Pool Testing Script -  Tests pool state and operations
# Usage: ./test_pool.sh

source .env

if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "Error: SEPOLIA_RPC_URL not set in .env"
    exit 1
fi

# Contract addresses (update these based on your deployment)
FACTORY="${QUANTUM_AMM_FACTORY:-0xE5acFcC6bf0BB0f64204775526E033C76d2130a9}"
ROUTER="${QUANTUM_AMM_ROUTER:-0xA9ebc6aEfe13D9e93BcBA94aFE54E513bB730722}"

# Token addresses on Sepolia
USDC="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
PYUSD="0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"

echo "================================================"
echo "  QUANTUM AMM POOL DIAGNOSTICS"
echo "================================================"
echo ""

# 1. Check if pool exists
echo "[1] Checking if USDC/PYUSD pool exists..."
POOL=$(cast call $FACTORY "getPool(address,address)(address)" $USDC $PYUSD --rpc-url $SEPOLIA_RPC_URL)
echo "Pool address: $POOL"
echo ""

if [ "$POOL" == "0x0000000000000000000000000000000000000000" ]; then
    echo "❌ Pool does not exist yet!"
    echo ""
    exit 0
fi

# 2. Check pool reserves
echo "[2] Checking pool reserves..."
RESERVES=$(cast call $POOL "getReserves()(uint256,uint256)" --rpc-url $SEPOLIA_RPC_URL)
echo "Reserves (raw): $RESERVES"

# Parse reserves (basic parsing, assumes space-separated output)
RESERVE0=$(echo $RESERVES | awk '{print $1}')
RESERVE1=$(echo $RESERVES | awk '{print $2}')

echo "Reserve0 (USDC, 6 decimals): $RESERVE0 wei"
echo "Reserve1 (PYUSD, 6 decimals): $RESERVE1 wei"

# Convert to human-readable (assuming 6 decimals for both)
if command -v bc &> /dev/null; then
    RESERVE0_HUMAN=$(echo "scale=6; $RESERVE0 / 1000000" | bc)
    RESERVE1_HUMAN=$(echo "scale=6; $RESERVE1 / 1000000" | bc)
    echo "Reserve0 (human): $RESERVE0_HUMAN USDC"
    echo "Reserve1 (human): $RESERVE1_HUMAN PYUSD"
fi
echo ""

# 3. Check LP token total supply
echo "[3] Checking LP token total supply..."
TOTAL_SUPPLY=$(cast call $POOL "totalSupply()(uint256)" --rpc-url $SEPOLIA_RPC_URL)
echo "Total LP supply: $TOTAL_SUPPLY"

if command -v bc &> /dev/null; then
    TOTAL_SUPPLY_HUMAN=$(echo "scale=18; $TOTAL_SUPPLY / 1000000000000000000" | bc)
    echo "Total LP supply (human, 18 decimals): $TOTAL_SUPPLY_HUMAN LP"
fi
echo ""

# 4. Check your LP token balance (if account address provided)
if [ ! -z "$QUANTUM_ACCOUNT" ]; then
    echo "[4] Checking your LP token balance..."
    USER_LP=$(cast call $POOL "balanceOf(address)(uint256)" $QUANTUM_ACCOUNT --rpc-url $SEPOLIA_RPC_URL)
    echo "Your LP balance: $USER_LP"
    
    if command -v bc &> /dev/null && [ "$TOTAL_SUPPLY" != "0" ]; then
        USER_LP_HUMAN=$(echo "scale=18; $USER_LP / 1000000000000000000" | bc)
        POOL_SHARE=$(echo "scale=4; ($USER_LP * 100) / $TOTAL_SUPPLY" | bc)
        echo "Your LP balance (human): $USER_LP_HUMAN LP"
        echo "Your pool share: $POOL_SHARE%"
    fi
    echo ""
fi

# 5. Test swap calculation (0.1 USDC -> PYUSD)
echo "[5] Testing swap calculation: 0.1 USDC -> PYUSD..."
AMOUNT_IN="100000"  # 0.1 USDC in wei (6 decimals)

if [ "$RESERVE0" != "0" ] && [ "$RESERVE1" != "0" ]; then
    # Calculate expected output using constant product formula with 0.3% fee
    # amountInWithFee = amountIn * 9970 (0.3% fee)
    # amountOut = (amountInWithFee * reserveOut) / ((reserveIn * 10000) + amountInWithFee)
    
    if command -v bc &> /dev/null; then
        AMOUNT_IN_WITH_FEE=$(echo "$AMOUNT_IN * 9970" | bc)
        NUMERATOR=$(echo "$AMOUNT_IN_WITH_FEE * $RESERVE1" | bc)
        DENOMINATOR=$(echo "($RESERVE0 * 10000) + $AMOUNT_IN_WITH_FEE" | bc)
        AMOUNT_OUT=$(echo "$NUMERATOR / $DENOMINATOR" | bc)
        AMOUNT_OUT_HUMAN=$(echo "scale=6; $AMOUNT_OUT / 1000000" | bc)
        
        echo "Expected output: $AMOUNT_OUT wei"
        echo "Expected output (human): $AMOUNT_OUT_HUMAN PYUSD"
        
        if [ "$AMOUNT_OUT" == "0" ] || [ -z "$AMOUNT_OUT" ]; then
            echo "⚠️  WARNING: Swap would return 0 tokens!"
            echo "This usually means reserves are too low or there's a precision issue."
        else
            echo "✅ Swap calculation looks valid"
        fi
    fi
else
    echo "⚠️  Cannot calculate swap - reserves are 0"
fi
echo ""

# 6. Summary
echo "================================================"
echo "  SUMMARY"
echo "================================================"

if [ "$RESERVE0" == "0" ] && [ "$RESERVE1" == "0" ]; then
    echo "❌ ISSUE: Pool reserves are 0!"
    echo "   This means no liquidity has been added yet."
    echo "   Swaps will fail until liquidity is provided."
elif [ "$TOTAL_SUPPLY" == "0" ]; then
    echo "❌ ISSUE: Total LP supply is 0 but reserves exist!"
    echo "   This is an inconsistent state."
else
    echo "✅ Pool has liquidity"
    echo "   Reserve0: $RESERVE0 wei"
    echo "   Reserve1: $RESERVE1 wei"
    echo "   Total LP: $TOTAL_SUPPLY"
fi

echo ""
echo "To set your Quantum Account address for balance checks:"
echo "  export QUANTUM_ACCOUNT=0xYourAddress"
echo ""
