/**
 * Configuration constants for QuantumPools
 */

// Contract addresses (will be updated after deployment)
// Contract addresses (will be updated after deployment)
export const CONFIG = {
  // Sepolia (Redeployed 2026-02-05 with Router.initialize)
  CHAIN_ID: 11155111,
  RPC_URL: "https://eth-sepolia.g.alchemy.com/v2/gM0WBanXaAgbz8juDtJ-5",

  // Addresses (lowercase to avoid checksum issues)
  QUANTUM_REGISTRY_ADDRESS: "0x0e66D5f39752591ff55d52F1284688Cc6bFaBaF0", // QuantumSystem
  QUANTUM_ACCOUNT_FACTORY_ADDRESS: "0x0e66D5f39752591ff55d52F1284688Cc6bFaBaF0", // QuantumSystem
  HACKATHON_PAYMASTER_ADDRESS: "0x71877B35abc4D002Ffe6eCc32E7c02FEbBc9FC96",
  POOL_MANAGER_ADDRESS: "0x17D6609F2c90D2d01E1C7c72944d85a343267A8C",
  QUANTUM_HOOK: "0x0B2A4E66865814357B27F4fF8d854F1E46226A80",
  QUANTUM_POOL_ROUTER: "0x52d1955AC7CF442DE9D33fc91510008EddA9ab14", // QuantumLiquidityEngine
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
