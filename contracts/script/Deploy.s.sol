// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

import "forge-std/Script.sol";
import "../src/QuantumRegistry.sol";
import "../src/QuantumAccount.sol";
import "../src/QuantumAccountFactory.sol";
import "../src/MockGroth16Verifier.sol";
import "../src/HackathonPaymaster.sol";
import "../src/QuantumHook.sol";
import "../src/QuantumPoolRouter.sol";
// Use interface only - no full EntryPoint import to avoid solc version conflict
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";

/**
 * @title Deploy
 * @dev Deployment script for all Quantum Safe contracts
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with address:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock Groth16 Verifier
        MockGroth16Verifier verifier = new MockGroth16Verifier();
        console.log("MockGroth16Verifier deployed to:", address(verifier));

        // 2. Deploy Quantum Registry
        QuantumRegistry registry = new QuantumRegistry();
        console.log("QuantumRegistry deployed to:", address(registry));

        // 3. Use Canonical EntryPoint (v0.7)
        address entryPointAddress = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
        console.log("Using Canonical EntryPoint:", entryPointAddress);

        // 4. Deploy Quantum Account Factory
        QuantumAccountFactory factory = new QuantumAccountFactory(
            IEntryPoint(entryPointAddress),
            verifier
        );
        console.log("QuantumAccountFactory deployed to:", address(factory));

        // 5. Deploy Hackathon Paymaster
        HackathonPaymaster paymaster = new HackathonPaymaster(
            IEntryPoint(entryPointAddress),
            deployer // owner
        );
        console.log("HackathonPaymaster deployed to:", address(paymaster));

        // 6. Deploy Uniswap V4 PoolManager
        PoolManager poolManager = new PoolManager(deployer);
        console.log("PoolManager deployed to:", address(poolManager));


        // 7. Deploy QuantumHook (Super Hook)
        // Interval: 3600 seconds (1 hour) for TWAMM expiration
        uint256 expirationInterval = 3600; 
        QuantumHook quantumHook = new QuantumHook(IPoolManager(address(poolManager)), registry, expirationInterval);
        console.log("QuantumHook deployed to:", address(quantumHook));

        // 8. Deploy QuantumPoolRouter (Still needed for routing)
        // Ensure Router is compatible or if we need to redeploy
        QuantumPoolRouter router = new QuantumPoolRouter(IPoolManager(address(poolManager)));
        console.log("QuantumPoolRouter deployed to:", address(router));

        // 9. Whitelist Router in Hook
        quantumHook.setRouter(address(router));

        console.log("Router whitelisted in QuantumHook");

        vm.stopBroadcast();

        // Write addresses to file
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("QUANTUM_REGISTRY=", address(registry));
        console.log("QUANTUM_ACCOUNT_FACTORY=", address(factory));
        console.log("GROTH16_VERIFIER=", address(verifier));
        console.log("HACKATHON_PAYMASTER=", address(paymaster));
        console.log("ENTRYPOINT=", entryPointAddress);
        console.log("POOL_MANAGER=", address(poolManager));
        console.log("QUANTUM_HOOK=", address(quantumHook));
        console.log("QUANTUM_POOL_ROUTER=", address(router));
        console.log("================================");
    }
}
