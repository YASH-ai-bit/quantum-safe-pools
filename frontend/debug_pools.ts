import { createPublicClient, http, formatUnits } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import * as path from "path";

// Load from frontend .env
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Use environment variables
const FACTORY_ADDRESS = (process.env.QUANTUM_AMM_FACTORY_ADDRESS || "0x0585057f47B2746b5c86CfD16466818D7Ca7CDbC") as `0x${string}`;
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

const FACTORY_ABI = [
    {
        name: "allPoolsLength",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "allPools",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "", type: "uint256" }],
        outputs: [{ name: "", type: "address" }],
    },
] as const;

const POOL_ABI = [
    {
        name: "token0",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "address" }],
    },
    {
        name: "token1",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "address" }],
    },
    {
        name: "getReserves",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [
            { name: "reserve0", type: "uint256" },
            { name: "reserve1", type: "uint256" },
        ],
    },
] as const;

const ERC20_ABI = [
    {
        name: "symbol",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "string" }],
    },
    {
        name: "decimals",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint8" }],
    },
] as const;

async function main() {
    const client = createPublicClient({
        chain: sepolia,
        transport: http(RPC_URL),
    });

    console.log(`Checking Factory at: ${FACTORY_ADDRESS}`);

    try {
        const length = await client.readContract({
            address: FACTORY_ADDRESS as `0x${string}`,
            abi: FACTORY_ABI,
            functionName: "allPoolsLength",
        });

        console.log(`Total Pools: ${length}`);

        for (let i = 0; i < Number(length); i++) {
            console.log(`--- Pool ${i} ---`);
            const poolAddress = await client.readContract({
                address: FACTORY_ADDRESS as `0x${string}`,
                abi: FACTORY_ABI,
                functionName: "allPools",
                args: [BigInt(i)],
            });
            console.log(`Address: ${poolAddress}`);

            const [t0, t1, reserves] = await Promise.all([
                client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: "token0" }),
                client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: "token1" }),
                client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: "getReserves" }),
            ]);

            console.log(`Token0 Address: ${t0}`);
            console.log(`Token1 Address: ${t1}`);
            console.log(`Reserves: ${reserves[0]} / ${reserves[1]}`);

            // Try to get headers
            try {
                const [s0, s1, d0, d1] = await Promise.all([
                    client.readContract({ address: t0, abi: ERC20_ABI, functionName: "symbol" }),
                    client.readContract({ address: t1, abi: ERC20_ABI, functionName: "symbol" }),
                    client.readContract({ address: t0, abi: ERC20_ABI, functionName: "decimals" }),
                    client.readContract({ address: t1, abi: ERC20_ABI, functionName: "decimals" }),
                ]);
                console.log(`Token0: ${s0} (${d0})`);
                console.log(`Token1: ${s1} (${d1})`);
            } catch (e) {
                console.log(`Could not fetch token symbols (likely mock tokens): ${e}`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
