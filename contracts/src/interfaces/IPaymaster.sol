// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./PackedUserOperation.sol";

/**
 * @dev Minimal IPaymaster interface for ERC-4337 v0.7
 */
interface IPaymaster {
    enum PostOpMode {
        opSucceeded, // User operation succeeded
        opReverted,  // User operation reverted
        postOpReverted // PostOp reverted (only if postOpCalled was true during validation)
    }

    /**
     * Validate a user operation and determine if the paymaster will pay for it.
     * @param userOp - The user operation.
     * @param userOpHash - Hash of the user operation.
     * @param maxCost - Maximum cost of the user operation.
     * @return context - Context to be passed to postOp.
     * @return validationData - Same as validateUserOp return value.
     */
    function validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context, uint256 validationData);

    /**
     * Post-operation handler.
     * @param mode - PostOpMode enum value.
     * @param context - Context value from validatePaymasterUserOp.
     * @param actualGasCost - Actual gas cost of the user operation.
     * @param actualUserOpFeePerGas - Actual fee per gas.
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) external;
}
