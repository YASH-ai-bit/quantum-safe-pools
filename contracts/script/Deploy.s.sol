// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

import "forge-std/Script.sol";
import "../src/QuantumSystem.sol";
import "../src/QuantumLiquidityEngine.sol";
import "../src/MockGroth16Verifier.sol";
import "../src/HackathonPaymaster.sol";
import "../src/QuantumHook.sol";
import "../src/QuantumAccount.sol";
import "../src/utils/HookMiner.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
// import interface only to avoid solc version conflict if necessary, but we seem to have local copy or compatible version

/**
 * @title Deploy
 * @dev Re-factored Deployment script for Quantum System Architecture
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with address:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Verifier
        MockGroth16Verifier verifier = new MockGroth16Verifier();
        console.log("Verifier deployed to:", address(verifier));

        // 2. Use Canonical EntryPoint (v0.7)
        address entryPointAddress = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
        
        // 3. Deploy Quantum System (Registry + Factory)
        QuantumSystem system = new QuantumSystem(
            IEntryPoint(entryPointAddress),
            verifier
        );
        console.log("QuantumSystem deployed to:", address(system));

        // 4. Deploy Paymaster
        HackathonPaymaster paymaster = new HackathonPaymaster(
            IEntryPoint(entryPointAddress),
            deployer // owner
        );
        console.log("HackathonPaymaster deployed to:", address(paymaster));

        // 5. Deploy PoolManager
        PoolManager poolManager = new PoolManager(deployer);
        console.log("PoolManager deployed to:", address(poolManager));

        // 6. Deploy QuantumHook (Lightweight Policy Hook)
        // Flags: BEFORE_INITIALIZE | BEFORE_ADD_LIQUIDITY | BEFORE_REMOVE_LIQUIDITY | BEFORE_SWAP
        // 1<<13 | 1<<11 | 1<<9 | 1<<7 = 0x2A80
        uint160 flags = uint160(
            (1 << 13) | // BEFORE_INITIALIZE
            (1 << 11) | // BEFORE_ADD_LIQUIDITY
            (1 << 9)  | // BEFORE_REMOVE_LIQUIDITY
            (1 << 7)    // BEFORE_SWAP
        );
        
        address create2Deployer = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
        (address hookAddress, bytes32 salt) = HookMiner.find(
            create2Deployer,
            flags,
            type(QuantumHook).creationCode,
            abi.encode(IPoolManager(address(poolManager)), system, deployer)
        );
        
        QuantumHook quantumHook = new QuantumHook{salt: salt}(IPoolManager(address(poolManager)), system, deployer);
        require(address(quantumHook) == hookAddress, "Hook address mismatch");
        console.log("QuantumHook deployed to:", address(quantumHook));

        // 7. Deploy QuantumLiquidityEngine (Router + Logic)
        QuantumLiquidityEngine engine = new QuantumLiquidityEngine(IPoolManager(address(poolManager)));
        console.log("QuantumLiquidityEngine deployed to:", address(engine));

        // 8. Wire Up: Whitelist Engine in Hook
        quantumHook.setLiquidityEngine(address(engine));
        console.log("Engine whitelisted in Hook");

        vm.stopBroadcast();

        // Write addresses to console for easy copy
        console.log("\n=== DEPLOYMENT COMPLETE (v2.0.0 Refactor) ===");
        console.log("QUANTUM_SYSTEM=", address(system));
        console.log("GROTH16_VERIFIER=", address(verifier));
        console.log("HACKATHON_PAYMASTER=", address(paymaster));
        console.log("ENTRYPOINT=", entryPointAddress);
        console.log("POOL_MANAGER=", address(poolManager));
        console.log("QUANTUM_HOOK=", address(quantumHook));
        console.log("QUANTUM_LIQUIDITY_ENGINE=", address(engine));
        console.log("=============================================");
    }
}
