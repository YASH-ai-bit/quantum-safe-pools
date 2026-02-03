// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @dev Packed UserOperation struct for ERC-4337 v0.7
 * This is the packed format used by EntryPoint v0.7
 */
struct PackedUserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    bytes32 accountGasLimits;
    uint256 preVerificationGas;
    bytes32 gasFees;
    bytes paymasterAndData;
    bytes signature;
}
