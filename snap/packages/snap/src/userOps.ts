import {
  keccak256,
  AbiCoder,
  Interface,
  Contract,
  parseUnits,
  type Provider,
} from 'ethers';

/**
 * Constants for ERC-4337
 */
export const ENTRYPOINT_ADDRESS = '0x9f0E157b4f8c61079b7bbe6A9Fe434269265356B'; // v0.7 EntryPoint
export const FACTORY_ADDRESS = '0x179F8615C5939F3E9581F9DB3412409Fc1AE2859'; // QuantumAccountFactory
export const VERIFIER_ADDRESS = '0x801Ca67E4AAd52061A480e2a0014490Db60aE6aC'; // Groth16Verifier
export const REGISTRY_ADDRESS = '0xde5620b1e0b1267D606fAb6fcF2B67f98A72112A'; // QuantumRegistry

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
    const address = await factory.getAddress(publicKeyHash, salt);
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

  const isDeployed = await isAccountDeployed(accountAddress, provider);
  const nonce = await getAccountNonce(accountAddress, provider);

  const initCode = isDeployed
    ? '0x'
    : encodeInitCode(publicKeyHash, salt, factoryAddress);

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

  const feeData = await provider.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas || parseUnits('20', 'gwei');
  const maxPriorityFeePerGas =
    feeData.maxPriorityFeePerGas || parseUnits('2', 'gwei');

  const paymasterAndData = paymasterAddress || '0x';

  // Yellow Nitrolite optimized gas limits
  const gasFees = packGasFees(maxPriorityFeePerGas, maxFeePerGas);
  const verificationGasLimit = 300_000n;
  const callGasLimit = 200_000n;
  const preVerificationGas = 50_000n;

  const accountGasLimits = packAccountGasLimits(
    verificationGasLimit,
    callGasLimit,
  );

  return {
    sender: accountAddress,
    nonce: nonce.toString(),
    initCode,
    callData,
    accountGasLimits,
    preVerificationGas: preVerificationGas.toString(),
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
