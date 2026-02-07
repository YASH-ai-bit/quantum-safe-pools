
import { createPublicClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";

const FACTORY_ADDRESS = "0xBB11b843AF7fd96E7602E081272cf91100Da98Df"; // From contracts.ts
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/gM0WBanXaAgbz8juDtJ-5"; // From contracts.ts

const FACTORY_ABI = parseAbi([
    "function createPool(address tokenA, address tokenB) external returns (address pool)",
    "function getPool(address tokenA, address tokenB) external view returns (address pool)"
]);

// Tokens from contracts.ts
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const PYUSD = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";

async function main() {
    const client = createPublicClient({
        chain: sepolia,
        transport: http(RPC_URL),
    });

    console.log("Checking if pool exists...");
    const pool = await client.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "getPool",
        args: [USDC, PYUSD],
    });

    console.log("Pool address:", pool);

    if (pool !== "0x0000000000000000000000000000000000000000") {
        console.log("Pool already exists! Creation should fail with POOL_EXISTS.");
    } else {
        console.log("Pool does not exist. Attempting simulation...");
    }

    try {
        console.log("Simulating createPool...");
        const { result } = await client.simulateContract({
            address: FACTORY_ADDRESS,
            abi: FACTORY_ABI,
            functionName: "createPool",
            args: [USDC, PYUSD],
            account: "0x71877B35abc4D002Ffe6eCc32E7c02FEbBc9FC96", // Using Paymaster as sender (arbitrary)
        });
        console.log("Simulation successful! Result:", result);
    } catch (error: any) {
        console.error("Simulation failed!");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        if (error.cause) {
            console.error("Cause:", error.cause);
        }
    }
}

main().catch(console.error);
