/**
 * Smart Contract Addresses
 * Update these after deployment
 */

export const CONTRACTS = {
  // Sepolia Testnet Addresses (deployed!)
  QUANTUM_REGISTRY: '0x6fB18387550c9c3edFB74D74B8e78Cd01F40101B',
  GROTH16_VERIFIER: '0x0A3A39F7f636F606692Cf0e71A842B95a03A9909',
  QUANTUM_ACCOUNT_FACTORY: '0xeE4Ef8689dCe64eaB998C8bA1b6fc2a910641aA2',
  HACKATHON_PAYMASTER: '0xD6100C7dDaECAcFa235251cf53f824033Baa2f43',
  ENTRYPOINT: '0xaC7Fb473CF99aa52e6739806320E36bF8A66f488', // ERC-4337 EntryPoint
  POOL_MANAGER: '0xf0e8c9f18f8f7F6C7822121A2E3C379121f493E1',
  QUANTUM_HOOK: '0x964363037dc3A88c441Af39bda37EFCf3276D282',
  QUANTUM_POOL_ROUTER: '0xEf2BBD94fe888713F014Fb3c2cdCdb4546C7E4F9',
  
  // For local development (Anvil)
  LOCAL: {
    QUANTUM_REGISTRY: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    QUANTUM_HOOK: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  }
} as const;

export const CHAIN_ID = {
  SEPOLIA: 11155111,
  LOCAL: 31337,
} as const;

export const RPC_URLS = {
  SEPOLIA: 'https://eth-sepolia.g.alchemy.com/v2/gM0WBanXaAgbz8juDtJ-5',
  LOCAL: 'http://127.0.0.1:8545',
} as const;

/**
 * Deployment Blocks on Sepolia
 * Find these on Etherscan: Go to contract -> Contract Creation transaction -> Block Number
 * Update these after deployment to optimize event fetching (Alchemy free tier allows 10 block range)
 * 
 * Latest deployment addresses (update blocks from Etherscan):
 * - QUANTUM_REGISTRY: 0x6fB18387550c9c3edFB74D74B8e78Cd01F40101B
 * - QUANTUM_HOOK: 0x964363037dc3A88c441Af39bda37EFCf3276D282
 * - QUANTUM_POOL_ROUTER: 0xEf2BBD94fe888713F014Fb3c2cdCdb4546C7E4F9
 * - POOL_MANAGER: 0xf0e8c9f18f8f7F6C7822121A2E3C379121f493E1
 */
export const DEPLOYMENT_BLOCKS = {
  SEPOLIA: {
    POOL_MANAGER: 0n, // TODO: Get from Etherscan - Contract Creation transaction block
    QUANTUM_REGISTRY: 0n, // TODO: Get from Etherscan - Contract Creation transaction block
    QUANTUM_HOOK: 0n, // TODO: Get from Etherscan - Contract Creation transaction block
    QUANTUM_POOL_ROUTER: 0n, // TODO: Get from Etherscan - Contract Creation transaction block
  },
  LOCAL: {
    POOL_MANAGER: 0n,
    QUANTUM_REGISTRY: 0n,
    QUANTUM_HOOK: 0n,
    QUANTUM_POOL_ROUTER: 0n,
  },
} as const;

export type ChainId = typeof CHAIN_ID[keyof typeof CHAIN_ID];

/**
 * Get contract addresses for a specific chain
 */
export function getContractAddresses(chainId: ChainId) {
  if (chainId === CHAIN_ID.LOCAL) {
    return CONTRACTS.LOCAL;
  }
  return {
    QUANTUM_REGISTRY: CONTRACTS.QUANTUM_REGISTRY,
    GROTH16_VERIFIER: CONTRACTS.GROTH16_VERIFIER,
    QUANTUM_ACCOUNT_FACTORY: CONTRACTS.QUANTUM_ACCOUNT_FACTORY,
    HACKATHON_PAYMASTER: CONTRACTS.HACKATHON_PAYMASTER,
    ENTRYPOINT: CONTRACTS.ENTRYPOINT,
    POOL_MANAGER: CONTRACTS.POOL_MANAGER,
    QUANTUM_HOOK: CONTRACTS.QUANTUM_HOOK,
    QUANTUM_POOL_ROUTER: CONTRACTS.QUANTUM_POOL_ROUTER,
  };
}
