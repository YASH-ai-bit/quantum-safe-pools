import { useState, useCallback } from "react";
import { useSnap } from "./useSnap";
import { useAccount } from "wagmi";
import { CONTRACTS } from "@shared/contracts";
import { encodeFunctionData } from "viem";

interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

interface ModifyLiquidityParams {
  tickLower: number;
  tickUpper: number;
  liquidityDelta: bigint;
  salt: `0x${string}`;
}

// ERC-20 ABI for token approvals
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

interface SwapParams {
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: bigint;
}

// QuantumPoolRouter ABI for operations (calls PoolManager internally)
const QUANTUM_POOL_ROUTER_ABI = [
  {
    name: "initialize",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "sqrtPriceX96", type: "uint160" },
    ],
    outputs: [{ name: "tick", type: "int24" }],
  },
  {
    name: "addLiquidity",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tickLower", type: "int24" },
          { name: "tickUpper", type: "int24" },
          { name: "liquidityDelta", type: "int256" },
          { name: "salt", type: "bytes32" },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: "removeLiquidity",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tickLower", type: "int24" },
          { name: "tickUpper", type: "int24" },
          { name: "liquidityDelta", type: "int256" },
          { name: "salt", type: "bytes32" },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: "swap",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "zeroForOne", type: "bool" },
          { name: "amountSpecified", type: "int256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [],
  },
] as const;

