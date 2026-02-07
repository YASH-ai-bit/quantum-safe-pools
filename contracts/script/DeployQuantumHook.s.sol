// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/QuantumDynamicFeeHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

contract DeployQuantumHook is Script {
    // Uniswap v4 PoolManager addresses (testnet)
    // Sepolia: 0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A (Uniswap v4 official)
    address constant SEPOLIA_POOL_MANAGER = 0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address quantumSystem = vm.envAddress("QUANTUM_SYSTEM_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        QuantumDynamicFeeHook hook = new QuantumDynamicFeeHook(
            IPoolManager(SEPOLIA_POOL_MANAGER),
            quantumSystem
        );
        
        console.log("QuantumDynamicFeeHook deployed at:", address(hook));
        console.log("PoolManager:", SEPOLIA_POOL_MANAGER);
        console.log("QuantumSystem:", quantumSystem);
        
        vm.stopBroadcast();
    }
}
