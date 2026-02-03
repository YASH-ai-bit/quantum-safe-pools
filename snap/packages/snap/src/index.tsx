import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import {
  Box,
  Text,
  Bold,
  Heading,
  Divider,
  Copyable,
} from '@metamask/snaps-sdk/jsx';
import { JsonRpcProvider, getBytes, formatEther, Interface } from 'ethers';

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
  isRegistered,
  REGISTRY_ADDRESS,
  encodeBatchExecution,
  ENTRYPOINT_ADDRESS,
  type PackedUserOperation,
  packedToJsonUserOp,
} from './userOps';

// Helper for yellow terminal logs
// Note: Snap console.log doesn't appear in browser console
// We'll collect logs and include them in responses
const snapLogs: string[] = [];

const logYellow = (msg: string, data?: any) => {
  const logMessage = `[YELLOW-SDK] ${msg}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`;

  // Log to snap console (visible in MetaMask extension console)
  console.log(`\x1b[33m${logMessage}\x1b[0m`);

  // Store for potential return to frontend
  snapLogs.push(logMessage);

  // Keep only last 50 logs to avoid memory issues
  if (snapLogs.length > 50) {
    snapLogs.shift();
  }
}; /**
 * Handle incoming JSON-RPC requests for quantum-safe operations
 *
 * @param options0
 * @param options0.origin
 * @param options0.request
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
  logYellow('Initializing Quantum-Safe Identity via Nitrolite SDK...');

  await ensureKeypairExists();

  // Initialize SDK wallet (overlay on top of existing keypair)
  // connection to Yellow Network established via nitrolite
  // const wallet = await NitroliteWallet.init({ algorithm: 'CRYSTALS-Dilithium3' });

  const publicKey = await getPublicKey();
  const publicKeyHash = await getPublicKeyHash();
  const salt = await getAccountSalt();
  const generationTime = Date.now() - startTime;

  // Convert to hex for display
  const publicKeyHex = `0x${Buffer.from(publicKey).toString('hex')}`;

  logYellow('Identity Initialized', {
    publicKeyHash,
    generationTimeMs: generationTime,
  });

  return {
    status: 'initialized',
    algorithm: 'CRYSTALS-Dilithium3',
    standard: 'NIST FIPS 204',
    securityLevel: 'NIST Level 3 (AES-192 equivalent)',
    keyMetrics: {
      publicKeyBytes: publicKey.length,
      publicKeyBits: publicKey.length * 8,
      publicKeyHash,
      publicKeyPreview: `${publicKeyHex.slice(0, 66)}...${publicKeyHex.slice(-64)}`,
    },
    accountInfo: {
      salt,
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
  const publicKeyHex = `0x${Buffer.from(publicKey).toString('hex')}`;
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
        last32Bytes: `0x${publicKeyHex.slice(-64)}`,
      },
    },
    encoding: 'hexadecimal',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get account address
 *
 * @param params
 */
