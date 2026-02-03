import {
  keccak256,
  AbiCoder,
  Interface,
  Contract,
  parseUnits,
  concat,
  type Provider,
} from 'ethers';

/**
 * Constants for ERC-4337
 */
export const ENTRYPOINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'; // v0.7 EntryPoint
export const FACTORY_ADDRESS = '0x40ea8361529b917929FC6dcEC696791FCb48A52c'; // QuantumAccountFactory
export const VERIFIER_ADDRESS = '0xD2e72EBC10E14097f628e04e460ED232fA2887bc'; // Groth16Verifier
export const REGISTRY_ADDRESS = '0x25e6D39FC1888BDD36a6004a88467E8BFb38D3B2'; // QuantumRegistry

// Default ABI coder instance
const abiCoder = AbiCoder.defaultAbiCoder();

/**
 * PackedUserOperation structure (ERC-4337 v0.7)
 */
export type PackedUserOperation = {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  accountGasLimits: string; // packed: validationGasLimit (16 bytes) + callGasLimit (16 bytes)
  preVerificationGas: string;
  gasFees: string; // packed: maxPriorityFeePerGas (16 bytes) + maxFeePerGas (16 bytes)
  paymasterAndData: string;
  signature: string;
};

/**
 * Calculate the counterfactual address of a QuantumAccount by calling the factory
 */
export async function calculateAccountAddress(
  publicKeyHash: string,
  salt: number,
  factoryAddress: string,
  provider: Provider,
): Promise<string> {
  // Validate inputs
  if (!factoryAddress || factoryAddress === '0x') {
    console.error('[YELLOW-SDK] Invalid factory address:', factoryAddress);
    throw new Error('Invalid factory address');
  }

  if (!publicKeyHash || publicKeyHash === '0x') {
    console.error('[YELLOW-SDK] Invalid publicKeyHash:', publicKeyHash);
    throw new Error('Invalid publicKeyHash');
  }

  console.log('[YELLOW-SDK] Calculating account address with:', {
    publicKeyHash,
    salt,
    factoryAddress,
  });

  const factory = new Contract(
    factoryAddress,
    ['function getAddress(bytes32 publicKeyHash, uint256 salt) view returns (address)'],
    provider,
  );

  try {
    // Use getFunction().staticCall() to definitively avoid conflict with Ethers.js BaseContract.getAddress()
    const address = await factory.getFunction('getAddress').staticCall(publicKeyHash, salt);
    console.log('[YELLOW-SDK] Account address calculated:', address);

    if (!address || address === '0x' || address === '0x0000000000000000000000000000000000000000') {
      throw new Error('Factory returned invalid address');
    }

    return address;
  } catch (err: any) {
    console.error('[YELLOW-SDK] Failed to get account address from factory:', err);
    throw new Error(`Failed to calculate account address: ${err.message}`);
  }
}

/**
 * Encode initCode for account deployment
 */
export function encodeInitCode(
  publicKeyHash: string,
  salt: number,
  factoryAddress: string,
): string {
  const factoryInterface = new Interface([
    'function createAccount(bytes32 publicKeyHash, uint256 salt) returns (address)',
  ]);

  const callData = factoryInterface.encodeFunctionData('createAccount', [
    publicKeyHash,
    salt,
  ]);

  return concat([factoryAddress, callData]);
}

/**
 * Pack account gas limits
 */
export function packAccountGasLimits(
  verificationGasLimit: bigint,
  callGasLimit: bigint,
): string {
  const verificationHex = verificationGasLimit.toString(16).padStart(32, '0');
  const callHex = callGasLimit.toString(16).padStart(32, '0');
  return `0x${verificationHex}${callHex}`;
}

/**
 * Pack gas fees
 */
export function packGasFees(
  maxPriorityFeePerGas: bigint,
  maxFeePerGas: bigint,
): string {
  const priorityHex = maxPriorityFeePerGas.toString(16).padStart(32, '0');
  const maxHex = maxFeePerGas.toString(16).padStart(32, '0');
  return `0x${priorityHex}${maxHex}`;
}

/**
 * Get nonce from EntryPoint
 */
