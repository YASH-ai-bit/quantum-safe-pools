// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/QuantumRegistry.sol";
import "../src/QuantumAccount.sol";
import "../src/QuantumAccountFactory.sol";
import "../src/MockGroth16Verifier.sol";
import "../src/HackathonPaymaster.sol";
import "../src/QuantumHook.sol";
import "../src/QuantumPoolRouter.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";
import {IEntryPoint} from "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

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

        // 3. Deploy EntryPoint
        EntryPoint entryPoint = new EntryPoint();
        console.log("EntryPoint deployed to:", address(entryPoint));

        // 4. Deploy Quantum Account Factory
        QuantumAccountFactory factory = new QuantumAccountFactory(
            IEntryPoint(address(entryPoint)),
            verifier
        );
        console.log("QuantumAccountFactory deployed to:", address(factory));

        // 5. Deploy Hackathon Paymaster
        HackathonPaymaster paymaster = new HackathonPaymaster(
            IEntryPoint(address(entryPoint)),
            deployer // owner
        );
        console.log("HackathonPaymaster deployed to:", address(paymaster));

        // 6. Deploy Uniswap V4 PoolManager
        PoolManager poolManager = new PoolManager(deployer);
        console.log("PoolManager deployed to:", address(poolManager));

        // 7. Deploy QuantumHook
        QuantumHook quantumHook = new QuantumHook(IPoolManager(address(poolManager)), registry);
        console.log("QuantumHook deployed to:", address(quantumHook));

        // 8. Deploy QuantumPoolRouter
        QuantumPoolRouter router = new QuantumPoolRouter(IPoolManager(address(poolManager)));
        console.log("QuantumPoolRouter deployed to:", address(router));

        vm.stopBroadcast();

        // Write addresses to file
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("QUANTUM_REGISTRY=", address(registry));
        console.log("QUANTUM_ACCOUNT_FACTORY=", address(factory));
        console.log("GROTH16_VERIFIER=", address(verifier));
        console.log("HACKATHON_PAYMASTER=", address(paymaster));
        console.log("ENTRYPOINT=", address(entryPoint));
        console.log("POOL_MANAGER=", address(poolManager));
        console.log("QUANTUM_HOOK=", address(quantumHook));
        console.log("QUANTUM_POOL_ROUTER=", address(router));
        console.log("================================");
    }
}
