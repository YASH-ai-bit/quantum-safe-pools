// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";

/**
 * @title HackathonPaymaster
 * @dev Simple paymaster that sponsors gas for quantum-safe accounts
 * @notice For hackathon/testnet use - sponsors up to 50M gas per account
 */
contract HackathonPaymaster is BasePaymaster {
    // Max gas sponsored per account
    uint256 public constant MAX_GAS_PER_ACCOUNT = 50_000_000;

    // Track gas used by each account
    mapping(address => uint256) public sponsoredGas;

    event GasSponsored(address indexed account, uint256 gasAmount);

    constructor(IEntryPoint _entryPoint, address _owner) BasePaymaster(_entryPoint, _owner) {}

    /**
     * @dev Validate the paymaster user operation
     * @param userOp The user operation
     * @param maxCost Maximum cost that could be paid
     * @return context Context for postOp (not used)
     * @return validationData 0 if valid
     */
    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32,
        uint256 maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        address account = userOp.sender;

        // Check if account hasn't exceeded gas limit
        require(
            sponsoredGas[account] + maxCost <= MAX_GAS_PER_ACCOUNT,
            "Gas limit exceeded"
        );

        // Track the gas
        sponsoredGas[account] += maxCost;

        emit GasSponsored(account, maxCost);

        return ("", 0); // Valid
    }

    /**
     * @dev Post-operation handler (not used for now)
     */
    function _postOp(
        PostOpMode,
        bytes calldata,
        uint256,
        uint256
    ) internal override {}
}
