/**
 * Smart Contract Addresses
 * Update these after deployment
 */

export const CONTRACTS = {
  // Sepolia Testnet Addresses (Redeployed v3.7.1 - Fixed getReserves() - Feb 8, 2026)
  // Block 10212863 - WITH FHE VERIFICATION + DECRYPTED UI VIEWS
  QUANTUM_SYSTEM: import.meta.env.VITE_QUANTUM_SYSTEM_ADDRESS || "0x48fF10ed0F6cE42092756AA314C1616a04a49239",
  QUANTUM_AMM_FACTORY: import.meta.env.VITE_QUANTUM_AMM_FACTORY_ADDRESS || "0x0585057f47B2746b5c86CfD16466818D7Ca7CDbC",
  QUANTUM_AMM_ROUTER: import.meta.env.VITE_QUANTUM_AMM_ROUTER_ADDRESS || "0xCCfB7a53c948866Eb68c0cdc4931CD856491719B",
  GROTH16_VERIFIER: import.meta.env.VITE_GROTH16_VERIFIER_ADDRESS || "0x51c42280f8A9EC87BfFf3091Ff1C28C43171E1bc",
  QUANTUM_DYNAMIC_FEE_HOOK: import.meta.env.VITE_QUANTUM_DYNAMIC_FEE_HOOK_ADDRESS || "0x0320B64B4A4B7FDc79Eb6Bc96896403c6e608709",
  HACKATHON_PAYMASTER: import.meta.env.VITE_HACKATHON_PAYMASTER_ADDRESS || "0x71877B35abc4D002Ffe6eCc32E7c02FEbBc9FC96",
  ENTRYPOINT: import.meta.env.VITE_ENTRYPOINT_ADDRESS || "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // v0.7

  // Tokens (Sepolia) - Keeping same
  TOKENS: {
    USDC: import.meta.env.VITE_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    PYUSD: import.meta.env.VITE_PYUSD_ADDRESS || "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
    LINK: import.meta.env.VITE_LINK_ADDRESS || "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  },

  // For local development (Anvil)
  LOCAL: {
    QUANTUM_SYSTEM: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Mock
    QUANTUM_AMM_FACTORY: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Mock
    QUANTUM_AMM_ROUTER: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Mock
  },
} as const;

export const CHAIN_ID = {
  SEPOLIA: 11155111,
  LOCAL: 31337,
} as const;

export const RPC_URLS = {
  SEPOLIA: import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
  LOCAL: "http://127.0.0.1:8545",
} as const;

export const BUNDLER_URLS = {
  // Using Pimlico bundler for Sepolia
  SEPOLIA: `https://api.pimlico.io/v2/sepolia/rpc?apikey=${import.meta.env.VITE_PIMLICO_API_KEY || "pim_fallback"}`,
  LOCAL: "http://127.0.0.1:4337",
} as const;

/**
 * Deployment Blocks on Sepolia
 */
export const DEPLOYMENT_BLOCKS = {
  SEPOLIA: {
    QUANTUM_SYSTEM: 0n,
    QUANTUM_AMM_FACTORY: 0n,
    QUANTUM_AMM_ROUTER: 0n,
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
    QUANTUM_AMM_FACTORY: CONTRACTS.QUANTUM_AMM_FACTORY,
    QUANTUM_AMM_ROUTER: CONTRACTS.QUANTUM_AMM_ROUTER,
    QUANTUM_DYNAMIC_FEE_HOOK: CONTRACTS.QUANTUM_DYNAMIC_FEE_HOOK,
  };
}
