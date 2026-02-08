// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/QuantumAMMHybridFHE.sol";
import "../src/MockERC20.sol";

/**
 * @title DeployHybridFHESimple
 * @notice Simplified deployment - only deploys pool with mock tokens
 */
contract DeployHybridFHESimple is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("QUANTUM POOLS - HYBRID FHE DEPLOYMENT (SIMPLE)");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Network: Sepolia Testnet");
        console.log("FHE: REAL Zama fhEVM v0.5.0");
        console.log("==============================================\n");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy mock tokens
        console.log("Step 1: Deploying mock ERC20 tokens...");
        
        MockERC20 token0 = new MockERC20("Mock USDC", "USDC", 6);
        console.log("  Token0 (USDC):", address(token0));
        
        MockERC20 token1 = new MockERC20("Mock DAI", "DAI", 18);
        console.log("  Token1 (DAI):", address(token1));
        
        // Mint tokens
        token0.mint(deployer, 1_000_000 * 10**6);
        token1.mint(deployer, 1_000_000 * 10**18);
        console.log("  Minted 1M tokens each\n");
        
        // Deploy pool (quantumSystem address as placeholder)
        console.log("Step 2: Deploying QuantumAMMHybridFHE...");
        
        QuantumAMMHybridFHE pool = new QuantumAMMHybridFHE(
            address(token0),
            address(token1),
            address(0x1) // Placeholder address
        );
        
        console.log("  Pool:", address(pool));
        console.log("  FHE Coprocessor: 0x92C920834Ec8941d2C77D188936E1f7A6f49c127");
        console.log("  ACL: 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D\n");
        
        vm.stopBroadcast();
        
        console.log("==============================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("==============================================");
        console.log("Token0 (USDC):", address(token0));
        console.log("Token1 (DAI):", address(token1));
        console.log("HybridFHE Pool:", address(pool));
        console.log("==============================================\n");
    }
}
