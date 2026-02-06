// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

import "forge-std/Script.sol";
import "../src/QuantumPoolRouter.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "../src/QuantumHook.sol";

/**
 * @title DeployRouter
 * @dev Redeploy just the QuantumPoolRouter with the new initialize function
 */
contract DeployRouter is Script {
    // Existing PoolManager address on Sepolia
    address constant POOL_MANAGER = 0xDCfE0a251aCEC68342FcEA6ca40aDDfe955D4D55;
    // Existing Hook address on Sepolia
    address constant QUANTUM_HOOK = 0xcfA7085967a666A21CaC8385b23cc0f379d56a80;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying QuantumPoolRouter with address:", deployer);
        console.log("Using PoolManager:", POOL_MANAGER);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new router with initialize function
        QuantumPoolRouter router = new QuantumPoolRouter(IPoolManager(POOL_MANAGER));
        console.log("New QuantumPoolRouter deployed to:", address(router));
        
        // Update Hook to whitelist new router
        QuantumHook(QUANTUM_HOOK).setRouter(address(router));
        console.log("QuantumHook updated with new Router:", address(router));

        vm.stopBroadcast();

        console.log("\n=== ROUTER DEPLOYMENT COMPLETE ===");
        console.log("NEW_QUANTUM_POOL_ROUTER=", address(router));
        console.log("==================================");
        console.log("");
        console.log("IMPORTANT: Update the router address in:");
        console.log("  - frontend/shared/contracts.ts");
        console.log("  - snap/packages/snap/src/config.ts");
    }
}
