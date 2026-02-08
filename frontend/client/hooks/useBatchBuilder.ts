import { encodeFunctionData } from "viem";

// ERC20 ABI for approve function
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

// Factory ABI
const FACTORY_ABI = [
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
            { name: "token0", type: "address" },
            { name: "token1", type: "address" },
        ],
        outputs: [{ name: "darkPool", type: "address" }],
    },
] as const;

// Router ABI
const ROUTER_ABI = [
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
] as const;

export interface BatchCall {
    to: string;
    value: string;
    data: string;
}

/**
 * Utility hook for building batch transaction calls
 * All pool operations are built as batches by default
 */
export function useBatchBuilder() {
    /**
     * Build ERC20 token approval call
     */
    const buildApproval = (
        tokenAddress: string,
        spenderAddress: string,
        amount: bigint,
    ): BatchCall => {
        const data = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [spenderAddress as `0x${string}`, amount],
        });

        return {
            to: tokenAddress,
            value: "0",
            data,
        };
    };

    /**
     * Build pool creation call
     */
    const buildPoolCreation = (
        factoryAddress: string,
        tokenA: string,
        tokenB: string,
        isDarkPool: boolean = false,
    ): BatchCall => {
        const data = encodeFunctionData({
            abi: FACTORY_ABI,
            functionName: isDarkPool ? "createDarkPool" : "createPool",
            args: [tokenA as `0x${string}`, tokenB as `0x${string}`],
        });

        return {
            to: factoryAddress,
            value: "0",
            data,
        };
    };

    /**
     * Build add liquidity call
     */
    const buildAddLiquidity = (
        routerAddress: string,
        tokenA: string,
        tokenB: string,
        amountA: bigint,
        amountB: bigint,
        amountAMin: bigint,
        amountBMin: bigint,
        recipient: string,
        deadline: bigint,
    ): BatchCall => {
        const data = encodeFunctionData({
            abi: ROUTER_ABI,
            functionName: "addLiquidity",
            args: [
                tokenA as `0x${string}`,
                tokenB as `0x${string}`,
                amountA,
                amountB,
                amountAMin,
                amountBMin,
                recipient as `0x${string}`,
                deadline,
            ],
        });

        return {
            to: routerAddress,
            value: "0",
            data,
        };
    };

    /**
     * Build swap call
     */
    const buildSwap = (
        routerAddress: string,
        amountIn: bigint,
        amountOutMin: bigint,
        path: string[],
        recipient: string,
        deadline: bigint,
    ): BatchCall => {
        const data = encodeFunctionData({
            abi: ROUTER_ABI,
            functionName: "swapExactTokensForTokens",
            args: [
                amountIn,
                amountOutMin,
                path as `0x${string}`[],
                recipient as `0x${string}`,
                deadline,
            ],
        });

        return {
            to: routerAddress,
            value: "0",
            data,
        };
    };

    /**
     * Build remove liquidity call
     */
    const buildRemoveLiquidity = (
        routerAddress: string,
        tokenA: string,
        tokenB: string,
        liquidity: bigint,
        amountAMin: bigint,
        amountBMin: bigint,
        recipient: string,
        deadline: bigint,
    ): BatchCall => {
        const data = encodeFunctionData({
            abi: ROUTER_ABI,
            functionName: "removeLiquidity",
            args: [
                tokenA as `0x${string}`,
                tokenB as `0x${string}`,
                liquidity,
                amountAMin,
                amountBMin,
                recipient as `0x${string}`,
                deadline,
            ],
        });

        return {
            to: routerAddress,
            value: "0",
            data,
        };
    };

    return {
        buildApproval,
        buildPoolCreation,
        buildAddLiquidity,
        buildSwap,
        buildRemoveLiquidity,
    };
}
