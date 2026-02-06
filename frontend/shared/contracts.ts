/**
 * Smart Contract Addresses
 * Update these after deployment
 */

export const CONTRACTS = {
  // Sepolia Testnet Addresses (Refactored Architecture v2.0.0)
  QUANTUM_SYSTEM: "0x0e66D5f39752591ff55d52F1284688Cc6bFaBaF0",
  QUANTUM_LIQUIDITY_ENGINE: "0x52d1955AC7CF442DE9D33fc91510008EddA9ab14",
  GROTH16_VERIFIER: "0x6E534053eE684186E53e49C4f37d3CC67D1ADE56",
  HACKATHON_PAYMASTER: "0x71877B35abc4D002Ffe6eCc32E7c02FEbBc9FC96",
  ENTRYPOINT: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  POOL_MANAGER: "0x17D6609F2c90D2d01E1C7c72944d85a343267A8C",
  QUANTUM_HOOK: "0x0B2A4E66865814357B27F4fF8d854F1E46226A80",


  // Tokens (Sepolia)
  TOKENS: {
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
    LINK: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  },

  // For local development (Anvil)
  LOCAL: {
    QUANTUM_REGISTRY: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    QUANTUM_HOOK: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  },
} as const;

export const CHAIN_ID = {
  SEPOLIA: 11155111,
  LOCAL: 31337,
} as const;

export const RPC_URLS = {
  SEPOLIA: "https://eth-sepolia.g.alchemy.com/v2/gM0WBanXaAgbz8juDtJ-5",
  LOCAL: "http://127.0.0.1:8545",
} as const;

export const BUNDLER_URLS = {
  // Using Pimlico bundler for Sepolia
  SEPOLIA:
    "https://api.pimlico.io/v2/sepolia/rpc?apikey=pim_F88Z7Sa9dPfQAqifqmmBk7",
  LOCAL: "http://127.0.0.1:4337",
} as const;

/**
 * Deployment Blocks on Sepolia
 * Deployment Block: 10182829 (2025-01-02)
 */
export const DEPLOYMENT_BLOCKS = {
  SEPOLIA: {
    POOL_MANAGER: 0n,
    QUANTUM_REGISTRY: 0n,
    QUANTUM_HOOK: 0n,
    QUANTUM_POOL_ROUTER: 0n,
  },
} as const;

export type ChainId = (typeof CHAIN_ID)[keyof typeof CHAIN_ID];

/**
 * Get contract addresses for a specific chain
 */
export function getContractAddresses(chainId: ChainId) {
  if (chainId === CHAIN_ID.LOCAL) {
    return CONTRACTS.LOCAL;
  }
  return {
    QUANTUM_SYSTEM: CONTRACTS.QUANTUM_SYSTEM,
    GROTH16_VERIFIER: CONTRACTS.GROTH16_VERIFIER,
    HACKATHON_PAYMASTER: CONTRACTS.HACKATHON_PAYMASTER,
    ENTRYPOINT: CONTRACTS.ENTRYPOINT,
    POOL_MANAGER: CONTRACTS.POOL_MANAGER,
    QUANTUM_HOOK: CONTRACTS.QUANTUM_HOOK,
    QUANTUM_LIQUIDITY_ENGINE: CONTRACTS.QUANTUM_LIQUIDITY_ENGINE,
  };
}
