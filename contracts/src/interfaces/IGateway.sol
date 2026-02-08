// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IGateway
 * @notice Interface for Zama's Gateway contract that handles async FHE decryption
 * @dev Gateway communicates with KMS to decrypt FHE ciphertexts off-chain
 */
interface IGateway {
    /**
     * @notice Request decryption of an encrypted uint64
     * @param ct The encrypted value (euint64) to decrypt
     * @return requestId Unique identifier for this decryption request
     */
    function requestDecryption(
        uint256 ct,
        bytes4 callbackSelector,
        uint256 msgValue,
        uint256 maxTimestamp,
        bool passSignaturesToCaller
    ) external returns (uint256 requestId);

    /**
     * @notice Get the result of a completed decryption request
     * @param requestId The ID returned from requestDecryption
     * @return decrypted The plaintext uint64 value
     */
    function getDecryptionResult(uint256 requestId) external view returns (uint64 decrypted);
}

/**
 * @title IGatewayConsumer
 * @notice Interface that contracts must implement to receive Gateway callbacks
 */
interface IGatewayConsumer {
    /**
     * @notice Callback invoked by Gateway after decryption completes
     * @param requestId The decryption request ID
     * @param decryptedValue The plaintext decrypted value
     */
    function fulfillDecryption(uint256 requestId, uint64 decryptedValue) external;
}
