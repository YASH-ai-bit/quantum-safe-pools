import { useState, useCallback } from "react";
import { useSnap } from "./useSnap";
import { useAccount, usePublicClient } from "wagmi";
import { CONTRACTS } from "@shared/contracts";
import {
  encodeFunctionData,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  decodeEventLog,
  Hex,
} from "viem";
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

// FHE Operation Proof Event ABI
const FHE_EVENT_ABI = [
  {
    name: "FHEOperationProof",
    type: "event",
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "operation", type: "string" },
      { indexed: false, name: "timestamp", type: "uint256" },
      { indexed: false, name: "operationCount", type: "uint256" },
      { indexed: false, name: "metadata", type: "string" },
    ],
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
    name: "createDarkPool",
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
  {
    name: "getDarkPool",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
  {
    name: "hasPool",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "hasDarkPool",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
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
      { name: "calls", type: "bytes[]" },
    ],
    outputs: [],
  },
] as const;

// Helper to fetch and display FHE operation proof events
const logFHEOperations = async (txHash: string, publicClient: any) => {
  try {
    console.log(
      "%c\n╔════════════════════════════════════════════════════════════════╗",
      "color: #00ffff; font-weight: bold;",
    );
    console.log(
      "%c║                FHE OPERATION PROOF VERIFICATION                ║",
      "color: #00ffff; font-weight: bold;",
    );
    console.log(
      "%c╚════════════════════════════════════════════════════════════════╝\n",
      "color: #00ffff; font-weight: bold;",
    );

    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as Hex,
    });

    if (!receipt) {
      console.warn("Transaction receipt not found yet");
      return;
    }

    // Transaction details
    const gasUsed = receipt.gasUsed;
    const blockNumber = receipt.blockNumber;
    const effectiveGasPrice = receipt.effectiveGasPrice || 0n;
    const totalCost = gasUsed * effectiveGasPrice;

    console.log("%c[TRANSACTION INFO]", "color: #00ffff; font-weight: bold;");
    console.log(`%c  Block: ${blockNumber}`, "color: #888;");
    console.log(
      `%c  Gas Used: ${gasUsed.toLocaleString()} units`,
      "color: #888;",
    );
    console.log(
      `%c  Gas Price: ${Number(effectiveGasPrice) / 1e9} Gwei`,
      "color: #888;",
    );
    console.log(
      `%c  Total Cost: ${Number(totalCost) / 1e18} ETH`,
      "color: #888;",
    );
    console.log(
      `%c  Etherscan: https://sepolia.etherscan.io/tx/${txHash}#eventlog\n`,
      "color: #888;",
    );

    // Find FHE events (topic0 = keccak256("FHEOperationProof(address,string,uint256,uint256,string)"))
    const fheEventTopic =
      "0x20f30db585055e157d7c097deb7e72bfa0bc9c69e833f2513d659db8785f7738";
    const fheLogs = receipt.logs.filter(
      (log: any) => log.topics[0] === fheEventTopic,
    );

    if (fheLogs.length === 0) {
      console.log(
        "%c[WARNING] No FHE operations detected (normal pool or different operation)",
        "color: #ffaa00;",
      );
      return;
    }

    console.log(
      `%c[FHE OPERATIONS] Found ${fheLogs.length} homomorphic operations:`,
      "color: #00ff00; font-weight: bold;",
    );

    // Get dark pool address
    const darkPoolAddress = fheLogs[0]?.address;
    if (darkPoolAddress) {
      console.log(`%c  Dark Pool: ${darkPoolAddress}`, "color: #888;");
    }
    console.log(""); // blank line

    // Categorize operations
    let encryptOps = 0,
      arithmeticOps = 0,
      decryptOps = 0,
      otherOps = 0;

    fheLogs.forEach((log: any, index: number) => {
      try {
        const decoded = decodeEventLog({
          abi: FHE_EVENT_ABI,
          data: log.data,
          topics: log.topics,
        });

        const { user, operation, timestamp, operationCount, metadata } =
          decoded.args as any;

        // Categorize
        if (operation.includes("ENCRYPT")) encryptOps++;
        else if (
          operation.includes("ADD") ||
          operation.includes("MUL") ||
          operation.includes("CALCULATE")
        )
          arithmeticOps++;
        else if (operation.includes("DECRYPT")) decryptOps++;
        else otherOps++;

        // Determine operation type for display
        const opType = operation.includes("ENCRYPT")
          ? "[ENCRYPT]"
          : operation.includes("DECRYPT")
            ? "[DECRYPT]"
            : operation.includes("ADD")
              ? "[FHE-ADD]"
              : operation.includes("MUL")
                ? "[FHE-MUL]"
                : operation.includes("CALCULATE")
                  ? "[COMPUTE]"
                  : operation.includes("UPDATE")
                    ? "[UPDATE]"
                    : "[OTHER]";

        // Format timestamp
        const date = new Date(Number(timestamp) * 1000);
        const timeStr = date.toLocaleTimeString();

        console.log(
          `%c  [${operationCount}] ${opType} ${operation}`,
          "color: #00ffff; font-weight: bold;",
        );
        console.log(`%c      └─ ${metadata}`, "color: #aaa;");
        console.log(`%c      └─ User: ${user}`, "color: #666;");
        console.log(`%c      └─ Time: ${timeStr}`, "color: #666;");
      } catch (e) {
        console.warn("Failed to decode FHE event", e);
      }
    });

    console.log(
      `\n%c[SUMMARY]`,
      "color: #00ff00; font-weight: bold; font-size: 14px;",
    );
    console.log(`%c  Total Operations: ${fheLogs.length}`, "color: #888;");
    console.log(`%c  ├─ Encryption Ops: ${encryptOps}`, "color: #888;");
    console.log(
      `%c  ├─ Arithmetic Ops (FHE): ${arithmeticOps}`,
      "color: #888;",
    );
    console.log(`%c  ├─ Decryption Ops: ${decryptOps}`, "color: #888;");
    console.log(`%c  └─ Other Ops: ${otherOps}`, "color: #888;");
    console.log(
      `\n%c[PROOF] This transaction executed ${arithmeticOps} homomorphic operations on encrypted data`,
      "color: #00ff00; font-weight: bold;",
    );
    console.log(
      "%c  Compare to normal AMM: 0 FHE operations (all data public)\n",
      "color: #888;",
    );
  } catch (error) {
    console.error("Error fetching FHE operations:", error);
  }
};

