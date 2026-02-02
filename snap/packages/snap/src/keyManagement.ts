import { dilithium } from 'dilithium-crystals';
import { keccak256 } from 'ethers';

/**
 * Snap state interface
 */
export interface SnapState {
  dilithiumPublicKey?: number[]; // Stored as array for JSON compatibility
  dilithiumPrivateKey?: number[]; // Encrypted by MetaMask
  accountSalt?: number;
  publicKeyHash?: string;
}

/**
 * Generate a Dilithium keypair from snap's deterministic entropy
 * @returns Promise resolving to generated keypair
 */
export async function generateDilithiumKeypair(): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> {
  // Generate Dilithium3 keypair (library is async)
  const keyPair = await dilithium.keyPair();

  // Validate keypair was generated
  if (!keyPair || !keyPair.publicKey || !keyPair.privateKey) {
    throw new Error('Failed to generate Dilithium keypair');
  }

  // Ensure we have Uint8Array
  const publicKey = keyPair.publicKey instanceof Uint8Array 
    ? keyPair.publicKey 
    : new Uint8Array(keyPair.publicKey);
  
  const privateKey = keyPair.privateKey instanceof Uint8Array
    ? keyPair.privateKey
    : new Uint8Array(keyPair.privateKey);

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
 * @param message Original message
 * @param signature Dilithium signature
 * @param publicKey Public key to verify against
 * @returns true if signature is valid
 */
export async function verifySignature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  return await dilithium.verifyDetached(signature, message, publicKey);
}

/**
 * Get the public key hash (used for on-chain storage)
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
 * @returns Salt value
 */
export async function getAccountSalt(): Promise<number> {
  const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as SnapState;

  return state.accountSalt ?? 0;
}
