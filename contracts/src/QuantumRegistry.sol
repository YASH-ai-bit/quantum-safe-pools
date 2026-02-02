// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title QuantumRegistry
 * @dev Registry for tracking quantum-safe user identities
 * @notice Maps addresses to their quantum public key hashes for verification
 */
contract QuantumRegistry is Ownable {
    // Mapping from user address to their Dilithium public key hash
    mapping(address => bytes32) public publicKeyHashes;
    
    // Track if an address is registered
    mapping(address => bool) public isRegistered;
    
    // Total registered users
    uint256 public totalRegistered;

    // Events
    event UserRegistered(address indexed user, bytes32 indexed publicKeyHash, uint256 timestamp);
    event KeyRotated(address indexed user, bytes32 indexed oldKeyHash, bytes32 indexed newKeyHash);
    event UserUnregistered(address indexed user);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register a quantum-safe public key for the caller
     * @param publicKeyHash Hash of the Dilithium public key (32 bytes)
     */
    function register(bytes32 publicKeyHash) external {
        require(publicKeyHash != bytes32(0), "Invalid public key hash");
        require(!isRegistered[msg.sender], "Already registered");

        publicKeyHashes[msg.sender] = publicKeyHash;
        isRegistered[msg.sender] = true;
        totalRegistered++;

        emit UserRegistered(msg.sender, publicKeyHash, block.timestamp);
    }

    /**
     * @dev Register on behalf of another address (for account abstraction)
     * @param user The address to register
     * @param publicKeyHash Hash of the Dilithium public key
     */
    function registerFor(address user, bytes32 publicKeyHash) external {
        require(publicKeyHash != bytes32(0), "Invalid public key hash");
        require(!isRegistered[user], "Already registered");

        publicKeyHashes[user] = publicKeyHash;
        isRegistered[user] = true;
        totalRegistered++;

        emit UserRegistered(user, publicKeyHash, block.timestamp);
    }

    /**
     * @dev Rotate to a new quantum-safe public key
     * @param newPublicKeyHash Hash of the new Dilithium public key
     */
    function rotateKey(bytes32 newPublicKeyHash) external {
        require(isRegistered[msg.sender], "Not registered");
        require(newPublicKeyHash != bytes32(0), "Invalid public key hash");

        bytes32 oldKeyHash = publicKeyHashes[msg.sender];
        publicKeyHashes[msg.sender] = newPublicKeyHash;

        emit KeyRotated(msg.sender, oldKeyHash, newPublicKeyHash);
    }

    /**
     * @dev Unregister (emergency only)
     */
    function unregister() external {
        require(isRegistered[msg.sender], "Not registered");

        delete publicKeyHashes[msg.sender];
        isRegistered[msg.sender] = false;
        totalRegistered--;

        emit UserUnregistered(msg.sender);
    }

    /**
     * @dev Check if an address is quantum-safe
     * @param user The address to check
     * @return True if the user has registered a quantum key
     */
    function isQuantumSafe(address user) external view returns (bool) {
        return isRegistered[user];
    }

    /**
     * @dev Get the public key hash for a user
     * @param user The address to query
     * @return The user's public key hash (or 0 if not registered)
     */
    function getUserKeyHash(address user) external view returns (bytes32) {
        return publicKeyHashes[user];
    }

    /**
     * @dev Batch check multiple addresses
     * @param users Array of addresses to check
     * @return Array of booleans indicating quantum-safe status
     */
    function batchCheckQuantumSafe(address[] calldata users) 
        external 
        view 
        returns (bool[] memory) 
    {
        bool[] memory results = new bool[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            results[i] = isRegistered[users[i]];
        }
        return results;
    }

    /**
     * @dev Get registry statistics
     * @return total Total registered users
     * @return timestamp Current block timestamp
     */
    function getStats() external view returns (uint256 total, uint256 timestamp) {
        return (totalRegistered, block.timestamp);
    }
}
