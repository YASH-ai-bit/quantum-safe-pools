// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/QuantumAMMHybridFHE.sol";

/**
 * @title DeployUSDCPYUSD
 * @notice Deploy pool with Official Sepolia USDC + Official PYUSD
 */
contract DeployUSDCPYUSD is Script {
    // Official Sepolia tokens
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant PYUSD = 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("QUANTUM POOLS - OFFICIAL USDC/PYUSD DEPLOYMENT");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Network: Sepolia Testnet");
        console.log("FHE: REAL Zama fhEVM v0.5.0");
        console.log("==============================================\n");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy pool with official tokens
        console.log("Deploying QuantumAMMHybridFHE with official tokens...");
        console.log("  Token0 (Official USDC):", USDC);
        console.log("  Token1 (Official PYUSD):", PYUSD);
        
        QuantumAMMHybridFHE pool = new QuantumAMMHybridFHE(
            USDC,
            PYUSD,
            address(0x1) // Placeholder
        );
        
        console.log("\n  Pool Deployed:", address(pool));
        console.log("  FHE Coprocessor: 0x92C920834Ec8941d2C77D188936E1f7A6f49c127");
        console.log("  ACL: 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D\n");
        
        vm.stopBroadcast();
        
        console.log("==============================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("==============================================");
        console.log("Official USDC:", USDC);
        console.log("Official PYUSD:", PYUSD);
        console.log("USDC/PYUSD Pool:", address(pool));
        console.log("==============================================\n");
    }
}
