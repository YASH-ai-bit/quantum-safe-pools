// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {QuantumSystem} from "../src/QuantumSystem.sol";
import {MockGroth16Verifier} from "../src/MockGroth16Verifier.sol";
import {QuantumAMMFactory} from "../src/QuantumAMMFactory.sol";
import {QuantumAMMRouter} from "../src/QuantumAMMRouter.sol";
import {IEntryPoint} from "../src/interfaces/IEntryPoint.sol";
import {IGroth16Verifier} from "../src/interfaces/IGroth16Verifier.sol";

contract DeployQuantum is Script {
    // Standard ERC-4337 EntryPoint v0.7 address
    address constant ENTRY_POINT = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    // WETH on Sepolia (or use a mock if needed)
    address constant WETH_SEPOLIA = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14; 

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Verifier
        MockGroth16Verifier verifier = new MockGroth16Verifier();
        console.log("MockGroth16Verifier deployed at:", address(verifier));

        // 2. Deploy QuantumSystem
        QuantumSystem system = new QuantumSystem(IEntryPoint(ENTRY_POINT), IGroth16Verifier(address(verifier)));
        console.log("QuantumSystem deployed at:", address(system));

        // 3. Deploy Factory
        QuantumAMMFactory factory = new QuantumAMMFactory(address(system));
        console.log("QuantumAMMFactory deployed at:", address(factory));

        // 4. Deploy Router
        QuantumAMMRouter router = new QuantumAMMRouter(address(factory), WETH_SEPOLIA);
        console.log("QuantumAMMRouter deployed at:", address(router));

        vm.stopBroadcast();
    }
}
