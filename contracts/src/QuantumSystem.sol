// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "./interfaces/IEntryPoint.sol";
import "./QuantumAccount.sol";
import "./interfaces/IGroth16Verifier.sol";

/**
 * @title QuantumSystem
 * @dev Consolidated System for Quantum Identity and Account Management
 * @notice Merges Registry and Factory functionality into a single source of truth
 * @author QSP Protocol
 */
contract QuantumSystem is Ownable {
    IEntryPoint public immutable entryPoint;
    IGroth16Verifier public immutable proofVerifier;

    // --- REGISTRY STATE ---
    // Mapping from user address to their Dilithium public key hash
    mapping(address => bytes32) public publicKeyHashes;
    
    // Track if an address is registered
    mapping(address => bool) public isRegistered;
    
    // Total registered users
    uint256 public totalRegistered;

    string public constant VERSION = "v2.0.0-refactor";

    // --- EVENTS ---
    event UserRegistered(address indexed user, bytes32 indexed publicKeyHash, uint256 timestamp);
    event KeyRotated(address indexed user, bytes32 indexed oldKeyHash, bytes32 indexed newKeyHash);
    event QuantumAccountCreated(address indexed account, bytes32 indexed publicKeyHash, uint256 salt);

    constructor(IEntryPoint _entryPoint, IGroth16Verifier _proofVerifier) Ownable(msg.sender) {
        entryPoint = _entryPoint;
        proofVerifier = _proofVerifier;
    }

    // --- FACTORY LOGIC ---

    /**
     * @dev Create a QuantumAccount with CREATE2 and Register it
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

        // Auto-Register the new account
        _registerInternal(address(account), publicKeyHash);

        emit QuantumAccountCreated(address(account), publicKeyHash, salt);
    }

    /**
     * @dev Calculate the counterfactual address of a QuantumAccount
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

    // --- REGISTRY LOGIC ---

    /**
     * @dev Internal register logic
     */
    function _registerInternal(address user, bytes32 publicKeyHash) internal {
        if (!isRegistered[user]) {
            publicKeyHashes[user] = publicKeyHash;
            isRegistered[user] = true;
            totalRegistered++;
            emit UserRegistered(user, publicKeyHash, block.timestamp);
        }
    }

    /**
     * @dev Register a quantum-safe public key for user (EOA or non-factory account)
     */
    function register(bytes32 publicKeyHash) external {
        require(publicKeyHash != bytes32(0), "Invalid public key hash");
        require(!isRegistered[msg.sender], "Already registered");
        _registerInternal(msg.sender, publicKeyHash);
    }

    /**
     * @dev Rotate to a new quantum-safe public key
     */
    function rotateKey(bytes32 newPublicKeyHash) external {
        require(isRegistered[msg.sender], "Not registered");
        require(newPublicKeyHash != bytes32(0), "Invalid public key hash");

        bytes32 oldKeyHash = publicKeyHashes[msg.sender];
        publicKeyHashes[msg.sender] = newPublicKeyHash;

        emit KeyRotated(msg.sender, oldKeyHash, newPublicKeyHash);
    }

    /**
     * @dev Check if an address is quantum-safe
     */
    function isQuantumSafe(address user) external view returns (bool) {
        return isRegistered[user];
    }

    /**
     * @dev Get the public key hash for a user
     */
    function getUserKeyHash(address user) external view returns (bytes32) {
        return publicKeyHashes[user];
    }
}