export async function getAccountNonce(
  accountAddress: string,
  provider: Provider,
): Promise<bigint> {
  const entryPoint = new Contract(
    ENTRYPOINT_ADDRESS,
    ['function getNonce(address sender, uint192 key) view returns (uint256)'],
    provider,
  );

  try {
    return await entryPoint.getNonce(accountAddress, 0);
  } catch (_error) {
    return 0n;
  }
}

/**
 * Check if account is deployed
 */
export async function isAccountDeployed(
  accountAddress: string,
  provider: Provider,
): Promise<boolean> {
  const code = await provider.getCode(accountAddress);
  return code !== '0x';
}

/**
 * Check if account is registered in QuantumRegistry
 */
export async function isRegistered(
  accountAddress: string,
  provider: Provider,
): Promise<boolean> {
  const registry = new Contract(
    REGISTRY_ADDRESS,
    ['function isQuantumSafe(address user) view returns (bool)'],
    provider,
  );

  try {
    return await registry.isQuantumSafe(accountAddress);
  } catch (err) {
    return false;
  }
}

// Helper for hex conversion
export function toHex(value: bigint | number) {
  if (value === undefined || value === null) return '0x0';
  return "0x" + BigInt(value).toString(16);
}

/**
 * JSON UserOperation v0.7 (Expanded for Bundler)
 */
export type UserOperationV07 = {
  sender: string;
  nonce: string; // hex
  factory?: string;
  factoryData?: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymaster?: string;
  paymasterData?: string;
  signature: string;
};

/**
 * Convert PackedUserOperation to JSON UserOperation v0.7
 */
export function packedToJsonUserOp(
  packed: PackedUserOperation,
  factoryAddress?: string,
): UserOperationV07 {
  // unpack gas limits
  const accountGasLimits = packed.accountGasLimits.startsWith('0x') ? packed.accountGasLimits.slice(2) : packed.accountGasLimits;
  const verificationGasLimit = BigInt('0x' + accountGasLimits.slice(0, 32));
  const callGasLimit = BigInt('0x' + accountGasLimits.slice(32));

  // unpack gas fees
  const gasFees = packed.gasFees.startsWith('0x') ? packed.gasFees.slice(2) : packed.gasFees;
  const maxPriorityFeePerGas = BigInt('0x' + gasFees.slice(0, 32));
  const maxFeePerGas = BigInt('0x' + gasFees.slice(32));

  // Handle factory/factoryData from initCode
  let factory = undefined;
  let factoryData = undefined;

  if (packed.initCode && packed.initCode !== '0x' && packed.initCode.length > 2) {
    // In v0.7, initCode is factory + factoryData
    // But for JSON RPC, we usually split them
    // However, check if we need to explicitly pass them or if we can extract from initCode
    // If we provided factoryAddress separately, use it. 
    // Otherwise, assume initCode = factory (20 bytes) + data

    // Standard v0.6/v0.7 initCode = 20-byte address + bytes
    factory = '0x' + packed.initCode.slice(2, 42);
    factoryData = '0x' + packed.initCode.slice(42);
  }

  // Handle paymaster
  let paymaster = undefined;
  let paymasterData = undefined;
  if (packed.paymasterAndData && packed.paymasterAndData !== '0x' && packed.paymasterAndData.length > 2) {
    paymaster = '0x' + packed.paymasterAndData.slice(2, 42);
    paymasterData = '0x' + packed.paymasterAndData.slice(42);
  }

  return {
    sender: packed.sender,
    nonce: packed.nonce.startsWith('0x') ? packed.nonce : toHex(BigInt(packed.nonce)),

    ...(factory ? { factory, factoryData } : {}),

    callData: packed.callData,

    callGasLimit: toHex(callGasLimit),
    verificationGasLimit: toHex(verificationGasLimit),
    preVerificationGas: packed.preVerificationGas.startsWith('0x') ? packed.preVerificationGas : toHex(BigInt(packed.preVerificationGas)),

    maxFeePerGas: toHex(maxFeePerGas),
    maxPriorityFeePerGas: toHex(maxPriorityFeePerGas),

    ...(paymaster ? { paymaster, paymasterData } : {}),

    signature: packed.signature,
  };
}

/**
 * Construct a PackedUserOperation
 */
