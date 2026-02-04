// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

import "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/interfaces/IPoolManager.sol";
import "../src/QuantumRegistry.sol";
import "../src/QuantumHook.sol";

/**
 * @title DeployHookViaCreate2Proxy
 * @dev Deploys QuantumHook using the deterministic CREATE2 factory to get 
 *      an address with correct Uniswap V4 hook permission flags.
 *
 * The deterministic deployment proxy at 0x4e59b44847b379578588920cA78FbF26c0B4956C
 * accepts calldata as: salt (32 bytes) + bytecode
 * and deploys using CREATE2.
 */
contract DeployHookViaCreate2Proxy is Script {
    // Deterministic Deployment Proxy - same address on all EVM chains
    address constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    
    // Required flags for our hook
    uint160 constant REQUIRED_FLAGS = uint160(
        Hooks.BEFORE_INITIALIZE_FLAG |      // bit 13 = 0x2000
        Hooks.BEFORE_ADD_LIQUIDITY_FLAG |   // bit 11 = 0x0800
        Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG | // bit 9 = 0x0200
        Hooks.BEFORE_SWAP_FLAG              // bit 7 = 0x0080
    ); // Total = 0x2A80 = 10880

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Existing contract addresses on Sepolia
        address poolManager = 0x485E0187830d937140f0D2099cBBaF896839a55d;
        address registryAddress = 0xF9Ba25A15929064F2c6eE2640006b18E93924f23;
        
        console.log("=== Deployment Configuration ===");
        console.log("Deployer EOA:", deployer);
        console.log("CREATE2 Proxy:", CREATE2_PROXY);
        console.log("PoolManager:", poolManager);
        console.log("Registry:", registryAddress);
        
        // Build the creation bytecode with constructor arguments
        bytes memory creationCode = abi.encodePacked(
            type(QuantumHook).creationCode,
            abi.encode(IPoolManager(poolManager), QuantumRegistry(registryAddress))
        );
        
        bytes32 initCodeHash = keccak256(creationCode);
        console.log("\nInitCode Hash:");
        console.logBytes32(initCodeHash);
        console.log("Required flags: 0x2A80 =", uint256(REQUIRED_FLAGS));
        
        // Find a salt that produces an address with correct hook flags
        console.log("\nSearching for valid CREATE2 salt...");
        
        bytes32 salt;
        address expectedAddress;
        bool found = false;
        
        for (uint256 i = 0; i < 50000000; i++) {
            salt = bytes32(i);
            expectedAddress = computeCreate2Address(CREATE2_PROXY, salt, initCodeHash);
            
            uint160 addrFlags = uint160(expectedAddress) & uint160(Hooks.ALL_HOOK_MASK);
            if ((addrFlags & REQUIRED_FLAGS) == REQUIRED_FLAGS) {
                found = true;
                console.log("Found valid salt at iteration:", i);
                console.log("Salt (bytes32):");
                console.logBytes32(salt);
                break;
            }
        }
        
        require(found, "Could not find valid salt in search range");
        
        uint160 expectedFlags = uint160(expectedAddress) & uint160(Hooks.ALL_HOOK_MASK);
        console.log("\nExpected hook address:", expectedAddress);
        console.log("Address flags:", expectedFlags);
        
        // Verify the expected address doesn't already have code
        uint256 existingCode;
        assembly {
            existingCode := extcodesize(expectedAddress)
        }
        if (existingCode > 0) {
            console.log("Hook already deployed at this address!");
            console.log("Address:", expectedAddress);
            return;
        }
        
        console.log("\n=== Deploying via CREATE2 Proxy ===");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // The deterministic deployment proxy takes: salt + initCode as calldata
        // It deploys using CREATE2 with msg.sender-independent addressing
        bytes memory payload = abi.encodePacked(salt, creationCode);
        
        (bool success, ) = CREATE2_PROXY.call(payload);
        require(success, "CREATE2 proxy call failed");
        
        vm.stopBroadcast();
        
        // Verify deployment
        uint256 deployedCode;
        assembly {
            deployedCode := extcodesize(expectedAddress)
        }
        require(deployedCode > 0, "Deployment verification failed - no code at expected address");
        
        console.log("\n=== SUCCESS ===");
        console.log("QuantumHook deployed to:", expectedAddress);
        console.log("\nUpdate frontend/shared/contracts.ts:");
        console.log("  QUANTUM_HOOK:", expectedAddress);
    }
    
    function computeCreate2Address(
        address factory,
        bytes32 salt,
        bytes32 initCodeHash
    ) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            factory,
            salt,
            initCodeHash
        )))));
    }
}
