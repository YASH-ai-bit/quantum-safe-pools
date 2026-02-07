// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QuantumAMMPool.sol";
import "./QuantumAMMDarkPool.sol";
import "./QuantumSystem.sol";

contract QuantumAMMFactory {
    // Normal Pools (existing)
    mapping(address => mapping(address => address)) public getPool;
    address[] public allPools;
    
    // Dark Pools (FHE-enabled)
    mapping(address => mapping(address => address)) public getDarkPool;
    address[] public allDarkPools;
    
    QuantumSystem public immutable quantumSystem;

    event PoolCreated(address indexed token0, address indexed token1, address pool, uint256 allPoolsLength);
    event DarkPoolCreated(address indexed token0, address indexed token1, address darkPool, uint256 allDarkPoolsLength);

    constructor(address _quantumSystem) {
        quantumSystem = QuantumSystem(_quantumSystem);
    }

    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }
    
    function allDarkPoolsLength() external view returns (uint256) {
        return allDarkPools.length;
    }

    // Create normal public pool (existing function - unchanged)
    function createPool(address tokenA, address tokenB) external returns (address pool) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getPool[token0][token1] == address(0), "POOL_EXISTS");

        QuantumAMMPool newPool = new QuantumAMMPool(token0, token1, address(quantumSystem), msg.sender);
        pool = address(newPool);
        
        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool; // Populate reverse mapping
        allPools.push(pool);
        
        emit PoolCreated(token0, token1, pool, allPools.length);
    }
    
    // Create dark pool with FHE encryption (NEW)
    function createDarkPool(address tokenA, address tokenB) external returns (address darkPool) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getDarkPool[token0][token1] == address(0), "DARK_POOL_EXISTS");
        
        // Only verified quantum users can create dark pools (privacy requirement)
        require(quantumSystem.isQuantumSafe(msg.sender), "NOT_VERIFIED");
        
        QuantumAMMDarkPool newDarkPool = new QuantumAMMDarkPool(
            token0,
            token1,
            address(quantumSystem)
        );
        darkPool = address(newDarkPool);
        
        getDarkPool[token0][token1] = darkPool;
        getDarkPool[token1][token0] = darkPool;
        allDarkPools.push(darkPool);
        
        emit DarkPoolCreated(token0, token1, darkPool, allDarkPools.length);
    }
    
    // Helper: Check if dark pool exists for pair
    function hasDarkPool(address tokenA, address tokenB) external view returns (bool) {
        return getDarkPool[tokenA][tokenB] != address(0);
    }
    
    // Helper: Check if normal pool exists for pair
    function hasPool(address tokenA, address tokenB) external view returns (bool) {
        return getPool[tokenA][tokenB] != address(0);
    }
}
