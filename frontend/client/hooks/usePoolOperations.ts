import { useState, useCallback } from "react";
import { useSnap } from "./useSnap";
import { useAccount } from "wagmi";
import { CONTRACTS } from "@shared/contracts";
import { encodeFunctionData, keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { readContract } from "@wagmi/core";
import { wagmiConfig as config } from "@/lib/wagmi";

// ERC-20 ABI for token operations
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
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;


// QuantumAMMFactory ABI
const QUANTUM_AMM_FACTORY_ABI = [
  {
    name: "createPool",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
  {
    name: "getPool",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
] as const;

// QuantumAMMRouter ABI
const QUANTUM_AMM_ROUTER_ABI = [
  {
    name: "addLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
  {
    name: "removeLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
    ],
  },
  {
    name: "swapExactTokensForTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    name: "executeBatch",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "batchId", type: "bytes32" },
      { name: "calls", type: "bytes[]" }
    ],
    outputs: []
  }
] as const;

export function usePoolOperations() {
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const [snapLoading, setSnapLoading] = useState(false);

  // Hook for Snap - all operations go through quantum account
  const { isConnected: isSnapConnected, sendTransaction: sendSnapTransaction, batchTransactions, accountAddress: snapAddress } =
    useSnap();

  // Use Snap address if connected (Smart Account), otherwise fallback to EOA (though we enforce Snap connection)
  const recipientAddress = snapAddress || address;

  const createPool = useCallback(
    async (
      currency0: string,
      currency1: string,
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

      // Store in standard order, though Factory handles it
      const [token0, token1] = currency0.toLowerCase() < currency1.toLowerCase()
        ? [currency0, currency1]
        : [currency1, currency0];

      try {
        setSnapLoading(true);
        try {
          // Call QuantumAMMFactory.createPool
          const data = encodeFunctionData({
            abi: QUANTUM_AMM_FACTORY_ABI,
            functionName: "createPool",
            args: [token0 as `0x${string}`, token1 as `0x${string}`],
          });

          console.log(
            "%c[POOL] Creating pool via Quantum Factory...",
            "color: #00ffff; font-weight: bold;",
          );

          const result = await sendSnapTransaction(
            CONTRACTS.QUANTUM_AMM_FACTORY,
            "0", // value
            data,
          );

          if (result.error) throw new Error(`Pool creation failed: ${result.error}`);
          if (!result.transactionHash) throw new Error("Pool creation failed - no transaction hash");

          console.log("%c[POOL] ✅ Pool created successfully!", "color: #00ff00; font-weight: bold;");

          return {
            transactionHash: result.transactionHash as `0x${string}`,
            userOpHash: result.userOpHash,
          };
        } finally {
          setSnapLoading(false);
        }
      } catch (err: any) {
        const errorMsg = err.message || "Failed to create pool";
        console.error(errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },
    [isConnected, address, isSnapConnected, sendSnapTransaction],
  );

  const addLiquidity = useCallback(
    async (
      tokenA: string,
      tokenB: string,
      amountA: bigint,
      amountB: bigint,
      amountAMin: bigint = 0n,
      amountBMin: bigint = 0n,
      ethValue: string = "0",
    ) => {
      if (!isConnected || !address) throw new Error("Please connect MetaMask Flask first");
      if (!isSnapConnected) throw new Error("Please connect your Quantum Wallet");

      setError(null);
      setSnapLoading(true);

      try {
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 mins

        // Encode calldata for QuantumAMMRouter.addLiquidity
        const data = encodeFunctionData({
          abi: QUANTUM_AMM_ROUTER_ABI,
          functionName: "addLiquidity",
          args: [
            tokenA as `0x${string}`,
            tokenB as `0x${string}`,
            amountA,
            amountB,
            amountAMin,
            amountBMin,
            recipientAddress as `0x${string}`, // To user's Quantum Account (self)
            deadline
          ],
        });

        console.log("%c[LIQUIDITY] Adding liquidity...", "color: #00ffff; font-weight: bold;");

        const result = await sendSnapTransaction(
          CONTRACTS.QUANTUM_AMM_ROUTER,
          ethValue,
          data,
        );

        if (result.error) throw new Error(`Add liquidity failed: ${result.error}`);
        if (!result.transactionHash) throw new Error("Add liquidity failed - no transaction hash");

        console.log("%c[LIQUIDITY] ✅ Liquidity added successfully!", "color: #00ff00; font-weight: bold;");

        return {
          transactionHash: result.transactionHash as `0x${string}`,
          userOpHash: result.userOpHash,
        };
      } catch (err: any) {
        const errorMsg = err.message || "Failed to add liquidity";
        console.error(errorMsg);
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
      tokenA: string,
      tokenB: string,
      liquidity: bigint,
      amountAMin: bigint = 0n,
      amountBMin: bigint = 0n,
    ) => {
      if (!isConnected || !address) throw new Error("Please connect MetaMask Flask first");
      if (!isSnapConnected) throw new Error("Please connect your Quantum Wallet");

      setError(null);
      setSnapLoading(true);

      try {
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

        // Need to approve LP tokens first? 
        // The router "removeLiquidity" uses transferFrom on the LP token.
        // Since the LP token is separate (QuantumAMMPool), the user must approve the Router to spend it.
        // Note: In this simple implementation we might rely on a separate approve step or batch it.
        // For now, I'm assuming approval is handled or bundled.

        const data = encodeFunctionData({
          abi: QUANTUM_AMM_ROUTER_ABI,
          functionName: "removeLiquidity",
          args: [
            tokenA as `0x${string}`,
            tokenB as `0x${string}`,
            liquidity,
            amountAMin,
            amountBMin,
            recipientAddress as `0x${string}`,
            deadline
          ],
        });

        console.log("%c[LIQUIDITY] Removing liquidity...", "color: #00ffff; font-weight: bold;");

        const result = await sendSnapTransaction(
          CONTRACTS.QUANTUM_AMM_ROUTER,
          "0",
          data,
        );

        if (result.error) throw new Error(`Remove liquidity failed: ${result.error}`);
        return { transactionHash: result.transactionHash as `0x${string}`, userOpHash: result.userOpHash };
      } catch (err: any) {
        const errorMsg = err.message || "Failed to remove liquidity";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setSnapLoading(false);
      }
    },
    [isConnected, address, isSnapConnected, sendSnapTransaction],
  );

  const swap = useCallback(
    async (
      tokenIn: string,
      tokenOut: string,
      amountIn: bigint,
      amountOutMin: bigint,
      ethValue: string = "0",
    ) => {
      if (!isConnected || !address) throw new Error("Please connect MetaMask Flask first");
      if (!isSnapConnected) throw new Error("Please connect your Quantum Wallet");

      setError(null);
      setSnapLoading(true);

      try {
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
        const path = [tokenIn as `0x${string}`, tokenOut as `0x${string}`];

        const data = encodeFunctionData({
          abi: QUANTUM_AMM_ROUTER_ABI,
          functionName: "swapExactTokensForTokens",
          args: [
            amountIn,
            amountOutMin,
            path,
            recipientAddress as `0x${string}`,
            deadline
          ],
        });

        console.log("%c[SWAP] Executing swap...", "color: #ff00ff; font-weight: bold;");

        const result = await sendSnapTransaction(
          CONTRACTS.QUANTUM_AMM_ROUTER,
          ethValue,
          data,
        );

        if (result.error) throw new Error(`Swap failed: ${result.error}`);
        if (!result.transactionHash) throw new Error("Swap failed - no transaction hash");

        console.log("%c[SWAP] ✅ Swap executed successfully!", "color: #00ff00; font-weight: bold;");

        return {
          transactionHash: result.transactionHash as `0x${string}`,
          userOpHash: result.userOpHash,
        };
      } catch (err: any) {
        const errorMsg = err.message || "Failed to swap";
        console.error(errorMsg);
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
      if (!isConnected || !address) throw new Error("Not connected");
      if (!isSnapConnected) throw new Error("Connect Quantum Wallet");

      setError(null);
      setSnapLoading(true);

      try {
        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [spender as `0x${string}`, amount],
        });

        console.log("%c[APPROVE] Approving token...", "color: #ffaa00; font-weight: bold;");

        const result = await sendSnapTransaction(tokenAddress, "0", data);

        if (result.error) throw new Error(`Approval failed: ${result.error}`);
        return { transactionHash: result.transactionHash as `0x${string}`, userOpHash: result.userOpHash };
      } catch (err: any) {
        const errorMsg = err.message || "Failed to approve";
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
      amountA: bigint,
      amountB: bigint
    ) => {
      if (!isConnected || !address) throw new Error("Not connected");
      if (!isSnapConnected) throw new Error("Connect Quantum Wallet");

      setError(null);
      setSnapLoading(true);

      try {
        // Safety check for addresses with fallbacks
        const FACTORY = CONTRACTS?.QUANTUM_AMM_FACTORY || "0xE5acFcC6bf0BB0f64204775526E033C76d2130a9";
        const ROUTER_ADDR = CONTRACTS?.QUANTUM_AMM_ROUTER || "0xA9ebc6aEfe13D9e93BcBA94aFE54E513bB730722";

        console.log("[DEBUG] Addresses:", { FACTORY, ROUTER_ADDR, CONTRACTS });

        if (!FACTORY || !ROUTER_ADDR) throw new Error("Contract addresses undefined");

        // Check if pool already exists
        const existingPool = await readContract(config, {
          abi: QUANTUM_AMM_FACTORY_ABI,
          address: FACTORY as `0x${string}`,
          functionName: "getPool",
          args: [currency0 as `0x${string}`, currency1 as `0x${string}`],
        });

        if (existingPool && existingPool !== "0x0000000000000000000000000000000000000000") {
          throw new Error("Pool already exists. Please use the Pools page to add liquidity.");
        }

        // STEP 1: Create Pool (Standalone Transaction)
        console.log("%c[STEP 1] Creating pool...", "color: #00ffff; font-weight: bold;");

        const createData = encodeFunctionData({
          abi: QUANTUM_AMM_FACTORY_ABI,
          functionName: "createPool",
          args: [currency0 as `0x${string}`, currency1 as `0x${string}`],
        });

        const tx1 = await sendSnapTransaction(
          FACTORY,
          "0",
          createData
        );

        if (tx1.error) throw new Error(`Pool creation failed: ${tx1.error}`);
        if (!tx1.transactionHash) throw new Error("Pool creation failed - no hash");

        console.log("%c[STEP 1] ✅ Pool created! Hash: " + tx1.transactionHash, "color: #00ff00;");

        // STEP 2: Add Liquidity (Batch: Approve + Add)
        console.log("%c[STEP 2] Approving and Adding Liquidity...", "color: #00ffff; font-weight: bold;");

        const txs: Array<{ to: string; value: string; data: string }> = [];

        // Approve Tokens for Router
        const ROUTER = ROUTER_ADDR;
        const MAX = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

        if (currency0 !== "0x0000000000000000000000000000000000000000") {
          const app0 = encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [ROUTER as `0x${string}`, MAX] });
          txs.push({ to: currency0, value: "0", data: app0 });
        }
        if (currency1 !== "0x0000000000000000000000000000000000000000") {
          const app1 = encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [ROUTER as `0x${string}`, MAX] });
          txs.push({ to: currency1, value: "0", data: app1 });
        }

        // Add Liquidity via Router
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
        const addLiqData = encodeFunctionData({
          abi: QUANTUM_AMM_ROUTER_ABI,
          functionName: "addLiquidity",
          args: [
            currency0 as `0x${string}`,
            currency1 as `0x${string}`,
            amountA,
            amountB,
            0n, // Min 0 for initial
            0n,
            recipientAddress as `0x${string}`, // to
            deadline
          ]
        });
        txs.push({ to: ROUTER, value: "0", data: addLiqData });

        const result = await batchTransactions(txs);

        if (result.error) throw new Error(`Liquidity addition failed: ${result.error}`);

        console.log("%c[STEP 2] ✅ Liquidity Added!", "color: #00ff00;");
        return {
          transactionHash: result.transactionHash as `0x${string}`,
          userOpHash: result.userOpHash
        };

      } catch (err: any) {
        const errorMsg = err.message || "Failed to batch create pool";
        console.error(errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setSnapLoading(false);
      }
    },
    [isConnected, address, isSnapConnected, batchTransactions]
  );

  return {
    createPool,
    addLiquidity,
    removeLiquidity,
    swap,
    approveToken,
    createPoolBatched,
    error,
    setError,
    loading: snapLoading,
    snapLoading,
    isSnapConnected,
  };
}
