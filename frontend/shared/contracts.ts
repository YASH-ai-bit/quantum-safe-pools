/**
 * Smart Contract Addresses
 * Update these after deployment
 */

export const CONTRACTS = {
  // Sepolia Testnet Addresses (deployed!)
  QUANTUM_REGISTRY: '0x63201A5AC32d8971378e1acd05e065C994588b9f',
  GROTH16_VERIFIER: '0xb79d75a4791b86dD76583b19561c11C0DeB7C28F',
  QUANTUM_ACCOUNT_FACTORY: '0x805cfcecaEbe8CA2B731bCeeD79e2A98142bD5D8',
  ENTRYPOINT: '0x0000071727DE22E5e9D8BaF0eDAC6F37Da032000', // ERC-4337 EntryPoint
  
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
