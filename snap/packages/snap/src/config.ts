/**
 * Configuration constants for QuantumPools
 */

// Contract addresses (will be updated after deployment)
// Contract addresses (will be updated after deployment)
export const CONTRACTS = {
  ENTRYPOINT: '0x0000000071727De22E5E9d8BAf0edAc6f37da032', // v0.7 EntryPoint
  FACTORY: '0x9cF193e7d0b33A519eb78fFA319016803a19527F', // QuantumAccountFactory address
  VERIFIER: '0x721211edc1201c6F3824989acaa9d1191CDc4e55', // MockGroth16Verifier address
  PAYMASTER: '0xAEE572141f2f94A8284541D21F86ee7676aC060E', // HackathonPaymaster address
  REGISTRY: '0x1c07c57026Cd6e639d2963A900C052b4A251d8B0', // QuantumRegistry address
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
  CALL_GAS_LIMIT: 200_000n,
  PRE_VERIFICATION_GAS: 100_000n,
};
