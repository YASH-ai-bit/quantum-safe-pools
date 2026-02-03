// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./PackedUserOperation.sol";

/**
 * @dev Minimal IEntryPoint interface for ERC-4337 v0.7
 */
interface IEntryPoint {
    /**
     * Execute a batch of UserOperations.
     * @param ops - The operations to execute.
     * @param beneficiary - The address to receive the fees.
     */
    function handleOps(
        PackedUserOperation[] calldata ops,
        address payable beneficiary
    ) external;

    /**
     * Get the nonce for a sender at a specific key.
     * @param sender - The sender address.
     * @param key - The nonce key.
     * @return nonce - The current nonce.
     */
    function getNonce(address sender, uint192 key) external view returns (uint256 nonce);

    /**
     * Get the deposit balance of an account.
     * @param account - The account address.
     * @return - The deposit balance.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * Add a deposit to an account.
     * @param account - The account to deposit to.
     */
    function depositTo(address account) external payable;

    /**
     * Get the hash of a UserOperation.
     * @param userOp - The UserOperation.
     * @return - The hash.
     */
    function getUserOpHash(PackedUserOperation calldata userOp) external view returns (bytes32);
}
