// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./PackedUserOperation.sol";

/**
 * @dev Minimal IAccount interface for ERC-4337 v0.7
 */
interface IAccount {
    /**
     * Validate user's signature and nonce.
     * @param userOp - The operation that is about to be executed.
     * @param userOpHash - Hash of the user's request data.
     * @param missingAccountFunds - Missing funds on the account's deposit in the entrypoint.
     * @return validationData - Packaged ValidationData structure.
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
}
