/**
 * Smart Contract Addresses
 * Update these after deployment
 */

export const CONTRACTS = {
  // Sepolia Testnet Addresses (deployed!)
  QUANTUM_REGISTRY: '0x805cfcecaEbe8CA2B731bCeeD79e2A98142bD5D8',
  GROTH16_VERIFIER: '0x63201A5AC32d8971378e1acd05e065C994588b9f',
  QUANTUM_ACCOUNT_FACTORY: '0xf89A33efD7FaF52EB625F342868EcE888E5Bee31',
  HACKATHON_PAYMASTER: '0xED9192F6B59c729abeC201843a21a072Be9d068A',
  ENTRYPOINT: '0x5376e13E3C9Bb370727594F415fbe652262A3FA6', // ERC-4337 EntryPoint
  POOL_MANAGER: '0x0000000000000000000000000000000000000000', // Will be updated after deployment
  QUANTUM_HOOK: '0x0000000000000000000000000000000000000000', // Will be updated after deployment
  
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
    QUANTUM_HOOK: CONTRACTS.QUANTUM_HOOK,
  };
}
