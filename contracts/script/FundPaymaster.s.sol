// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

interface IEntryPoint {
    function depositTo(address account) external payable;
}

contract FundPaymaster is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address paymaster = 0x71877B35abc4D002Ffe6eCc32E7c02FEbBc9FC96;
        address entryPoint = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

        vm.startBroadcast(deployerPrivateKey);
        
        // Deposit 0.05 ETH to the EntryPoint for the Paymaster
        IEntryPoint(entryPoint).depositTo{value: 0.05 ether}(paymaster);
        
        console.log("Deposited 0.05 ETH to EntryPoint for Paymaster:", paymaster);
        vm.stopBroadcast();
    }
}