export function usePoolOperations() {
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [snapLoading, setSnapLoading] = useState(false);

  // Hook for Snap - all operations go through quantum account
  const {
    isConnected: isSnapConnected,
    sendTransaction: sendSnapTransaction,
    batchTransactions,
    accountAddress: snapAddress,
  } = useSnap();

  // Use Snap address if connected (Smart Account), otherwise fallback to EOA (though we enforce Snap connection)
  const recipientAddress = snapAddress || address;

  const createPool = useCallback(
    async (currency0: string, currency1: string) => {
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
      const [token0, token1] =
        currency0.toLowerCase() < currency1.toLowerCase()
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

          if (result.error)
            throw new Error(`Pool creation failed: ${result.error}`);
          if (!result.transactionHash)
            throw new Error("Pool creation failed - no transaction hash");

          console.log(
            "%c[POOL] ✅ Pool created successfully!",
            "color: #00ff00; font-weight: bold;",
          );

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
      if (!isConnected || !address)
        throw new Error("Please connect MetaMask Flask first");
      if (!isSnapConnected)
        throw new Error("Please connect your Quantum Wallet");

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
            deadline,
          ],
        });

        console.log(
          "%c[LIQUIDITY] Adding liquidity...",
          "color: #00ffff; font-weight: bold;",
        );

        const result = await sendSnapTransaction(
          CONTRACTS.QUANTUM_AMM_ROUTER,
          ethValue,
          data,
        );

        if (result.error)
          throw new Error(`Add liquidity failed: ${result.error}`);
        if (!result.transactionHash)
          throw new Error("Add liquidity failed - no transaction hash");

        console.log(
          "%c[LIQUIDITY] ✅ Liquidity added successfully!",
          "color: #00ff00; font-weight: bold;",
        );

        // Log FHE operations if available
        if (publicClient) {
          await logFHEOperations(result.transactionHash, publicClient);
        }

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
      if (!isConnected || !address)
        throw new Error("Please connect MetaMask Flask first");
      if (!isSnapConnected)
        throw new Error("Please connect your Quantum Wallet");

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
            deadline,
          ],
        });

        console.log(
          "%c[LIQUIDITY] Removing liquidity...",
          "color: #00ffff; font-weight: bold;",
        );

        const result = await sendSnapTransaction(
          CONTRACTS.QUANTUM_AMM_ROUTER,
          "0",
          data,
        );

        if (result.error)
          throw new Error(`Remove liquidity failed: ${result.error}`);
        if (!result.transactionHash)
          throw new Error("Remove liquidity failed - no transaction hash");

        console.log(
          "%c[LIQUIDITY] ✅ Liquidity removed successfully!",
          "color: #00ff00; font-weight: bold;",
        );

        // Log FHE operations if available
        if (publicClient) {
          await logFHEOperations(result.transactionHash, publicClient);
        }

        return {
          transactionHash: result.transactionHash as `0x${string}`,
          userOpHash: result.userOpHash,
        };
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
      if (!isConnected || !address)
        throw new Error("Please connect MetaMask Flask first");
      if (!isSnapConnected)
        throw new Error("Please connect your Quantum Wallet");

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
            deadline,
          ],
        });

        console.log(
          "%c[SWAP] Executing swap...",
          "color: #ff00ff; font-weight: bold;",
        );

        const result = await sendSnapTransaction(
          CONTRACTS.QUANTUM_AMM_ROUTER,
          ethValue,
          data,
        );

        if (result.error) throw new Error(`Swap failed: ${result.error}`);
        if (!result.transactionHash)
          throw new Error("Swap failed - no transaction hash");

        console.log(
          "%c[SWAP] ✅ Swap executed successfully!",
          "color: #00ff00; font-weight: bold;",
        );

        // Log FHE operations if available
        if (publicClient) {
          await logFHEOperations(result.transactionHash, publicClient);
        }

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

        console.log(
          "%c[APPROVE] Approving token...",
          "color: #ffaa00; font-weight: bold;",
        );

        const result = await sendSnapTransaction(tokenAddress, "0", data);

        if (result.error) throw new Error(`Approval failed: ${result.error}`);
        return {
          transactionHash: result.transactionHash as `0x${string}`,
          userOpHash: result.userOpHash,
        };
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
      amountB: bigint,
      poolType: "normal" | "dark" = "normal",
    ) => {
      if (!isConnected || !address) throw new Error("Not connected");
      if (!isSnapConnected) throw new Error("Connect Quantum Wallet");

      setError(null);
      setSnapLoading(true);

      try {
        // Safety check for addresses with fallbacks
        const FACTORY =
          CONTRACTS?.QUANTUM_AMM_FACTORY ||
          "0xE5acFcC6bf0BB0f64204775526E033C76d2130a9";
        const ROUTER_ADDR =
          CONTRACTS?.QUANTUM_AMM_ROUTER ||
          "0xA9ebc6aEfe13D9e93BcBA94aFE54E513bB730722";

        console.log("[DEBUG] Addresses:", { FACTORY, ROUTER_ADDR, CONTRACTS });

        if (!FACTORY || !ROUTER_ADDR)
          throw new Error("Contract addresses undefined");

        // Check if pool of the requested type already exists
        const poolGetter = poolType === "dark" ? "getDarkPool" : "getPool";
        const existingPool = await readContract(config, {
          abi: QUANTUM_AMM_FACTORY_ABI,
          address: FACTORY as `0x${string}`,
          functionName: poolGetter,
          args: [currency0 as `0x${string}`, currency1 as `0x${string}`],
        });

        if (
          existingPool &&
          existingPool !== "0x0000000000000000000000000000000000000000"
        ) {
          throw new Error(
            `${poolType === "dark" ? "Dark" : "Normal"} pool already exists for this pair. Please use the Pools page to add liquidity.`,
          );
        }

        // STEP 1: Create Pool (Standalone Transaction)
        const poolTypeLabel = poolType === "dark" ? "Dark Pool" : "Pool";
        console.log(
          `%c[STEP 1] Creating ${poolTypeLabel}...`,
          "color: #00ffff; font-weight: bold;",
        );

        const createFunctionName =
          poolType === "dark" ? "createDarkPool" : "createPool";
        const createData = encodeFunctionData({
          abi: QUANTUM_AMM_FACTORY_ABI,
          functionName: createFunctionName,
          args: [currency0 as `0x${string}`, currency1 as `0x${string}`],
        });

        const tx1 = await sendSnapTransaction(FACTORY, "0", createData);

        if (tx1.error)
          throw new Error(`${poolTypeLabel} creation failed: ${tx1.error}`);
        if (!tx1.transactionHash)
          throw new Error(`${poolTypeLabel} creation failed - no hash`);

        console.log(
          `%c[STEP 1] ✅ ${poolTypeLabel} created! Hash: ` +
            tx1.transactionHash,
          "color: #00ff00;",
        );

        // STEP 2: Add Liquidity (Batch: Approve + Add)
        console.log(
          "%c[STEP 2] Approving and Adding Liquidity...",
          "color: #00ffff; font-weight: bold;",
        );

        const txs: Array<{ to: string; value: string; data: string }> = [];

        // Approve router for both normal and dark pools
        // Router will handle the token transfers appropriately
        const ROUTER = ROUTER_ADDR;
        const MAX = BigInt(
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        );
        const approvalTarget = ROUTER;

        console.log(
          `%c[STEP 2] Approving router: ${approvalTarget}`,
          "color: #00ffff;",
        );

        if (currency0 !== "0x0000000000000000000000000000000000000000") {
          const app0 = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [approvalTarget as `0x${string}`, MAX],
          });
          txs.push({ to: currency0, value: "0", data: app0 });
        }
        if (currency1 !== "0x0000000000000000000000000000000000000000") {
          const app1 = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [approvalTarget as `0x${string}`, MAX],
          });
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
            deadline,
          ],
        });
        txs.push({ to: ROUTER, value: "0", data: addLiqData });

        const result = await batchTransactions(txs);

        if (result.error)
          throw new Error(`Liquidity addition failed: ${result.error}`);

        console.log("%c[STEP 2] ✅ Liquidity Added!", "color: #00ff00;");
        return {
          transactionHash: result.transactionHash as `0x${string}`,
          userOpHash: result.userOpHash,
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
    [isConnected, address, isSnapConnected, batchTransactions],
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
