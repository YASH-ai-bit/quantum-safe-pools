/**
 * Configuration constants for QuantumPools
 */

// Contract addresses (will be updated after deployment)
// Contract addresses (will be updated after deployment)
export const CONFIG = {
  // Sepolia (Refactored Architecture v2.0.0)
  CHAIN_ID: 11155111,
  RPC_URL: "https://eth-sepolia.g.alchemy.com/v2/gM0WBanXaAgbz8juDtJ-5",

  // Addresses (lowercase to avoid checksum issues)
  QUANTUM_REGISTRY_ADDRESS: "0x2335B55cC5EdffF0fA78E2A749C1B2a66Ff8b4ec".toLowerCase(), // QuantumSystem
  QUANTUM_ACCOUNT_FACTORY_ADDRESS: "0x2335B55cC5EdffF0fA78E2A749C1B2a66Ff8b4ec".toLowerCase(), // QuantumSystem
  GROTH16_VERIFIER_ADDRESS: "0x38078D4755172A9047B190CCE2eC614D242ACb77".toLowerCase(),
  HACKATHON_PAYMASTER_ADDRESS: "0x71877b35abc4d002ffe6ecc32e7c02febbc9fc96", // Unchanged
  QUANTUM_AMM_ROUTER: "0xA9ebc6aEfe13D9e93BcBA94aFE54E513bB730722".toLowerCase(), // QuantumAMMRouter
  ENTRYPOINT_ADDRESS: "0x0000000071727de22e5e9d8baf0edac6f37da032",

  // Bundler
  BUNDLER_URL: "https://api.pimlico.io/v2/sepolia/rpc?apikey=pim_F88Z7Sa9dPfQAqifqmmBk7",
};

// Network configurations
export const NETWORKS = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    bundlerUrl: '', // Will be set to bundler endpoint
  },
  LOCALHOST: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://localhost:8545',
    bundlerUrl: 'http://localhost:4337',
  },
};

// Dilithium configuration
export const DILITHIUM_CONFIG = {
  ENTROPY_SALT: 'quantumpools-dilithium3-v1',
  PUBLIC_KEY_SIZE: 1952, // Dilithium3
  PRIVATE_KEY_SIZE: 4000, // Dilithium3
  SIGNATURE_SIZE: 3293, // Dilithium3
};

// Gas configuration
export const GAS_CONFIG = {
  VERIFICATION_GAS_LIMIT: 10_000_000n, // For mock verifier (will be 250k with zkSNARK)
  CALL_GAS_LIMIT: 1_500_000n,
  PRE_VERIFICATION_GAS: 100_000n,
};
