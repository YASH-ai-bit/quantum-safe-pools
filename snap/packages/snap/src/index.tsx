import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import {
  Box,
  Text,
  Bold,
  Heading,
  Divider,
  Copyable,
} from '@metamask/snaps-sdk/jsx';
import { JsonRpcProvider, getBytes, formatEther } from 'ethers';
import {
  ensureKeypairExists,
  getPublicKey,
  getPublicKeyHash,
  signMessage,
  getAccountSalt,
  verifySignature,
} from './keyManagement';
import {
  constructUserOp,
  getUserOpHash,
  calculateAccountAddress,
  isAccountDeployed,
  ENTRYPOINT_ADDRESS,
  type PackedUserOperation,
} from './userOps'; /**
 * Handle incoming JSON-RPC requests for quantum-safe operations
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  switch (request.method) {
    // Initialize quantum-safe keys
    case 'quantum_initialize':
      return await handleInitialize();

    // Get quantum public key
    case 'quantum_getPublicKey':
      return await handleGetPublicKey();

    // Get account address
    case 'quantum_getAccountAddress':
      return await handleGetAccountAddress(request.params);

    // Check account status
    case 'quantum_getAccountInfo':
      return await handleGetAccountInfo(request.params);

    // Test key signing
    case 'quantum_testKeys':
      return await handleTestKeys();

    // Sign a message with Dilithium
    case 'quantum_signMessage':
      return await handleSignMessage(request.params);

    // Send a quantum-safe transaction
    case 'quantum_sendTransaction':
      return await handleSendTransaction(origin, request.params);

    default:
      throw new Error(`Method not found: ${request.method}`);
  }
};

/**
 * Initialize quantum-safe keys
 */
