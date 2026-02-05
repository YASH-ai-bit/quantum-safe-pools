/**
 * Configuration constants for QuantumPools
 */

// Contract addresses (will be updated after deployment)
// Contract addresses (will be updated after deployment)
export const CONFIG = {
  // Sepolia (Redeployed 2026-02-05 via Fool-Proof Reimplementation)
  CHAIN_ID: 11155111,
  RPC_URL: "https://eth-sepolia.g.alchemy.com/v2/gM0WBanXaAgbz8juDtJ-5",

  // Addresses
  QUANTUM_REGISTRY_ADDRESS: "0x8B579f2FCB65aC32d13Ddcd91a654627A91cBBDB",
  QUANTUM_ACCOUNT_FACTORY_ADDRESS: "0x8db97C640Ea328dBADEDeb9215ab2a7B383DB4E2",
  HACKATHON_PAYMASTER_ADDRESS: "0x2e2bCA633E42B798Fe2F419C720F9Ce30Ca5A816",
  POOL_MANAGER_ADDRESS: "0x50Fd6a7496EB8c51e909CE7BEBa37f2eb004bA85",
  QUANTUM_HOOK_ADDRESS: "0xc78627855471497a9B6b1047539879879c90ED24",
  QUANTUM_POOL_ROUTER_ADDRESS: "0x03Ad1bcc7Ae183b645DabF2ec9B636c7ba0080f5",
  ENTRYPOINT_ADDRESS: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",

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
  CALL_GAS_LIMIT: 200_000n,
  PRE_VERIFICATION_GAS: 100_000n,
};
