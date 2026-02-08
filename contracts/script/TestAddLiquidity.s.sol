// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/QuantumAMMHybridFHE.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestAddLiquidity
 * @notice Test adding liquidity to deployed USDC/PYUSD pool
 * @dev This is for testing only - production requires proper FHE encryption
 */
contract TestAddLiquidity is Script {
    address constant POOL = 0x9b3353b8Eb1B391C482957bD8a4EA4083c5c4e15;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant PYUSD = 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("TEST ADD LIQUIDITY - USDC/PYUSD POOL");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("Pool:", POOL);
        console.log("");
        
        // Check balances
        uint256 usdcBalance = IERC20(USDC).balanceOf(deployer);
        uint256 pyusdBalance = IERC20(PYUSD).balanceOf(deployer);
        
        console.log("USDC Balance:", usdcBalance);
        console.log("PYUSD Balance:", pyusdBalance);
        console.log("");
        
        require(usdcBalance > 0, "No USDC - get from faucet!");
        require(pyusdBalance > 0, "No PYUSD - get from faucet!");
        
        // Use smaller amounts for testing (assuming 6 decimals)
        uint64 amount0 = uint64(usdcBalance > 100000 ? 100000 : usdcBalance / 2); // 0.1 USDC
        uint64 amount1 = uint64(pyusdBalance > 100000 ? 100000 : pyusdBalance / 2); // 0.1 PYUSD
        
        console.log("Adding liquidity:");
        console.log("  USDC:", amount0);
        console.log("  PYUSD:", amount1);
        console.log("");
        
        // Check/set approvals
        uint256 usdcAllowance = IERC20(USDC).allowance(deployer, POOL);
        uint256 pyusdAllowance = IERC20(PYUSD).allowance(deployer, POOL);
        
        if (usdcAllowance < amount0) {
            console.log("Approving USDC...");
            IERC20(USDC).approve(POOL, type(uint256).max);
        }
        
        if (pyusdAllowance < amount1) {
            console.log("Approving PYUSD...");
            IERC20(PYUSD).approve(POOL, type(uint256).max);
        }
        
        console.log("");
        console.log("==============================================");
        console.log("NOTE: This pool requires FHE encryption!");
        console.log("==============================================");
        console.log("To add liquidity, you need to:");
        console.log("1. Use fhevmjs to encrypt amounts");
        console.log("2. Generate ZK proof for encrypted inputs");
        console.log("3. Call addLiquidity with:");
        console.log("   - encryptedAmount0 (encrypted USDC)");
        console.log("   - encryptedAmount1 (encrypted PYUSD)");
        console.log("   - inputProof (ZK proof)");
        console.log("   - amount0 (plaintext for transfer)");
        console.log("   - amount1 (plaintext for transfer)");
        console.log("");
        console.log("Use the frontend to add liquidity properly!");
        console.log("Or integrate fhevmjs in your script.");
        console.log("==============================================");
        
        vm.stopBroadcast();
    }
}
