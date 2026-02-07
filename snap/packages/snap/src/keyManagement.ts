import { dilithium } from 'dilithium-crystals';
import { keccak256, getBytes, hexlify } from 'ethers';

/**
 * Snap state interface
 */
export type SnapState = {
  dilithiumPublicKey?: number[]; // Stored as array for JSON compatibility
  dilithiumPrivateKey?: number[]; // Encrypted by MetaMask
  accountSalt?: number;
  publicKeyHash?: string;
  isRegistered?: boolean; // Track if account is registered in QuantumRegistry
};

/**
 * Get deterministic entropy from snap (derived from user's seed phrase)
 * This ensures the same key is ALWAYS derived, even after snap reinstall
 */
async function getDeterministicEntropy(): Promise<Uint8Array> {
  // snap_getEntropy derives a unique, deterministic value from the user's seed phrase
  // The salt ensures this entropy is unique to our snap's purpose
  const entropyHex = await snap.request({
    method: 'snap_getEntropy',
    params: {
      version: 1,
      salt: 'quantumpools-dilithium3-v1-deterministic-key',
    },
  }) as string;

  // Convert hex to bytes (32 bytes of entropy)
  return getBytes(entropyHex);
}

/**
 * Generate a Dilithium keypair DETERMINISTICALLY from snap's entropy
 * This ensures the same keypair is ALWAYS generated from the same seed phrase
 *
 * @returns Promise resolving to generated keypair
 */
export async function generateDilithiumKeypair(): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> {
  // Get deterministic entropy from user's seed phrase
  const entropy = await getDeterministicEntropy();

  console.log('[QUANTUM] Generating deterministic Dilithium keypair from seed entropy...');

  // Use the entropy as a seed for Dilithium key generation
  // dilithium.keyPair() accepts an optional seed parameter
  // If no seed is provided, it uses random bytes internally
  // We provide our deterministic entropy as the seed
  const keyPair = await dilithium.keyPair(entropy);

  // Validate keypair was generated
  if (!keyPair?.publicKey || !keyPair.privateKey) {
    throw new Error('Failed to generate Dilithium keypair');
  }

  // Ensure we have Uint8Array
  const publicKey =
    keyPair.publicKey instanceof Uint8Array
      ? keyPair.publicKey
      : new Uint8Array(keyPair.publicKey);

  const privateKey =
    keyPair.privateKey instanceof Uint8Array
      ? keyPair.privateKey
      : new Uint8Array(keyPair.privateKey);

  console.log('[QUANTUM] Deterministic keypair generated successfully');
  console.log('[QUANTUM] Public key hash:', keccak256(publicKey));

  return {
    publicKey,
    privateKey,
  };
}

/**
 * Ensure Dilithium keypair exists in snap state, generate if not
 */
export async function ensureKeypairExists(): Promise<void> {
  const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as SnapState | null;

  if (!state?.dilithiumPrivateKey) {
    const { publicKey, privateKey } = await generateDilithiumKeypair();

    // Calculate public key hash for on-chain storage
    const publicKeyHash = keccak256(publicKey);

    await snap.request({
      method: 'snap_manageState',
      params: {
        operation: 'update',
        newState: {
          dilithiumPublicKey: Array.from(publicKey),
          dilithiumPrivateKey: Array.from(privateKey),
          accountSalt: 0,
          publicKeyHash,
        },
      },
    });
  }
}

/**
 * Get the Dilithium public key from state
 *
 * @returns Public key as Uint8Array (1,952 bytes for Dilithium3)
 */
export async function getPublicKey(): Promise<Uint8Array> {
  await ensureKeypairExists();

  const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as SnapState;

  if (!state.dilithiumPublicKey) {
    throw new Error('Public key not found in state');
  }

  return new Uint8Array(state.dilithiumPublicKey);
}

/**
 * Get the Dilithium private key from state
 *
 * @returns Private key as Uint8Array (4,000 bytes for Dilithium3)
 */
async function getPrivateKey(): Promise<Uint8Array> {
  const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as SnapState;

  if (!state.dilithiumPrivateKey) {
    throw new Error('Private key not found in state');
  }

  return new Uint8Array(state.dilithiumPrivateKey);
}

/**
 * Sign a message with Dilithium private key
 *
 * @param message Message to sign (32 bytes typically)
 * @returns Dilithium signature (3,293 bytes for Dilithium3)
 */
export async function signMessage(message: Uint8Array): Promise<Uint8Array> {
  const privateKey = await getPrivateKey();

  // Sign with Dilithium (async)
  const signature = await dilithium.signDetached(message, privateKey);

  return signature;
}

/**
 * Verify a Dilithium signature (for testing/validation)
 *
 * @param message Original message
 * @param signature Dilithium signature
 * @param publicKey Public key to verify against
 * @returns true if signature is valid
 */
export async function verifySignature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> {
  return await dilithium.verifyDetached(signature, message, publicKey);
}

/**
 * Get the public key hash (used for on-chain storage)
 *
 * @returns 32-byte hash of public key
 */
export async function getPublicKeyHash(): Promise<string> {
  const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as SnapState;

  if (!state.publicKeyHash) {
    const publicKey = await getPublicKey();
    const hash = keccak256(publicKey);

    // Update state with hash
    await snap.request({
      method: 'snap_manageState',
      params: {
        operation: 'update',
        newState: {
          ...state,
          publicKeyHash: hash,
        },
      },
    });

    return hash;
  }

  return state.publicKeyHash;
}

/**
 * Get account salt (for CREATE2 deployment)
 *
 * @returns Salt value
 */
export async function getAccountSalt(): Promise<number> {
  const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as SnapState;

  return state.accountSalt ?? 0;
}
