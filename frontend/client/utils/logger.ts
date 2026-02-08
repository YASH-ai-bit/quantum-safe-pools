
import { decodeEventLog, parseAbiItem, type TransactionReceipt } from 'viem';

// ABI for the FHEOperationProof event
const FHE_OPERATION_PROOF_ABI = parseAbiItem(
  'event FHEOperationProof(address indexed user, string operation, uint256 timestamp, uint256 operationCount, string metadata)'
);

// Map operations to technical descriptions
const OPERATION_DESCRIPTIONS: Record<string, string> = {
  'ENCRYPT_AMOUNT0': 'FHE_ENCRYPT_LHS (Token A)',
  'ENCRYPT_AMOUNT1': 'FHE_ENCRYPT_RHS (Token B)',
  'CALCULATE_LP_TOKENS': 'FHE_SQRT_AB_PRODUCT (LP Calc)',
  'ADD_RESERVE0': 'FHE_ADD_ASSIGN (Reserve A)',
  'ADD_RESERVE1': 'FHE_ADD_ASSIGN (Reserve B)',
  'ADD_LP_BALANCE': 'FHE_ADD_ASSIGN (LP Balance)',
  'ADD_TOTAL_SUPPLY': 'FHE_ADD_ASSIGN (Total Supply)',
  'UPDATE_K_COMMITMENT': 'ZK_PROOF_GEN_K (Commitment)',
  'DECRYPT_LIQUIDITY': 'THRESHOLD_DECRYPT (LP Amount)',
  'MINT_COMPLETE': 'STATE_UPDATE_FINALIZE',
};

// Minimal technical styling - mostly just monospace
const STYLES = {
  header: 'font-family: monospace; font-weight: bold;',
  label: 'font-family: monospace; font-weight: bold;',
  value: 'font-family: monospace;',
  separator: 'font-family: monospace; color: #888;',
  fheOp: 'font-family: monospace; font-weight: bold; color: #00cccc;',
  link: 'font-family: monospace; color: #4da6ff; text-decoration: underline;',
};

/**
 * Logs a technical summary of a Dark Pool transaction.
 */
export const logDarkPoolTransaction = (receipt: TransactionReceipt) => {
  if (!receipt) {
    console.warn("Logger: No receipt provided.");
    return;
  }

  // Generate Etherscan link (assuming Sepolia as default for testnet dev)
  const etherscanLink = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;

  console.group('%c[DARK POOL TRANSACTION RECEIPT]', STYLES.header);

  console.log('%c--------------------------------------------------', STYLES.separator);
  console.log(`%cHash:      %c${receipt.transactionHash}`, STYLES.label, STYLES.value);
  console.log(`%cExplorer:  %c${etherscanLink}`, STYLES.label, STYLES.link);
  console.log(`%cTo:        %c${receipt.to}`, STYLES.label, STYLES.value);
  console.log(`%cBlock:     %c${receipt.blockNumber}`, STYLES.label, STYLES.value);
  console.log(`%cGas:       %c${receipt.gasUsed.toString()}`, STYLES.label, STYLES.value);
  console.log('%c--------------------------------------------------', STYLES.separator);

  // Filter and decode FHEOperationProof logs
  const fheLogs = receipt.logs
    .map((log) => {
      try {
        return decodeEventLog({
          abi: [FHE_OPERATION_PROOF_ABI],
          data: log.data,
          topics: log.topics,
          strict: false,
        });
      } catch (e) {
        return null; // Not an FHE event
      }
    })
    .filter((decoded): decoded is any => decoded !== null && decoded.eventName === 'FHEOperationProof');

  if (fheLogs.length > 0) {
    console.log('%c[FHE OPERATIONS TRACE]', STYLES.header);
    fheLogs.forEach((log: any, index: number) => {
      const { operation, operationCount, metadata } = log.args;
      const desc = OPERATION_DESCRIPTIONS[operation] || operation;
      
      console.log(`%c[OP_${index.toString().padStart(2, '0')}] %c${operation.padEnd(20)} %c${desc}`, 
        STYLES.value, 
        STYLES.fheOp,
        STYLES.value
      );
    });
    console.log('%c--------------------------------------------------', STYLES.separator);
    console.log(`%cTotal Privacy Preserving Ops: ${fheLogs.length}`, STYLES.value);
  } else {
     console.log('%cNo FHE operations detected.', STYLES.value);
  }
  
  console.groupEnd();
};
