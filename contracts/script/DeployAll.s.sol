// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MockGroth16Verifier.sol";
import "../src/QuantumSystem.sol";
import "../src/QuantumAMMFactory.sol";
import "../src/QuantumAMMRouter.sol";
import "../src/QuantumDynamicFeeHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

contract DeployAll is Script {
    // Uniswap v4 PoolManager addresses (testnet)
    address constant SEPOLIA_POOL_MANAGER = 0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A;
    // EntryPoint v0.7 address (Sepolia)
    address constant ENTRY_POINT = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Verifier
        MockGroth16Verifier verifier = new MockGroth16Verifier();
        console.log("Verifier deployed at:", address(verifier));

        // 2. Deploy QuantumSystem
        QuantumSystem system = new QuantumSystem(
            IEntryPoint(ENTRY_POINT),
            IGroth16Verifier(address(verifier))
        );
        console.log("QuantumSystem deployed at:", address(system));

        // 3. Deploy Factory
        QuantumAMMFactory factory = new QuantumAMMFactory(address(system));
        console.log("Factory deployed at:", address(factory));

        // 4. Deploy Router
        // Use checksummed WETH address or explicit cast
        address WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14; 
        QuantumAMMRouter router = new QuantumAMMRouter(address(factory), WETH);
        console.log("Router deployed at:", address(router));

        // 5. Deploy QuantumDynamicFeeHook
        QuantumDynamicFeeHook hook = new QuantumDynamicFeeHook(
            IPoolManager(SEPOLIA_POOL_MANAGER),
            address(system)
        );
        console.log("QuantumDynamicFeeHook deployed at:", address(hook));

        vm.stopBroadcast();
    }
}