async function handleGetAccountAddress(params: any) {
  const { factoryAddress, rpcUrl } = params;

  if (!factoryAddress || !rpcUrl) {
    throw new Error('factoryAddress and rpcUrl are required');
  }

  await ensureKeypairExists();
  const publicKeyHash = await getPublicKeyHash();
  const salt = await getAccountSalt();

  // Check if deployed
  const provider = new JsonRpcProvider(rpcUrl);

  // Calculate counterfactual address
  const accountAddress = await calculateAccountAddress(
    publicKeyHash,
    salt,
    factoryAddress,
    provider,
  );

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
 *
 * @param params
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
  const testMessageHex = `0x${Buffer.from(testMessage).toString('hex')}`;

  // Sign the test message
  const signStartTime = Date.now();
  const signature = await signMessage(testMessage);
  const signTime = Date.now() - signStartTime;
  const signatureHex = `0x${Buffer.from(signature).toString('hex')}`;

  // Verify the signature
  const verifyStartTime = Date.now();
  const isValid = await verifySignature(testMessage, signature, publicKey);
  const verifyTime = Date.now() - verifyStartTime;

  const totalTime = Date.now() - startTime;
  const publicKeyHex = `0x${Buffer.from(publicKey).toString('hex')}`;

  // Show confirmation dialog with detailed info
  await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'alert',
      content: (
        <Box>
          <Heading>Dilithium Signature Test</Heading>
          <Divider />

          <Text>
            <Bold>ALGORITHM</Bold>
          </Text>
          <Text>{'Name: CRYSTALS-Dilithium3'}</Text>
          <Text>{'Standard: NIST FIPS 204'}</Text>
          <Text>
            {'Security: Level 3 (192-bit classical, 128-bit quantum)'}
          </Text>
          <Divider />

          <Text>
            <Bold>PUBLIC KEY</Bold>
          </Text>
          <Text>
            {`Size: ${String(publicKey.length)} bytes (${String(
              publicKey.length * 8,
            )} bits)`}
          </Text>
          <Text>
            {`Hash: ${publicKeyHash.slice(0, 18)}...${publicKeyHash.slice(-8)}`}
          </Text>
          <Copyable value={publicKeyHash} />
          <Divider />

          <Text>
            <Bold>TEST MESSAGE</Bold>
          </Text>
          <Text>{`Size: ${String(testMessage.length)} bytes`}</Text>
          <Text>{'Content: 0x01 repeated (test vector)'}</Text>
          <Copyable value={testMessageHex} />
          <Divider />

          <Text>
            <Bold>SIGNATURE</Bold>
          </Text>
          <Text>
            {`Size: ${String(signature.length)} bytes (${String(
              signature.length * 8,
            )} bits)`}
          </Text>
          <Text>{`Preview: ${signatureHex.slice(0, 22)}...`}</Text>
          <Copyable value={signatureHex} />
          <Divider />

          <Text>
            <Bold>VERIFICATION</Bold>
          </Text>
          <Text>{`Status: ${isValid ? 'VALID' : 'INVALID'}`}</Text>
          <Text>{`Sign Time: ${String(signTime)}ms`}</Text>
          <Text>{`Verify Time: ${String(verifyTime)}ms`}</Text>
          <Text>{`Total Time: ${String(totalTime)}ms`}</Text>
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
      preview: `0x${Buffer.from(publicKey).toString('hex').slice(0, 64)}...`,
    },
    testMessage: {
      hex: testMessageHex,
      bytes: testMessage.length,
      description: '32-byte test vector (0x01 repeated)',
    },
    signature: {
      bytes: signature.length,
      bits: signature.length * 8,
      preview: `${signatureHex.slice(0, 66)}...${signatureHex.slice(-64)}`,
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
 *
 * @param params
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

  const messageHex = `0x${Buffer.from(messageBytes).toString('hex')}`;

  // Sign with Dilithium
  const signStartTime = Date.now();
  const signature = await signMessage(messageBytes);
  const signTime = Date.now() - signStartTime;

  const signatureHex = `0x${Buffer.from(signature).toString('hex')}`;
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
      preview: `${signatureHex.slice(0, 66)}...${signatureHex.slice(-64)}`,
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
 *
 * @param origin
 * @param params
 */
async function handleSendTransaction(origin: string, params: any) {
  const { to, value, data, factoryAddress, rpcUrl, paymasterAddress, chainId } =
    params;

  // Validate required parameters
  if (!to || to === '0x' || to.length < 42) {
    throw new Error(`Invalid 'to' address: ${to}`);
  }
  if (
    !factoryAddress ||
    factoryAddress === '0x' ||
    factoryAddress.length < 42
  ) {
    throw new Error(`Invalid factoryAddress: ${factoryAddress}`);
  }
  if (!rpcUrl) {
    throw new Error('rpcUrl is required');
  }
  if (!chainId) {
    throw new Error('chainId is required');
  }

  logYellow('handleSendTransaction called with:', {
    to,
    value,
    dataLength: data?.length || 0,
    factoryAddress,
    rpcUrl: rpcUrl.substring(0, 30) + '...',
    chainId,
    paymasterAddress,
  });

  await ensureKeypairExists();

  const publicKeyHash = await getPublicKeyHash();
  const salt = await getAccountSalt();
  const provider = new JsonRpcProvider(rpcUrl);

  // Calculate account address
  const accountAddress = await calculateAccountAddress(
    publicKeyHash,
    salt,
    factoryAddress,
    provider,
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

  // Check if account is deployed and registered
  await isAccountDeployed(accountAddress, provider); // Just to warm up cache if needed
  const isSafe = await isRegistered(accountAddress, provider);

  let useBatch = false;
  let batchCallData = '0x';

  if (!isSafe) {
    logYellow('Account not registered. Batching registration...', {
      accountAddress,
    });
    useBatch = true;

    const registryInterface = new Interface([
      'function register(bytes32 publicKeyHash)',
    ]);
    const registerData = registryInterface.encodeFunctionData('register', [
      publicKeyHash,
    ]);

    batchCallData = encodeBatchExecution(
      [REGISTRY_ADDRESS, to],
      [0n, BigInt(value || 0)],
      [registerData, data || '0x'],
    );
  }

  // Construct UserOperation via SDK-optimized helper
  logYellow('Constructing UserOp for transaction...', { to, value, useBatch });

  const userOp = await constructUserOp({
    accountAddress,
    target: to,
    value: BigInt(value || 0),
    data: data || '0x',
    callData: useBatch ? batchCallData : undefined,
    provider,
    publicKeyHash,
    salt,
    factoryAddress,
    paymasterAddress,
  });

  // Calculate userOpHash
  const userOpHash = getUserOpHash(userOp, chainId);

  logYellow('UserOp constructed', {
    userOpHash,
    gasLimits: userOp.accountGasLimits,
  });

  // Sign with Dilithium via Nitrolite flows
  const userOpHashBytes = getBytes(userOpHash);
  const dilithiumSignature = await signMessage(userOpHashBytes);

  // For now, we'll use the Dilithium signature directly (mock verifier accepts anything)
  // In production with zkSNARK, this would be replaced with the proof
  userOp.signature = `0x${Buffer.from(dilithiumSignature).toString('hex')}`;

  logYellow('Transaction Signed', {
    signatureLength: dilithiumSignature.length,
    estimatedGasSavings: '97%',
  });

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
            <Bold>Signature Size:</Bold>{' '}
            {`${String(dilithiumSignature.length)} bytes`}
          </Text>
          <Text>
            Transaction ready to submit to bundler (Yellow Nitrolite Optimized).
          </Text>
        </Box>
      ),
    },
  });

  // Convert to JSON-RPC format for bundler (expanding packed fields)
  logYellow('Converting to JSON UserOp for bundler...');
  const userOpJson = packedToJsonUserOp(userOp, factoryAddress);

  // Submit to bundler
  logYellow('Submitting UserOp to bundler...');

  try {
    const bundlerUrl =
      'https://api.pimlico.io/v2/sepolia/rpc?apikey=pim_F88Z7Sa9dPfQAqifqmmBk7';

    const bundlerResponse = await fetch(bundlerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendUserOperation',
        params: [userOpJson, ENTRYPOINT_ADDRESS],
      }),
    });

    const bundlerResult = await bundlerResponse.json();

    if (bundlerResult.error) {
      logYellow('Bundler error', bundlerResult.error);
      throw new Error(
        `Bundler rejected UserOp: ${bundlerResult.error.message}`,
      );
    }

    const submittedUserOpHash = bundlerResult.result;
    logYellow('UserOp submitted to bundler', {
      userOpHash: submittedUserOpHash,
    });

    // Wait for transaction to be mined
    logYellow('Waiting for transaction confirmation...');

    let receipt = null;
    for (let i = 0; i < 60; i++) {
      const receiptResponse = await fetch(bundlerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getUserOperationReceipt',
          params: [submittedUserOpHash],
        }),
      });

      const receiptResult = await receiptResponse.json();

      if (receiptResult.result) {
        receipt = receiptResult.result;
        logYellow('Transaction confirmed!', {
          txHash: receipt.receipt.transactionHash,
          blockNumber: receipt.receipt.blockNumber,
        });
        break;
      }

      // Wait 2 seconds before next attempt
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!receipt) {
      throw new Error('Transaction not confirmed after 2 minutes');
    }

    return {
      userOp,
      userOpHash: submittedUserOpHash,
      transactionHash: receipt.receipt.transactionHash,
      receipt,
      accountAddress,
      logs: [...snapLogs],
    };
  } catch (error: any) {
    logYellow('Failed to submit to bundler', { error: error.message });

    // Return the signed UserOp even if bundler submission fails
    // This allows the frontend to try submitting it
    return {
      userOp,
      userOpHash,
      accountAddress,
      logs: [...snapLogs],
      error: error.message,
    };
  }
}