export async function constructUserOp(params: {
  accountAddress: string;
  target: string;
  value: bigint;
  data: string;
  callData?: string;
  provider: Provider;
  publicKeyHash: string;
  salt: number;
  factoryAddress: string;
  paymasterAddress?: string;
}): Promise<PackedUserOperation> {
  const {
    accountAddress,
    target,
    value,
    data,
    callData: providedCallData,
    provider,
    publicKeyHash,
    salt,
    factoryAddress,
    paymasterAddress,
  } = params;

  // 1. Get Code to check deployment
  const code = await provider.getCode(accountAddress);
  const isDeployed = code !== '0x';
  console.log('[YELLOW-SDK] Account deployment status:', { isDeployed, codeLength: code.length });

  // 2. Get Nonce from EntryPoint
  // 0x7ecebe00 = getNonce(address,uint192)
  const nonceCallData = "0x7ecebe00" +
    accountAddress.slice(2).padStart(64, "0") +
    "0".padStart(64, "0"); // key = 0

  let nonce = 0n;
  try {
    const nonceResult = await provider.call({
      to: ENTRYPOINT_ADDRESS,
      data: nonceCallData,
    });
    nonce = BigInt(nonceResult);
    console.log('[YELLOW-SDK] Fetched nonce from EntryPoint:', nonce.toString());
  } catch (err) {
    console.warn('[YELLOW-SDK] Failed to fetch nonce, defaulting to 0:', err);
  }

  // 3. Generate initCode (for PACKED structure)
  let initCode = '0x';
  if (!isDeployed) {
    initCode = encodeInitCode(publicKeyHash, salt, factoryAddress);
    console.log('[YELLOW-SDK] Generated initCode for deployment');
  }

  // 4. Construction CallData
  let callData = providedCallData;
  if (!callData) {
    const accountInterface = new Interface([
      'function execute(address dest, uint256 value, bytes calldata func)',
    ]);
    callData = accountInterface.encodeFunctionData('execute', [
      target,
      value,
      data,
    ]);
  }

  // 5. Gas Estimation
  const feeData = await provider.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas || parseUnits('50', 'gwei');
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || parseUnits('5', 'gwei');

  const paymasterAndData = paymasterAddress || '0x';

  // Explicit v0.7 gas limits
  const gasFees = packGasFees(maxPriorityFeePerGas, maxFeePerGas);
  const verificationGasLimit = 1_000_000n;
  const callGasLimit = 1_000_000n;
  const preVerificationGas = 100_000n;

  const accountGasLimits = packAccountGasLimits(
    verificationGasLimit,
    callGasLimit,
  );

  return {
    sender: accountAddress,
    nonce: toHex(nonce), // Ensure hex for consistency
    initCode,
    callData,
    accountGasLimits,
    preVerificationGas: toHex(preVerificationGas),
    gasFees,
    paymasterAndData,
    signature: '0x',
  };
}

/**
 * Calculate the userOpHash for signing
 */
export function getUserOpHash(
  userOp: PackedUserOperation,
  chainId: number,
): string {
  const packedData = abiCoder.encode(
    [
      'address',
      'uint256',
      'bytes32',
      'bytes32',
      'bytes32',
      'uint256',
      'bytes32',
      'bytes32',
    ],
    [
      userOp.sender,
      userOp.nonce,
      keccak256(userOp.initCode),
      keccak256(userOp.callData),
      userOp.accountGasLimits,
      userOp.preVerificationGas,
      userOp.gasFees,
      keccak256(userOp.paymasterAndData),
    ],
  );

  const packedHash = keccak256(packedData);

  const userOpHash = keccak256(
    abiCoder.encode(
      ['bytes32', 'address', 'uint256'],
      [packedHash, ENTRYPOINT_ADDRESS, chainId],
    ),
  );

  return userOpHash;
}

/**
 * Encode batch execution call
 */
export function encodeBatchExecution(
  targets: string[],
  values: bigint[],
  datas: string[],
): string {
  const accountInterface = new Interface([
    'function executeBatch(address[] calldata dests, uint256[] calldata values, bytes[] calldata funcs)',
  ]);

  return accountInterface.encodeFunctionData('executeBatch', [
    targets,
    values,
    datas,
  ]);
}
