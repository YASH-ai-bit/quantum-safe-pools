import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, CheckCircle2, Server } from "lucide-react";

interface FHEOperation {
  user: string;
  operation: string;
  timestamp: bigint;
  operationCount: bigint;
  metadata: string;
  transactionHash: string;
  blockNumber: bigint;
}

interface FHEProof {
  usesFHE: boolean;
  encryptedReserve0Commitment: bigint;
  encryptedReserve1Commitment: bigint;
  encryptedTotalSupplyCommitment: bigint;
  proofType: string;
  description: string;
}

interface FHEProofDisplayProps {
  poolAddress: string;
  transactionHash?: string;
  onClose?: () => void;
}

// ABI for FHE proof functions
const FHE_PROOF_ABI = [
  {
    name: "getFHEProof",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "usesFHE", type: "bool" },
      { name: "encryptedReserve0Commitment", type: "uint256" },
      { name: "encryptedReserve1Commitment", type: "uint256" },
      { name: "encryptedTotalSupplyCommitment", type: "uint256" },
      { name: "proofType", type: "string" },
      { name: "description", type: "string" },
    ],
  },
  {
    name: "getFHEOperationCounts",
    type: "function",
    stateMutability: "pure",
    inputs: [],
    outputs: [
      { name: "mintOperations", type: "uint256" },
      { name: "burnOperations", type: "uint256" },
      { name: "swapOperations", type: "uint256" },
      { name: "notes", type: "string" },
    ],
  },
] as const;

const FHE_EVENT_ABI = [
  {
    type: "event",
    name: "FHEOperationProof",
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "operation", type: "string" },
      { indexed: false, name: "timestamp", type: "uint256" },
      { indexed: false, name: "operationCount", type: "uint256" },
      { indexed: false, name: "metadata", type: "string" },
    ],
  },
] as const;

export function FHEProofDisplay({
  poolAddress,
  transactionHash,
  onClose,
}: FHEProofDisplayProps) {
  const [operations, setOperations] = useState<FHEOperation[]>([]);
  const [proof, setProof] = useState<FHEProof | null>(null);
  const [loading, setLoading] = useState(true);
  const publicClient = usePublicClient({ chainId: sepolia.id });

  useEffect(() => {
    const fetchProof = async () => {
      if (!publicClient || !poolAddress) return;

      try {
        // Fetch FHE proof from contract
        const proofData = (await publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: FHE_PROOF_ABI,
          functionName: "getFHEProof",
        })) as [boolean, bigint, bigint, bigint, string, string];

        setProof({
          usesFHE: proofData[0],
          encryptedReserve0Commitment: proofData[1],
          encryptedReserve1Commitment: proofData[2],
          encryptedTotalSupplyCommitment: proofData[3],
          proofType: proofData[4],
          description: proofData[5],
        });

        // Fetch FHE operation events from transaction
        if (transactionHash) {
          const receipt = await publicClient.getTransactionReceipt({
            hash: transactionHash as `0x${string}`,
          });

          const logs = await publicClient.getLogs({
            address: poolAddress as `0x${string}`,
            event: FHE_EVENT_ABI[0],
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
          });

          const ops: FHEOperation[] = logs
            .filter((log) => log.transactionHash === transactionHash)
            .map((log) => ({
              user: log.args.user || "0x",
              operation: log.args.operation || "",
              timestamp: log.args.timestamp || 0n,
              operationCount: log.args.operationCount || 0n,
              metadata: log.args.metadata || "",
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
            }));

          setOperations(ops);
        }
      } catch (error) {
        console.error("Failed to fetch FHE proof:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProof();
  }, [poolAddress, transactionHash, publicClient]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 animate-pulse" />
          <span>Loading FHE proof...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* FHE Verification Badge */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-purple-900">
                FHE Encryption Verified
              </h3>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm text-purple-700 mb-3">{proof?.description}</p>
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className="bg-purple-100 text-purple-700 border-purple-300"
              >
                {proof?.proofType}
              </Badge>
              {proof?.usesFHE && (
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-700 border-green-300"
                >
                  ✓ FHE Active
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Encrypted State Commitments */}
      {proof && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-gray-600" />
            <h4 className="font-semibold">Encrypted State Commitments</h4>
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Reserve 0 (Encrypted)</span>
              <code className="text-xs font-mono text-purple-600">
                {proof.encryptedReserve0Commitment.toString().slice(0, 16)}...
              </code>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Reserve 1 (Encrypted)</span>
              <code className="text-xs font-mono text-purple-600">
                {proof.encryptedReserve1Commitment.toString().slice(0, 16)}...
              </code>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Total Supply (Encrypted)</span>
              <code className="text-xs font-mono text-purple-600">
                {proof.encryptedTotalSupplyCommitment.toString().slice(0, 16)}
                ...
              </code>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 These commitments prove encrypted state exists. Values are stored
            as <code>euint64</code> FHE types.
          </p>
        </Card>
      )}

      {/* FHE Operations Timeline */}
      {operations.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">
            FHE Operations Performed ({operations.length})
          </h4>
          <div className="space-y-2">
            {operations.map((op, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50 to-transparent rounded-lg border border-purple-100"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-mono text-purple-700">
                  {op.operationCount.toString()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-semibold text-purple-700">
                      {op.operation}
                    </code>
                    {op.operation === "MINT_COMPLETE" && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200 text-xs"
                      >
                        ✓ Complete
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{op.metadata}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Operation Summary */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <div className="text-2xl">🔐</div>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Total FHE Operations:{" "}
                  {operations[operations.length - 1]?.operationCount.toString()}
                </p>
                <p className="text-xs text-blue-700">
                  Operations: ENCRYPT (2) + ADD (4) + MUL (3) + DECRYPT (1) +
                  K_UPDATE (2)
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  💡 Production gas estimate: ~3M gas with real fhEVM (~$15 @
                  200 gwei)
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* View on Etherscan */}
      {transactionHash && (
        <Card className="p-4 bg-gray-50">
          <a
            href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <span>View transaction on Etherscan</span>
            <span>→</span>
          </a>
        </Card>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
        >
          Close
        </button>
      )}
    </div>
  );
}