export function usePoolOperations() {
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const [snapLoading, setSnapLoading] = useState(false);

  // Hook for Snap - all operations go through quantum account
  const { isConnected: isSnapConnected, sendTransaction: sendSnapTransaction, batchTransactions } =
    useSnap();

  const createPool = useCallback(
    async (
      currency0: string,
      currency1: string,
      tickSpacing: number,
      initialPrice: bigint,
    ) => {
      if (!isConnected || !address) {
        throw new Error("Please connect MetaMask Flask first");
      }

      if (!isSnapConnected) {
        throw new Error(
          "Please connect your Quantum Wallet (MetaMask Snap) to create pools",
        );
      }

      setError(null);

      // Uniswap V4 requires currency0 < currency1 (sorted by address)
      const [orderedCurrency0, orderedCurrency1] =
        currency0.toLowerCase() < currency1.toLowerCase()
          ? [currency0, currency1]
          : [currency1, currency0];

      // Use dynamic fee flag for hook-enabled pools (bit 23 set = 0x800000)
      const dynamicFee = 0x800000;

      const poolKey = {
        currency0: orderedCurrency0 as `0x${string}`,
        currency1: orderedCurrency1 as `0x${string}`,
        fee: dynamicFee,
        tickSpacing: tickSpacing,
        hooks: CONTRACTS.QUANTUM_HOOK as `0x${string}`,
      };

      const args = [poolKey, initialPrice];

      try {
        if (isSnapConnected) {
          setSnapLoading(true);
          try {
            // Use Snap (Yellow Nitrolite optimized)
            const data = encodeFunctionData({
              abi: QUANTUM_POOL_ROUTER_ABI,
              functionName: "initialize",
              args: args as any,
            });

            console.log(
              "%c[POOL] Creating pool with quantum-safe transaction...",
              "color: #00ffff; font-weight: bold;",
            );
            console.log("%c[POOL] Pool Key:", "color: #00ffff;", poolKey);
            console.log(
              "%c[POOL] Initial Price (sqrtPriceX96):",
              "color: #00ffff;",
              initialPrice.toString(),
            );

            const result = await sendSnapTransaction(
              CONTRACTS.QUANTUM_POOL_ROUTER,
              "0", // value
              data,
            );

            // Check if snap returned an error
            if (result.error) {
              console.error(
                "%c[POOL] ❌ Snap returned error:",
                "color: #ff0000; font-weight: bold;",
                result.error,
              );
              if (result.logs && Array.isArray(result.logs)) {
                console.log(
                  "%c[POOL] Snap logs:",
                  "color: #ffff00;",
                  result.logs,
                );
              }
              throw new Error(`Pool creation failed: ${result.error}`);
            }

            if (!result.transactionHash) {
              console.error(
                "%c[POOL] ⚠️ No transaction hash:",
                "color: #ff9900;",
                result,
              );
              throw new Error(
                "Pool creation failed - no transaction hash received",
              );
            }

            console.log(
              "%c[POOL] ✅ Pool created successfully!",
              "color: #00ff00; font-weight: bold;",
            );
            console.log(
              "%c[POOL] Transaction hash:",
              "color: #00ff00;",
              result.transactionHash,
            );

            // Return the transaction hash from the bundler receipt
            return {
              hash: result.transactionHash as `0x${string}`,
              userOpHash: result.userOpHash,
            };
          } finally {
            setSnapLoading(false);
          }
        }

        // Snap connection required for quantum-safe operations
        throw new Error(
          "Please connect your Quantum Wallet (MetaMask Snap) to create pools",
        );
      } catch (err: any) {
        const errorMsg = err.message || "Failed to create pool";
        console.error(
          "%c[POOL] ❌ Pool creation failed:",
          "color: #ff0000; font-weight: bold;",
          errorMsg,
        );
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [isConnected, address, isSnapConnected, sendSnapTransaction],
  );

  const addLiquidity = useCallback(
    async (
      poolKey: PoolKey,
      tickLower: number,
      tickUpper: number,
      liquidityDelta: bigint,
      ethValue: string = "0", // ETH value for native token pools
    ) => {
      if (!isConnected || !address) {
        throw new Error("Please connect MetaMask Flask first");
      }

      if (!isSnapConnected) {
        throw new Error(
          "Please connect your Quantum Wallet (MetaMask Snap) to add liquidity",
        );
      }

      setError(null);
      setSnapLoading(true);

      try {
        const params: ModifyLiquidityParams = {
          tickLower,
          tickUpper,
          liquidityDelta,
          salt: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        };

        // Encode calldata for QuantumPoolRouter.addLiquidity
        const data = encodeFunctionData({
          abi: QUANTUM_POOL_ROUTER_ABI,
          functionName: "addLiquidity",
          args: [
            {
              currency0: poolKey.currency0 as `0x${string}`,
              currency1: poolKey.currency1 as `0x${string}`,
              fee: poolKey.fee,
              tickSpacing: poolKey.tickSpacing,
              hooks: poolKey.hooks as `0x${string}`,
            },
            params,
          ],
        });

        console.log(
          "%c[LIQUIDITY] Adding liquidity via quantum-safe transaction...",
          "color: #00ffff; font-weight: bold;",
        );
        console.log("%c[LIQUIDITY] Pool Key:", "color: #00ffff;", poolKey);
        console.log(
          "%c[LIQUIDITY] Tick Range:",
          "color: #00ffff;",
          `[${tickLower}, ${tickUpper}]`,
        );
        console.log(
          "%c[LIQUIDITY] Liquidity Delta:",
          "color: #00ffff;",
          liquidityDelta.toString(),
        );

        const result = await sendSnapTransaction(
          CONTRACTS.QUANTUM_POOL_ROUTER,
          ethValue,
          data,
        );

        if (result.error) {
          console.error(
            "%c[LIQUIDITY] ❌ Snap returned error:",
            "color: #ff0000; font-weight: bold;",
            result.error,
          );
          throw new Error(`Add liquidity failed: ${result.error}`);
        }

        if (!result.transactionHash) {
          console.error(
            "%c[LIQUIDITY] ⚠️ No transaction hash:",
            "color: #ff9900;",
            result,
          );
          throw new Error(
            "Add liquidity failed - no transaction hash received",
          );
        }

        console.log(
          "%c[LIQUIDITY] ✅ Liquidity added successfully!",
          "color: #00ff00; font-weight: bold;",
        );
        console.log(
          "%c[LIQUIDITY] Transaction hash:",
          "color: #00ff00;",
          result.transactionHash,
        );

        return {
          hash: result.transactionHash as `0x${string}`,
          userOpHash: result.userOpHash,
        };
      } catch (err: any) {
        const errorMsg = err.message || "Failed to add liquidity";
        console.error(
          "%c[LIQUIDITY] ❌ Add liquidity failed:",
          "color: #ff0000; font-weight: bold;",
          errorMsg,
        );
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setSnapLoading(false);
      }
    },
    [isConnected, address, isSnapConnected, sendSnapTransaction],
  );

  const removeLiquidity = useCallback(
    async (
      poolKey: PoolKey,
      tickLower: number,
      tickUpper: number,
      liquidityDelta: bigint,
    ) => {
      // Same as addLiquidity but with negative liquidityDelta
      return addLiquidity(poolKey, tickLower, tickUpper, -liquidityDelta);
    },
    [addLiquidity],
  );

  const swap = useCallback(
    async (
      poolKey: PoolKey,
      zeroForOne: boolean,
      amountSpecified: bigint,
      sqrtPriceLimitX96: bigint,
      ethValue: string = "0", // ETH value for native token swaps
    ) => {
      if (!isConnected || !address) {
        throw new Error("Please connect MetaMask Flask first");
      }

      if (!isSnapConnected) {
        throw new Error(
          "Please connect your Quantum Wallet (MetaMask Snap) to swap",
        );
      }

      setError(null);
      setSnapLoading(true);

      try {
        const params: SwapParams = {
          zeroForOne,
          amountSpecified,
          sqrtPriceLimitX96,
        };

        // Encode calldata for QuantumPoolRouter.swap
        const data = encodeFunctionData({
          abi: QUANTUM_POOL_ROUTER_ABI,
          functionName: "swap",
          args: [
            {
              currency0: poolKey.currency0 as `0x${string}`,
              currency1: poolKey.currency1 as `0x${string}`,
              fee: poolKey.fee,
              tickSpacing: poolKey.tickSpacing,
              hooks: poolKey.hooks as `0x${string}`,
            },
            params,
          ],
        });

        console.log(
          "%c[SWAP] Executing swap via quantum-safe transaction...",
          "color: #ff00ff; font-weight: bold;",
        );
        console.log("%c[SWAP] Pool Key:", "color: #ff00ff;", poolKey);
        console.log(
          "%c[SWAP] Direction:",
          "color: #ff00ff;",
          zeroForOne ? "token0 → token1" : "token1 → token0",
        );
        console.log(
          "%c[SWAP] Amount:",
          "color: #ff00ff;",
          amountSpecified.toString(),
        );

        const result = await sendSnapTransaction(
          CONTRACTS.QUANTUM_POOL_ROUTER,
          ethValue,
          data,
        );

        if (result.error) {
          console.error(
            "%c[SWAP] ❌ Snap returned error:",
            "color: #ff0000; font-weight: bold;",
            result.error,
          );
          throw new Error(`Swap failed: ${result.error}`);
        }

        if (!result.transactionHash) {
          console.error(
            "%c[SWAP] ⚠️ No transaction hash:",
            "color: #ff9900;",
            result,
          );
          throw new Error("Swap failed - no transaction hash received");
        }

        console.log(
          "%c[SWAP] ✅ Swap executed successfully!",
          "color: #00ff00; font-weight: bold;",
        );
        console.log(
          "%c[SWAP] Transaction hash:",
          "color: #00ff00;",
          result.transactionHash,
        );

        return {
          hash: result.transactionHash as `0x${string}`,
          userOpHash: result.userOpHash,
        };
      } catch (err: any) {
        const errorMsg = err.message || "Failed to swap";
        console.error(
          "%c[SWAP] ❌ Swap failed:",
          "color: #ff0000; font-weight: bold;",
          errorMsg,
        );
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setSnapLoading(false);
      }
    },
    [isConnected, address, isSnapConnected, sendSnapTransaction],
  );

  // Approve ERC-20 token via quantum account
  const approveToken = useCallback(
    async (tokenAddress: string, spender: string, amount: bigint) => {
      if (!isConnected || !address) {
        throw new Error("Please connect MetaMask Flask first");
      }

      if (!isSnapConnected) {
        throw new Error(
          "Please connect your Quantum Wallet (MetaMask Snap) to approve tokens",
        );
      }

      setError(null);
      setSnapLoading(true);

      try {
        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [spender as `0x${string}`, amount],
        });

        console.log(
          "%c[APPROVE] Approving token via quantum-safe transaction...",
          "color: #ffaa00; font-weight: bold;",
        );
        console.log("%c[APPROVE] Token:", "color: #ffaa00;", tokenAddress);
        console.log("%c[APPROVE] Spender:", "color: #ffaa00;", spender);
        console.log(
          "%c[APPROVE] Amount:",
          "color: #ffaa00;",
          amount.toString(),
        );

        const result = await sendSnapTransaction(tokenAddress, "0", data);

        if (result.error) {
          console.error(
            "%c[APPROVE] ❌ Snap returned error:",
            "color: #ff0000; font-weight: bold;",
            result.error,
          );
          throw new Error(`Token approval failed: ${result.error}`);
        }

        if (!result.transactionHash) {
          console.error(
            "%c[APPROVE] ⚠️ No transaction hash:",
            "color: #ff9900;",
            result,
          );
          throw new Error(
            "Token approval failed - no transaction hash received",
          );
        }

        console.log(
          "%c[APPROVE] ✅ Token approved successfully!",
          "color: #00ff00; font-weight: bold;",
        );
        console.log(
          "%c[APPROVE] Transaction hash:",
          "color: #00ff00;",
          result.transactionHash,
        );

        return {
          hash: result.transactionHash as `0x${string}`,
          userOpHash: result.userOpHash,
        };
      } catch (err: any) {
        const errorMsg = err.message || "Failed to approve token";
        console.error(
          "%c[APPROVE] ❌ Token approval failed:",
          "color: #ff0000; font-weight: bold;",
          errorMsg,
        );
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setSnapLoading(false);
      }
    },
    [isConnected, address, isSnapConnected, sendSnapTransaction],
  );

  // Atomic Batch Pool Creation
  const createPoolBatched = useCallback(
    async (
      currency0: string,
      currency1: string,
      tickSpacing: number,
      initialPrice: bigint,
      amountA: bigint,
      amountB: bigint
    ) => {
      if (!isConnected || !address) {
        throw new Error("Please connect MetaMask Flask first");
      }
      if (!isSnapConnected) {
        throw new Error(
          "Please connect your Quantum Wallet (MetaMask Snap) to create pools",
        );
      }

      setError(null);
      setSnapLoading(true);

      try {
        const txs: Array<{ to: string; value: string; data: string }> = [];

        // --- 1. PREPARE DATA ---

        // Uniswap V4 requires sorted tokens
        const [orderedCurrency0, orderedCurrency1] =
          currency0.toLowerCase() < currency1.toLowerCase()
            ? [currency0, currency1]
            : [currency1, currency0];

        const dynamicFee = 0x800000;
        const poolKey = {
          currency0: orderedCurrency0 as `0x${string}`,
          currency1: orderedCurrency1 as `0x${string}`,
          fee: dynamicFee,
          tickSpacing: tickSpacing,
          hooks: CONTRACTS.QUANTUM_HOOK as `0x${string}`,
        };

        const ROUTER_ADDRESS = CONTRACTS.QUANTUM_POOL_ROUTER;
        const MAX_APPROVAL = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

        // --- 2. CONSTRUCT BATCH ---

        // A. Initialize Pool
        const initData = encodeFunctionData({
          abi: QUANTUM_POOL_ROUTER_ABI,
          functionName: "initialize",
          args: [poolKey, initialPrice] as any,
        });
        txs.push({ to: ROUTER_ADDRESS, value: "0", data: initData });

        // B. Approve Tokens (Router needs to spend them)
        // Token 0
        if (orderedCurrency0 !== "0x0000000000000000000000000000000000000000") {
          const approveData0 = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [ROUTER_ADDRESS as `0x${string}`, MAX_APPROVAL],
          });
          txs.push({ to: orderedCurrency0, value: "0", data: approveData0 });
        }

        // Token 1
        if (orderedCurrency1 !== "0x0000000000000000000000000000000000000000") {
          const approveData1 = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [ROUTER_ADDRESS as `0x${string}`, MAX_APPROVAL],
          });
          txs.push({ to: orderedCurrency1, value: "0", data: approveData1 });
        }

        // C. Add Liquidity
        // Full range tick logic
        const tickLower = -887220;
        const tickUpper = 887220;

        // Liquidity Delta Calculation (Approximate for full range)
        // L = sqrt(amount0 * amount1)
        const liquidityDelta = BigInt(Math.floor(Math.sqrt(Number(amountA * amountB))));
        // Note: JS Math.sqrt loses precision for bigints, but for hackathon UI this is acceptable approx
        // A better way would be using a bigint sqrt library, but sticking to simple for now.
        // Actually, let's use the one from CreatePool if possible, or simple bigint sqrt
        const sqrtBigInt = (n: bigint) => {
          if (n < 0n) throw new Error("negative number");
          if (n < 2n) return n;
          let x = n;
          let y = (x + 1n) / 2n;
          while (y < x) { x = y; y = (x + n / x) / 2n; }
          return x;
        };
        const liquidity = sqrtBigInt(amountA * amountB);

        const params: ModifyLiquidityParams = {
          tickLower,
          tickUpper,
          liquidityDelta: liquidity,
          salt: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        };

        const addLiquidityData = encodeFunctionData({
          abi: QUANTUM_POOL_ROUTER_ABI,
          functionName: "addLiquidity",
          args: [poolKey, params] as any,
        });

        // ETH Value for the batch
        // If either token is ETH, we need to send value. 
        // BUT, since we are calling the Router, and the Router expects msg.value for ETH inputs...
        // Wait, the router calls Manager.modifyLiquidity. 
        // If the pool has ETH, the router forwards value.
        // So we sum up ETH amounts.
        let ethValue = 0n;
        if (orderedCurrency0 === "0x0000000000000000000000000000000000000000") ethValue += amountA;
        if (orderedCurrency1 === "0x0000000000000000000000000000000000000000") ethValue += amountB;

        txs.push({ to: ROUTER_ADDRESS, value: ethValue.toString(), data: addLiquidityData });

        // --- 3. SEND BATCH ---
        console.log("Creating pool with batch:", txs);
        const result = await batchTransactions(txs);

        return result;

      } catch (err: any) {
        console.error("Batch Creation Failed:", err);
        setError(err.message);
        throw err;
      } finally {
        setSnapLoading(false);
      }
    }, [isConnected, address, isSnapConnected, sendSnapTransaction, batchTransactions]
  );

  return {
    createPool,
    createPoolBatched,
    addLiquidity,
    removeLiquidity,
    swap,
    approveToken,
    loading: snapLoading,
    error,
    isSnapConnected,
  };
}
