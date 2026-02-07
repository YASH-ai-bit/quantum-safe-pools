/**
 * Smart Contract Addresses
 * Update these after deployment
 */

export const CONTRACTS = {
  // Sepolia Testnet Addresses (Redeployed v2.1.0 with EntryPoint v0.7)
  QUANTUM_SYSTEM: "0x767e77B89eDf0c4dBFf52b16Fe1Af2f5b2741125",
  QUANTUM_AMM_FACTORY: "0xd3b17D6f91f52C3f4Fc8EAD3B708674114Eb60E5",
  QUANTUM_AMM_ROUTER: "0x4b9a271cf38d28a32331fc2c7f3abfa54cea6edf",
  GROTH16_VERIFIER: "0xAFDaEB7E4F1Ed1b352C3b927646F46a91cD3B97B",
  QUANTUM_DYNAMIC_FEE_HOOK: "0x83f11c2e3c9845cf3ae5b06c07b486fb776c5f9d",
  HACKATHON_PAYMASTER: "0x71877B35abc4D002Ffe6eCc32E7c02FEbBc9FC96",
  ENTRYPOINT: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // v0.7

  // Tokens (Sepolia) - Keeping same
  TOKENS: {
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
    LINK: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
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
