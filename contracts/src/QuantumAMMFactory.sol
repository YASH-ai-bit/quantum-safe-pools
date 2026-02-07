// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QuantumAMMPool.sol";
import "./QuantumSystem.sol";

contract QuantumAMMFactory {
    mapping(address => mapping(address => address)) public getPool;
    address[] public allPools;
    QuantumSystem public immutable quantumSystem;

    event PoolCreated(address indexed token0, address indexed token1, address pool, uint256 allPoolsLength);

    constructor(address _quantumSystem) {
        quantumSystem = QuantumSystem(_quantumSystem);
    }

    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }

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
}
