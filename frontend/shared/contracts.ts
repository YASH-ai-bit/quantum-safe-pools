/**
 * Smart Contract Addresses
 * Update these after deployment
 */

export const CONTRACTS = {
  // Sepolia Testnet Addresses (deployed!)
  QUANTUM_REGISTRY: '0xde5620b1e0b1267D606fAb6fcF2B67f98A72112A',
  GROTH16_VERIFIER: '0x801Ca67E4AAd52061A480e2a0014490Db60aE6aC',
  QUANTUM_ACCOUNT_FACTORY: '0x179F8615C5939F3E9581F9DB3412409Fc1AE2859',
  HACKATHON_PAYMASTER: '0x0a499B7cEd22CeBe5aDAaed4f6bFb645bADE9B0A',
  ENTRYPOINT: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  POOL_MANAGER: '0x1632806C6B321dD814D204b760158B664d49361b',
  QUANTUM_HOOK: '0x289411c48c131E847DE896E2bb6656B6f3F3B8eD',
  QUANTUM_POOL_ROUTER: '0x9669fd2b8e1e48Ae65C5A69Db4ad293Ee00D1072',

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

export const BUNDLER_URLS = {
  // Using Pimlico bundler for Sepolia
  SEPOLIA: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=pim_F88Z7Sa9dPfQAqifqmmBk7',
  LOCAL: 'http://127.0.0.1:4337',
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
