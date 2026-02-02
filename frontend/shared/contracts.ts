/**
 * Smart Contract Addresses
 * Update these after deployment
 */

export const CONTRACTS = {
  // Sepolia Testnet Addresses (update after deployment)
  QUANTUM_REGISTRY: '0x0000000000000000000000000000000000000000', // TODO: Deploy
  QUANTUM_HOOK: '0x0000000000000000000000000000000000000000', // TODO: Deploy
  QUANTUM_ACCOUNT_FACTORY: '0x0000000000000000000000000000000000000000', // TODO: Deploy
  ENTRYPOINT: '0x0000071727De22E5E9d8BAf0edAc6f37da032000', // ERC-4337 EntryPoint
  
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
