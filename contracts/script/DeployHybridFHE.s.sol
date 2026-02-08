// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/QuantumSystem.sol";
import "../src/QuantumAMMHybridFHE.sol";
import "../src/MockERC20.sol";

/**
 * @title DeployHybridFHE
 * @notice Deployment script for Quantum Pools with REAL Zama FHE
 * @dev Deploys to Sepolia testnet with Zama fhEVM coprocessor
 */
contract DeployHybridFHE is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("QUANTUM POOLS - HYBRID FHE DEPLOYMENT");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Network: Sepolia Testnet");
        console.log("FHE: REAL Zama fhEVM v0.5.0");
        console.log("==============================================\n");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ============ DEPLOY MOCK TOKENS ============
        console.log("Step 1: Deploying mock ERC20 tokens...");
        
        MockERC20 token0 = new MockERC20("Mock USDC", "USDC", 6);
        console.log("  Token0 (USDC):", address(token0));
        
        MockERC20 token1 = new MockERC20("Mock DAI", "DAI", 18);
        console.log("  Token1 (DAI):", address(token1));
        
        // Mint tokens to deployer for testing
        token0.mint(deployer, 1_000_000 * 10**6);  // 1M USDC
        token1.mint(deployer, 1_000_000 * 10**18); // 1M DAI
        console.log("  Minted 1M tokens each to deployer\n");
        
        // ============ DEPLOY QUANTUM SYSTEM ============
        console.log("Step 2: Deploying mock dependencies...");
        
        // For hybrid FHE demo, we don't need full QuantumSystem
        // Just use a simple address placeholder
        address quantumSystemAddr = address(0x1);
        console.log("  QuantumSystem (placeholder):", quantumSystemAddr);
        console.log("  Note: Hybrid FHE pool doesn't require full quantum features\n");
        
        // ============ DEPLOY HYBRID FHE POOL ============
        console.log("Step 3: Deploying QuantumAMMHybridFHE...");
        console.log("  Using REAL Zama FHE coprocessor...");
        
        QuantumAMMHybridFHE pool = new QuantumAMMHybridFHE(
            address(token0),
            address(token1),
            quantumSystemAddr
        );
        
        console.log("  Pool:", address(pool));
        console.log("  FHE Coprocessor: 0x92C920834Ec8941d2C77D188936E1f7A6f49c127");
        console.log("  ACL: 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D");
        console.log("  KMS: 0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A\n");
        
        vm.stopBroadcast();
        
        // ============ DEPLOYMENT SUMMARY ============
        console.log("==============================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("==============================================");
        console.log("Token0 (USDC):", address(token0));
        console.log("Token1 (DAI):", address(token1));
        console.log("QuantumSystem:", quantumSystemAddr);
        console.log("HybridFHE Pool:", address(pool));
        console.log("==============================================\n");
        
        console.log("FHE FEATURES:");
        console.log("  [x] REAL encrypted LP balances");
        console.log("  [x] REAL encrypted user deposits");
        console.log("  [x] REAL encrypted order book");
        console.log("  [x] Plaintext reserves (AMM math limitation)");
        console.log("==============================================\n");
        
        console.log("NEXT STEPS:");
        console.log("1. Approve tokens: token0.approve(pool, amount)");
        console.log("2. Add liquidity: pool.addLiquidity(...)");
        console.log("3. Submit private order: pool.submitPrivateOrder(...)");
        console.log("4. Query encrypted balance: pool.getEncryptedLPBalance(user)");
        console.log("==============================================\n");
        
        // Save deployment addresses to file
        string memory deploymentInfo = string(abi.encodePacked(
            "QUANTUM_POOLS_HYBRID_FHE_DEPLOYMENT\n",
            "====================================\n",
            "Network: Sepolia\n",
            "Deployer: ", vm.toString(deployer), "\n",
            "Token0 (USDC): ", vm.toString(address(token0)), "\n",
            "Token1 (DAI): ", vm.toString(address(token1)), "\n",
            "QuantumSystem: ", vm.toString(quantumSystemAddr), "\n",
            "HybridFHE Pool: ", vm.toString(address(pool)), "\n",
            "\n",
            "FHE Configuration:\n",
            "  Coprocessor: 0x92C920834Ec8941d2C77D188936E1f7A6f49c127\n",
            "  ACL: 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D\n",
            "  KMS Verifier: 0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A\n"
        ));
        
        vm.writeFile("hybrid-fhe-deployment.txt", deploymentInfo);
        console.log("Deployment info saved to: hybrid-fhe-deployment.txt");
    }
}
