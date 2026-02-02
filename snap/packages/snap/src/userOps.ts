import { keccak256, concat, AbiCoder, getCreate2Address, solidityPackedKeccak256, Interface, Contract, parseUnits, type Provider } from 'ethers';

/**
 * Constants for ERC-4337
 */
export const ENTRYPOINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'; // v0.7 EntryPoint
export const FACTORY_ADDRESS = '0x'; // Will be set after deployment
export const VERIFIER_ADDRESS = '0x'; // Will be set after deployment

// Default ABI coder instance
const abiCoder = AbiCoder.defaultAbiCoder();

/**
 * PackedUserOperation structure (ERC-4337 v0.7)
 */
export interface PackedUserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  accountGasLimits: string; // packed: validationGasLimit (16 bytes) + callGasLimit (16 bytes)
  preVerificationGas: string;
  gasFees: string; // packed: maxPriorityFeePerGas (16 bytes) + maxFeePerGas (16 bytes)
  paymasterAndData: string;
  signature: string;
}

/**
 * Calculate the counterfactual address of a QuantumAccount
 * @param publicKeyHash Hash of the Dilithium public key
 * @param salt Salt for CREATE2
 * @param factoryAddress Address of the factory contract
 * @returns The deterministic address
 */
export function calculateAccountAddress(
  publicKeyHash: string,
  salt: number,
  factoryAddress: string,
): string {
  // This matches the Solidity getAddress function
  const initCodeHash = keccak256(
    concat([
      // QuantumAccount creation code (will need to update with actual bytecode)
      '0x', // Placeholder - will be filled after contract deployment
      abiCoder.encode(
        ['address', 'address', 'bytes32'],
        [ENTRYPOINT_ADDRESS, VERIFIER_ADDRESS, publicKeyHash],
      ),
    ]),
  );

  return getCreate2Address(
    factoryAddress,
    solidityPackedKeccak256(['uint256'], [salt]),
    initCodeHash,
  );
}

/**
 * Encode initCode for account deployment
 * @param publicKeyHash Hash of the Dilithium public key
 * @param salt Salt for CREATE2
 * @param factoryAddress Factory contract address
 * @returns Encoded initCode
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
 * @param verificationGasLimit Gas limit for validation (16 bytes)
 * @param callGasLimit Gas limit for execution (16 bytes)
 * @returns Packed gas limits as hex string
 */
export function packAccountGasLimits(
  verificationGasLimit: bigint,
  callGasLimit: bigint,
): string {
  const verificationHex = verificationGasLimit.toString(16).padStart(32, '0');
  const callHex = callGasLimit.toString(16).padStart(32, '0');
  return '0x' + verificationHex + callHex;
}

/**
 * Pack gas fees
 * @param maxPriorityFeePerGas Max priority fee (16 bytes)
 * @param maxFeePerGas Max fee per gas (16 bytes)
 * @returns Packed gas fees as hex string
 */
export function packGasFees(
  maxPriorityFeePerGas: bigint,
  maxFeePerGas: bigint,
): string {
  const priorityHex = maxPriorityFeePerGas.toString(16).padStart(32, '0');
  const maxHex = maxFeePerGas.toString(16).padStart(32, '0');
  return '0x' + priorityHex + maxHex;
}

/**
 * Get nonce from EntryPoint
 * @param accountAddress Address of the quantum account
 * @param provider Ethers provider
 * @returns Current nonce
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
  } catch (error) {
    // Account might not exist yet
    return 0n;
  }
}

/**
 * Check if account is deployed
 * @param accountAddress Address to check
 * @param provider Ethers provider
 * @returns true if deployed
 */
export async function isAccountDeployed(
  accountAddress: string,
  provider: Provider,
): Promise<boolean> {
  const code = await provider.getCode(accountAddress);
  return code !== '0x';
}

/**
 * Construct a PackedUserOperation
 * @param params Parameters for the user operation
 * @returns PackedUserOperation ready to be signed
 */
export async function constructUserOp(params: {
  accountAddress: string;
  target: string;
  value: bigint;
  data: string;
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
    provider,
    publicKeyHash,
    salt,
    factoryAddress,
    paymasterAddress,
  } = params;

  // Check if account is deployed
  const isDeployed = await isAccountDeployed(accountAddress, provider);

  // Get nonce
  const nonce = await getAccountNonce(accountAddress, provider);

  // Encode initCode if account not deployed
  const initCode = isDeployed
    ? '0x'
    : encodeInitCode(publicKeyHash, salt, factoryAddress);

  // Encode the execution call
  const accountInterface = new Interface([
    'function execute(address dest, uint256 value, bytes calldata func)',
  ]);
  const callData = accountInterface.encodeFunctionData('execute', [
    target,
    value,
    data,
  ]);

  // Get gas price from network
  const feeData = await provider.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas || parseUnits('20', 'gwei');
  const maxPriorityFeePerGas =
    feeData.maxPriorityFeePerGas || parseUnits('2', 'gwei');

  // Gas limits - these are estimates
  // For quantum-safe verification, we need high verification gas
  const verificationGasLimit = 10_000_000n; // 10M for mock verifier (will be 250k with zkSNARK)
  const callGasLimit = 200_000n; // For execute() call
  const preVerificationGas = 100_000n; // Fixed overhead

  // Pack gas parameters
  const accountGasLimits = packAccountGasLimits(
    verificationGasLimit,
    callGasLimit,
  );
  const gasFees = packGasFees(maxPriorityFeePerGas, maxFeePerGas);

  // Paymaster and data
  const paymasterAndData = paymasterAddress || '0x';

  return {
    sender: accountAddress,
    nonce: nonce.toString(),
    initCode,
    callData,
    accountGasLimits,
    preVerificationGas: preVerificationGas.toString(),
    gasFees,
    paymasterAndData,
    signature: '0x', // Will be filled after signing
  };
}

/**
 * Calculate the userOpHash for signing
 * @param userOp The user operation
 * @param chainId Current chain ID
 * @returns Hash to be signed with Dilithium
 */
export function getUserOpHash(
  userOp: PackedUserOperation,
  chainId: number,
): string {
  // Pack the UserOp according to ERC-4337 v0.7 spec
  const packedData = abiCoder.encode(
    [
      'address', // sender
      'uint256', // nonce
      'bytes32', // initCode hash
      'bytes32', // callData hash
      'bytes32', // accountGasLimits
      'uint256', // preVerificationGas
      'bytes32', // gasFees
      'bytes32', // paymasterAndData hash
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

  // Add EntryPoint and chainId
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
 * @param targets Array of target addresses
 * @param values Array of ETH values
 * @param datas Array of call datas
 * @returns Encoded batch execution calldata
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
