/**
 * Smart Contract Addresses
 * Update these after deployment
 */

export const CONTRACTS = {
  // Sepolia Testnet Addresses (Redeployed 2026-02-05 - Final Fix)
  QUANTUM_REGISTRY: "0x8B579f2FCB65aC32d13Ddcd91a654627A91cBBDB",
  GROTH16_VERIFIER: "0x5da4dD0Cf1F5dBd62aC7A8b31706f432feE89C9d",
  QUANTUM_ACCOUNT_FACTORY: "0x8db97C640Ea328dBADEDeb9215ab2a7B383DB4E2",
  HACKATHON_PAYMASTER: "0x2e2bCA633E42B798Fe2F419C720F9Ce30Ca5A816",
  ENTRYPOINT: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  POOL_MANAGER: "0x50Fd6a7496EB8c51e909CE7BEBa37f2eb004bA85",
  QUANTUM_HOOK: "0xc78627855471497a9B6b1047539879879c90ED24",
  QUANTUM_POOL_ROUTER: "0x03Ad1bcc7Ae183b645DabF2ec9B636c7ba0080f5",

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
