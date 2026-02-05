// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../src/HackathonPaymaster.sol";

contract FundPaymaster is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Address of the deployed paymaster
        address payable paymasterAddress = payable(0x2e2bCA633E42B798Fe2F419C720F9Ce30Ca5A816);
        
        console.log("Funding Paymaster at:", paymasterAddress);
        console.log("From account:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Call deposit() on the paymaster with 0.05 ETH
        // This forwards the ETH to the EntryPoint's deposit for the paymaster
        HackathonPaymaster(paymasterAddress).deposit{value: 0.05 ether}();
        
        console.log("Deposited 0.05 ETH to Paymaster via EntryPoint");

        vm.stopBroadcast();
    }
}
