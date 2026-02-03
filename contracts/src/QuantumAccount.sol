// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@account-abstraction/interfaces/IAccount.sol";
import "@account-abstraction/interfaces/IEntryPoint.sol";
import "@account-abstraction/interfaces/PackedUserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IGroth16Verifier.sol";

/**
 * @title QuantumAccount
 * @dev ERC-4337 smart contract account with quantum-safe Dilithium signature verification via zkSNARK
 * @notice This account verifies zkSNARK proofs of Dilithium signature validity instead of verifying signatures directly
 */
contract QuantumAccount is IAccount {
    using ECDSA for bytes32;

    // EntryPoint contract
    IEntryPoint private immutable _entryPoint;
    
    // zkSNARK verifier for Dilithium signature proofs
    IGroth16Verifier public immutable proofVerifier;
    
    // Hash of the Dilithium public key (32 bytes instead of storing full 1,952 bytes)
    bytes32 public publicKeyHash;
    
    // Nonce for replay protection (though EntryPoint handles this too)
    uint256 public nonce;
    
    // Events
    event QuantumAccountInitialized(IEntryPoint indexed entryPoint, bytes32 indexed publicKeyHash);
    event PublicKeyRotated(bytes32 indexed oldKeyHash, bytes32 indexed newKeyHash);

    // Errors
    error OnlyEntryPoint();
    error InvalidProof();
    error CallFailed();

    /**
     * @dev Constructor
     * @param entryPoint_ The ERC-4337 EntryPoint contract
     * @param proofVerifier_ The Groth16 verifier contract
     * @param dilithiumPublicKeyHash_ Hash of the Dilithium public key
     */
    constructor(
        IEntryPoint entryPoint_,
        IGroth16Verifier proofVerifier_,
        bytes32 dilithiumPublicKeyHash_
    ) {
        _entryPoint = entryPoint_;
        proofVerifier = proofVerifier_;
        publicKeyHash = dilithiumPublicKeyHash_;
        
        emit QuantumAccountInitialized(entryPoint_, dilithiumPublicKeyHash_);
    }

    /**
     * @dev Validate user operation (ERC-4337)
     * @param userOp The user operation to validate
     * @param userOpHash Hash of the user operation
     * @param missingAccountFunds Amount of funds needed to pay for the user operation
     * @return validationData 0 if valid, SIG_VALIDATION_FAILED otherwise
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        if (msg.sender != address(_entryPoint)) {
            revert OnlyEntryPoint();
        }

        // Pay the EntryPoint required funds
        if (missingAccountFunds > 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
            if (!success) revert CallFailed();
        }

        // Validate the zkSNARK proof
        validationData = _validateSignature(userOp.signature, userOpHash);
    }

    /**
     * @dev Internal function to validate zkSNARK proof
     * @param signature The zkSNARK proof (256 bytes)
     * @param userOpHash The hash that was signed
     * @return 0 if valid, 1 if invalid
     */
    function _validateSignature(
        bytes calldata signature,
        bytes32 userOpHash
    ) internal view returns (uint256) {
        // Public inputs for the zkSNARK proof
        // [0] = userOpHash (message that was signed)
        // [1] = publicKeyHash (hash of Dilithium public key)
        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = userOpHash;
        publicInputs[1] = publicKeyHash;

        // Verify the zkSNARK proof
        // The proof attests: "I know a Dilithium signature for userOpHash using the key that hashes to publicKeyHash"
        bool valid = proofVerifier.verify(signature, publicInputs);
        
        if (!valid) {
            return 1; // SIG_VALIDATION_FAILED
        }
        
        return 0; // Success
    }

    /**
     * @dev Execute a transaction (authorized by EntryPoint after validation)
     * @param dest Destination address
     * @param value ETH value to send
     * @param func Calldata to execute
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external {
        if (msg.sender != address(_entryPoint)) {
            revert OnlyEntryPoint();
        }
        
        _call(dest, value, func);
    }

    /**
     * @dev Execute multiple transactions in batch
     * @param dests Array of destination addresses
     * @param values Array of ETH values
     * @param funcs Array of calldatas
     */
    function executeBatch(
        address[] calldata dests,
        uint256[] calldata values,
        bytes[] calldata funcs
    ) external {
        if (msg.sender != address(_entryPoint)) {
            revert OnlyEntryPoint();
        }

        require(dests.length == values.length && dests.length == funcs.length, "Length mismatch");

        for (uint256 i = 0; i < dests.length; i++) {
            _call(dests[i], values[i], funcs[i]);
        }
    }

    /**
     * @dev Rotate to a new quantum-safe public key
     * @param newPublicKeyHash Hash of the new Dilithium public key
     * @dev Can only be called through a validated UserOperation
     */
    function rotateKey(bytes32 newPublicKeyHash) external {
        if (msg.sender != address(this)) {
            revert OnlyEntryPoint();
        }
        
        bytes32 oldKeyHash = publicKeyHash;
        publicKeyHash = newPublicKeyHash;
        
        emit PublicKeyRotated(oldKeyHash, newPublicKeyHash);
    }

    /**
     * @dev Internal call function
     * @param target Target address
     * @param value ETH value
     * @param data Calldata
     */
    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            // Bubble up the revert reason
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /**
     * @dev Get the EntryPoint
     */
    function entryPoint() public view returns (IEntryPoint) {
        return _entryPoint;
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}

    /**
     * @dev Fallback function
     */
    fallback() external payable {}
}
