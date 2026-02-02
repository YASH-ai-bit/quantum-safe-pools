// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Create2.sol";
import "./QuantumAccount.sol";

/**
 * @title QuantumAccountFactory
 * @dev Factory contract for deploying QuantumAccount instances using CREATE2
 * @notice Allows deterministic address calculation before deployment
 */
contract QuantumAccountFactory {
    IEntryPoint public immutable entryPoint;
    IGroth16Verifier public immutable proofVerifier;

    event QuantumAccountCreated(address indexed account, bytes32 indexed publicKeyHash, uint256 salt);

    constructor(IEntryPoint _entryPoint, IGroth16Verifier _proofVerifier) {
        entryPoint = _entryPoint;
        proofVerifier = _proofVerifier;
    }

    /**
     * @dev Create a QuantumAccount with CREATE2
     * @param publicKeyHash Hash of the Dilithium public key
     * @param salt Salt for CREATE2 (allows multiple accounts per key)
     * @return account The created QuantumAccount address
     */
    function createAccount(
        bytes32 publicKeyHash,
        uint256 salt
    ) external returns (QuantumAccount account) {
        address addr = getAddress(publicKeyHash, salt);
        
        // Check if already deployed
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return QuantumAccount(payable(addr));
        }

        // Deploy with CREATE2
        account = new QuantumAccount{salt: bytes32(salt)}(
            entryPoint,
            proofVerifier,
            publicKeyHash
        );

        emit QuantumAccountCreated(address(account), publicKeyHash, salt);
    }

    /**
     * @dev Calculate the counterfactual address of a QuantumAccount
     * @param publicKeyHash Hash of the Dilithium public key
     * @param salt Salt for CREATE2
     * @return The deterministic address
     */
    function getAddress(
        bytes32 publicKeyHash,
        uint256 salt
    ) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(
                abi.encodePacked(
                    type(QuantumAccount).creationCode,
                    abi.encode(entryPoint, proofVerifier, publicKeyHash)
                )
            )
        );
    }
}