async function handleInitialize() {
  const startTime = Date.now();
  await ensureKeypairExists();

  const publicKey = await getPublicKey();
  const publicKeyHash = await getPublicKeyHash();
  const salt = await getAccountSalt();
  const generationTime = Date.now() - startTime;

  // Convert to hex for display
  const publicKeyHex = '0x' + Buffer.from(publicKey).toString('hex');

  return {
    status: 'initialized',
    algorithm: 'CRYSTALS-Dilithium3',
    standard: 'NIST FIPS 204',
    securityLevel: 'NIST Level 3 (AES-192 equivalent)',
    keyMetrics: {
      publicKeyBytes: publicKey.length,
      publicKeyBits: publicKey.length * 8,
      publicKeyHash: publicKeyHash,
      publicKeyPreview: publicKeyHex.slice(0, 66) + '...' + publicKeyHex.slice(-64),
    },
    accountInfo: {
      salt: salt,
      derivationPath: 'snap_getEntropy/quantumpools-dilithium3-v1',
    },
    performance: {
      generationTimeMs: generationTime,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get the quantum public key
 */
async function handleGetPublicKey() {
  await ensureKeypairExists();
  const publicKey = await getPublicKey();
  const publicKeyHex = '0x' + Buffer.from(publicKey).toString('hex');
  const publicKeyHash = await getPublicKeyHash();

  return {
    algorithm: 'CRYSTALS-Dilithium3',
    standard: 'NIST FIPS 204',
    publicKey: {
      hex: publicKeyHex,
      bytes: publicKey.length,
      bits: publicKey.length * 8,
      hash: publicKeyHash,
      preview: {
        first32Bytes: publicKeyHex.slice(0, 66),
        last32Bytes: '0x' + publicKeyHex.slice(-64),
      },
    },
    encoding: 'hexadecimal',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get account address
 */
async function handleGetAccountAddress(params: any) {
  const { factoryAddress, rpcUrl } = params;

  if (!factoryAddress || !rpcUrl) {
    throw new Error('factoryAddress and rpcUrl are required');
  }

  await ensureKeypairExists();
  const publicKeyHash = await getPublicKeyHash();
  const salt = await getAccountSalt();

  // Calculate counterfactual address
  const accountAddress = calculateAccountAddress(
    publicKeyHash,
    salt,
    factoryAddress,
  );

  // Check if deployed
  const provider = new JsonRpcProvider(rpcUrl);
  const deployed = await isAccountDeployed(accountAddress, provider);

  return {
    address: accountAddress,
    publicKeyHash,
    salt,
    deployed,
  };
}

/**
 * Get account info
 */
async function handleGetAccountInfo(params: any) {
  const { accountAddress, rpcUrl } = params;

  if (!accountAddress || !rpcUrl) {
    throw new Error('accountAddress and rpcUrl are required');
  }

  const provider = new JsonRpcProvider(rpcUrl);

  const deployed = await isAccountDeployed(accountAddress, provider);
  const balance = await provider.getBalance(accountAddress);
  const code = await provider.getCode(accountAddress);

  return {
    address: accountAddress,
    deployed,
    balance: balance.toString(),
    codeSize: code.length,
  };
}

/**
 * Test key generation and signing
 */
async function handleTestKeys() {
  const startTime = Date.now();
  await ensureKeypairExists();

  const publicKey = await getPublicKey();
  const publicKeyHash = await getPublicKeyHash();
  
  // Create deterministic test message
  const testMessage = new Uint8Array(32);
  testMessage.fill(0x01);
  const testMessageHex = '0x' + Buffer.from(testMessage).toString('hex');

  // Sign the test message
  const signStartTime = Date.now();
  const signature = await signMessage(testMessage);
  const signTime = Date.now() - signStartTime;
  const signatureHex = '0x' + Buffer.from(signature).toString('hex');

  // Verify the signature
  const verifyStartTime = Date.now();
  const isValid = await verifySignature(testMessage, signature, publicKey);
  const verifyTime = Date.now() - verifyStartTime;
  
  const totalTime = Date.now() - startTime;
  const publicKeyHex = '0x' + Buffer.from(publicKey).toString('hex');

  // Show confirmation dialog with detailed info
  await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'alert',
      content: (
        <Box>
          <Heading>Dilithium Signature Test</Heading>
          <Divider />
          
          <Text><Bold>ALGORITHM</Bold></Text>
          <Text>{'Name: CRYSTALS-Dilithium3'}</Text>
          <Text>{'Standard: NIST FIPS 204'}</Text>
          <Text>{'Security: Level 3 (192-bit classical, 128-bit quantum)'}</Text>
          <Divider />
          
          <Text><Bold>PUBLIC KEY</Bold></Text>
          <Text>{'Size: ' + String(publicKey.length) + ' bytes (' + String(publicKey.length * 8) + ' bits)'}</Text>
          <Text>{'Hash: ' + publicKeyHash.slice(0, 18) + '...' + publicKeyHash.slice(-8)}</Text>
          <Copyable value={publicKeyHash} />
          <Divider />
          
          <Text><Bold>TEST MESSAGE</Bold></Text>
          <Text>{'Size: ' + String(testMessage.length) + ' bytes'}</Text>
          <Text>{'Content: 0x01 repeated (test vector)'}</Text>
          <Copyable value={testMessageHex} />
          <Divider />
          
          <Text><Bold>SIGNATURE</Bold></Text>
          <Text>{'Size: ' + String(signature.length) + ' bytes (' + String(signature.length * 8) + ' bits)'}</Text>
          <Text>{'Preview: ' + signatureHex.slice(0, 22) + '...'}</Text>
          <Copyable value={signatureHex} />
          <Divider />
          
          <Text><Bold>VERIFICATION</Bold></Text>
          <Text>{'Status: ' + (isValid ? 'VALID' : 'INVALID')}</Text>
          <Text>{'Sign Time: ' + String(signTime) + 'ms'}</Text>
          <Text>{'Verify Time: ' + String(verifyTime) + 'ms'}</Text>
          <Text>{'Total Time: ' + String(totalTime) + 'ms'}</Text>
        </Box>
      ),
    },
  });

  return {
    status: isValid ? 'success' : 'failed',
    algorithm: {
      name: 'CRYSTALS-Dilithium3',
      standard: 'NIST FIPS 204',
      securityLevel: 'NIST Level 3',
      classicalSecurityBits: 192,
      quantumSecurityBits: 128,
    },
    publicKey: {
      bytes: publicKey.length,
      bits: publicKey.length * 8,
      hash: publicKeyHash,
      preview: '0x' + Buffer.from(publicKey).toString('hex').slice(0, 64) + '...',
    },
    testMessage: {
      hex: testMessageHex,
      bytes: testMessage.length,
      description: '32-byte test vector (0x01 repeated)',
    },
    signature: {
      bytes: signature.length,
      bits: signature.length * 8,
      preview: signatureHex.slice(0, 66) + '...' + signatureHex.slice(-64),
      fullHex: signatureHex,
    },
    verification: {
      valid: isValid,
      status: isValid ? 'SIGNATURE_VALID' : 'SIGNATURE_INVALID',
    },
    performance: {
      signTimeMs: signTime,
      verifyTimeMs: verifyTime,
      totalTimeMs: totalTime,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sign a message with Dilithium
 */
async function handleSignMessage(params: any) {
  const { message } = params;

  if (!message) {
    throw new Error('message is required');
  }

  const startTime = Date.now();
  await ensureKeypairExists();

  // Convert message to bytes
  const messageBytes =
    typeof message === 'string' ? getBytes(message) : new Uint8Array(message);

  const messageHex = '0x' + Buffer.from(messageBytes).toString('hex');

  // Sign with Dilithium
  const signStartTime = Date.now();
  const signature = await signMessage(messageBytes);
  const signTime = Date.now() - signStartTime;
  
  const signatureHex = '0x' + Buffer.from(signature).toString('hex');
  const totalTime = Date.now() - startTime;

  return {
    algorithm: 'CRYSTALS-Dilithium3',
    standard: 'NIST FIPS 204',
    message: {
      hex: messageHex,
      bytes: messageBytes.length,
    },
    signature: {
      hex: signatureHex,
      bytes: signature.length,
      bits: signature.length * 8,
      preview: signatureHex.slice(0, 66) + '...' + signatureHex.slice(-64),
    },
    performance: {
      signTimeMs: signTime,
      totalTimeMs: totalTime,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send a quantum-safe transaction
 */
async function handleSendTransaction(origin: string, params: any) {
  const { to, value, data, factoryAddress, rpcUrl, paymasterAddress, chainId } =
    params;

  if (!to || !factoryAddress || !rpcUrl || !chainId) {
    throw new Error('to, factoryAddress, rpcUrl, and chainId are required');
  }

  await ensureKeypairExists();

  const publicKeyHash = await getPublicKeyHash();
  const salt = await getAccountSalt();
  const provider = new JsonRpcProvider(rpcUrl);

  // Calculate account address
  const accountAddress = calculateAccountAddress(
    publicKeyHash,
    salt,
    factoryAddress,
  );

  const deployed = await isAccountDeployed(accountAddress, provider);

  // Show confirmation dialog
  const approved = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: (
        <Box>
          <Heading>🔐 Quantum-Safe Transaction</Heading>
          <Divider />
          <Text>
            <Bold>From:</Bold>
          </Text>
          <Copyable value={accountAddress} />
          <Text>
            <Bold>To:</Bold>
          </Text>
          <Copyable value={to} />
          <Text>
            <Bold>Value:</Bold> {formatEther(value || 0)} ETH
          </Text>
          <Text>
            <Bold>Account Status:</Bold>{' '}
            {deployed ? 'Deployed ✅' : 'Not deployed (will deploy)'}
          </Text>
          <Divider />
          <Text>
            <Bold>Origin:</Bold> {origin}
          </Text>
          <Text>
            This transaction will be signed with your quantum-safe Dilithium
            key.
          </Text>
        </Box>
      ),
    },
  });

  if (!approved) {
    throw new Error('User rejected transaction');
  }

  // Construct UserOperation
  const userOp = await constructUserOp({
    accountAddress,
    target: to,
    value: BigInt(value || 0),
    data: data || '0x',
    provider,
    publicKeyHash,
    salt,
    factoryAddress,
    paymasterAddress,
  });

  // Calculate userOpHash
  const userOpHash = getUserOpHash(userOp, chainId);

  // Sign with Dilithium
  const userOpHashBytes = getBytes(userOpHash);
  const dilithiumSignature = await signMessage(userOpHashBytes);

  // For now, we'll use the Dilithium signature directly (mock verifier accepts anything)
  // In production with zkSNARK, this would be replaced with the proof
  userOp.signature = '0x' + Buffer.from(dilithiumSignature).toString('hex');

  // Show signing confirmation
  await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'alert',
      content: (
        <Box>
          <Heading>Transaction Signed</Heading>
          <Divider />
          <Text>
            <Bold>UserOp Hash:</Bold>
          </Text>
          <Copyable value={userOpHash} />
          <Text>
            <Bold>Signature Size:</Bold> {String(dilithiumSignature.length) + ' bytes'}
          </Text>
          <Text>Transaction ready to submit to bundler.</Text>
        </Box>
      ),
    },
  });

  return {
    userOp,
    userOpHash,
    accountAddress,
  };
}
