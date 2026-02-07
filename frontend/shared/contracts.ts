/**
 * Smart Contract Addresses
 * Update these after deployment
 */

export const CONTRACTS = {
  // Sepolia Testnet Addresses (Refactored Architecture v2.0.0)
  QUANTUM_SYSTEM: "0x2335B55cC5EdffF0fA78E2A749C1B2a66Ff8b4ec",
  QUANTUM_AMM_FACTORY: "0xE5acFcC6bf0BB0f64204775526E033C76d2130a9",
  QUANTUM_AMM_ROUTER: "0xA9ebc6aEfe13D9e93BcBA94aFE54E513bB730722",
  GROTH16_VERIFIER: "0x38078D4755172A9047B190CCE2eC614D242ACb77",
  HACKATHON_PAYMASTER: "0x71877B35abc4D002Ffe6eCc32E7c02FEbBc9FC96", // Keeping old paymaster if not redeployed, but trace didn't show it. Assuming same or need to update if user provides. User provided traces didn't show Paymaster. I will keep old one or ask? User didn't deploy paymaster in trace. I'll keep the old one for now to avoid breaking if it wasn't redeployed.
  ENTRYPOINT: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",

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
  };
}
