// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {QuantumAMMFactory} from "../src/QuantumAMMFactory.sol";
import {QuantumAMMRouter} from "../src/QuantumAMMRouter.sol";
import {QuantumAMMPool} from "../src/QuantumAMMPool.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
    }
}

contract VerifyFlow is Script {
    QuantumAMMFactory factory = QuantumAMMFactory(0xE5acFcC6bf0BB0f64204775526E033C76d2130a9);
    QuantumAMMRouter router = QuantumAMMRouter(payable(0xA9ebc6aEfe13D9e93BcBA94aFE54E513bB730722));

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock Tokens
        MockToken tokenA = new MockToken("Token A", "TKA");
        MockToken tokenB = new MockToken("Token B", "TKB");
        console.log("Token A deployed at:", address(tokenA));
        console.log("Token B deployed at:", address(tokenB));

        // 2. Create Pool
        console.log("Creating Pool...");
        // Ensure deterministic ordering for output log clarity
        (address t0, address t1) = address(tokenA) < address(tokenB) ? (address(tokenA), address(tokenB)) : (address(tokenB), address(tokenA));
        
        address pool = factory.createPool(address(tokenA), address(tokenB));
        console.log("Pool created at:", pool);

        require(pool != address(0), "Pool creation failed");

        // 3. Add Liquidity
        console.log("Approving Router...");
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);

        console.log("Adding Liquidity...");
        uint256 amountA = 1000 * 10**18;
        uint256 amountB = 1000 * 10**18;
        
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            amountA,
            amountB,
            0,
            0,
            deployer,
            block.timestamp + 1200
        );
        console.log("Liquidity Added!");

        // 4. Swap
        console.log("Swapping...");
        uint256 swapAmount = 10 * 10**18;
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        router.swapExactTokensForTokens(
            swapAmount,
            0,
            path,
            deployer,
            block.timestamp + 1200
        );
        console.log("Swap Successful!");

        vm.stopBroadcast();
    }
}
