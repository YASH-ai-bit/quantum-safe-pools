// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

import "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import "../src/QuantumRegistry.sol";
import "../src/QuantumHook.sol";

/**
 * @title DeployHookCorrect
 * @dev Deploys QuantumHook using CREATE2 to get an address with correct hook permission flags
 *
 * Uniswap V4 Hook permission flags (lower 14 bits of address):
 * - BEFORE_INITIALIZE_FLAG = 1 << 13 = 0x2000
 * - BEFORE_ADD_LIQUIDITY_FLAG = 1 << 11 = 0x0800
 * - BEFORE_REMOVE_LIQUIDITY_FLAG = 1 << 9 = 0x0200
 * - BEFORE_SWAP_FLAG = 1 << 7 = 0x0080
 * Total required = 0x2A80
 */
contract DeployHookCorrect is Script {
    // Required flags for our hook (0x2A80)
    uint160 constant REQUIRED_FLAGS = uint160(
        Hooks.BEFORE_INITIALIZE_FLAG |
        Hooks.BEFORE_ADD_LIQUIDITY_FLAG |
        Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG |
        Hooks.BEFORE_SWAP_FLAG
    );

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Existing contract addresses
        address poolManager = 0x485E0187830d937140f0D2099cBBaF896839a55d;
        address registryAddress = 0xF9Ba25A15929064F2c6eE2640006b18E93924f23;
        
        console.log("Deployer:", deployer);
        console.log("PoolManager:", poolManager);
        console.log("Registry:", registryAddress);
        
        // Get bytecode for deployment
        bytes memory creationCode = abi.encodePacked(
            type(QuantumHook).creationCode,
            abi.encode(IPoolManager(poolManager), QuantumRegistry(registryAddress))
        );
        
        bytes32 initCodeHash = keccak256(creationCode);
        console.log("InitCode Hash:");
        console.logBytes32(initCodeHash);
        console.log("Required flags (hex): 0x2A80");
        
        // We need to find the salt dynamically since the deployer address affects CREATE2
        // Try salts starting from 0 until we find one with correct flags
        bytes32 salt;
        address hookAddress;
        bool found = false;
        
        console.log("Searching for valid salt (this may take a moment)...");
        
        for (uint256 i = 0; i < 1000000; i++) {
            salt = bytes32(i);
            hookAddress = computeAddress(deployer, salt, initCodeHash);
            
            uint160 addressFlags = uint160(hookAddress) & uint160(Hooks.ALL_HOOK_MASK);
            if ((addressFlags & REQUIRED_FLAGS) == REQUIRED_FLAGS) {
                found = true;
                console.log("Found valid salt at iteration:", i);
                break;
            }
        }
        
        require(found, "Could not find valid salt in range");
        
        console.log("Salt found:", uint256(salt));
        console.log("Hook will be deployed to:", hookAddress);
        
        // Verify flags
        uint160 addressFlags = uint160(hookAddress) & uint160(Hooks.ALL_HOOK_MASK);
        console.log("Address flags:", addressFlags);
        console.log("Required flags:", uint160(REQUIRED_FLAGS));
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy using CREATE2
        QuantumHook hook = new QuantumHook{salt: salt}(
            IPoolManager(poolManager),
            QuantumRegistry(registryAddress)
        );
        
        console.log("QuantumHook deployed to:", address(hook));
        require(address(hook) == hookAddress, "Address mismatch!");
        
        vm.stopBroadcast();
        
        console.log("\n=== UPDATE contracts.ts WITH ===");
        console.log("QUANTUM_HOOK:", address(hook));
    }
    
    function computeAddress(
        address deployer,
        bytes32 salt,
        bytes32 initCodeHash
    ) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            deployer,
            salt,
            initCodeHash
        )))));
    }
}
