// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/QuantumRegistry.sol";
import "../src/QuantumAccount.sol";
import "../src/QuantumAccountFactory.sol";
import "../src/MockGroth16Verifier.sol";
import "../src/HackathonPaymaster.sol";

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

        // 3. Deploy EntryPoint (using existing on Sepolia: 0x0000071727DE22E5e9D8BaF0eDAC6F37Da032000)
        // Or deploy our own for local testing
        address entryPoint = 0x0000071727DE22E5e9D8BaF0eDAC6F37Da032000;
        console.log("Using EntryPoint at:", entryPoint);

        // 4. Deploy Quantum Account Factory
        QuantumAccountFactory factory = new QuantumAccountFactory(
            IEntryPoint(entryPoint),
            verifier
        );
        console.log("QuantumAccountFactory deployed to:", address(factory));

        // 5. Skip Paymaster for now (EntryPoint not available on this network)
        // HackathonPaymaster paymaster = new HackathonPaymaster(
        //     IEntryPoint(entryPoint),
        //     deployer // owner
        // );
        // console.log("HackathonPaymaster deployed to:", address(paymaster));

        vm.stopBroadcast();

        // Write addresses to file
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("QUANTUM_REGISTRY=", address(registry));
        console.log("QUANTUM_ACCOUNT_FACTORY=", address(factory));
        console.log("GROTH16_VERIFIER=", address(verifier));
        console.log("ENTRYPOINT=", entryPoint);
        console.log("================================");
    }
}
