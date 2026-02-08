// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockGatewayCaller
 * @notice Mock implementation of FHE Gateway for compilation
 * @dev This is a TEMPORARY mock. Replace with real fhevm library before production use.
 */

abstract contract GatewayCaller {
    // Mock gateway address
    address internal constant GATEWAY_CONTRACT = address(0x1234567890123456789012345678901234567890);

    // Events
    event GatewayCall(uint256 indexed requestId, bytes encryptedData);
    event GatewayResponse(uint256 indexed requestId, bytes decryptedData);

    // Request counter
    uint256 internal _requestCounter;

    /**
     * @notice Request decryption from gateway (mock)
     */
    function requestDecryption(
        bytes memory encryptedData,
        bytes4 callbackSelector,
        uint256 callbackGasLimit
    ) internal returns (uint256 requestId) {
        requestId = ++_requestCounter;
        emit GatewayCall(requestId, encryptedData);
        
        // In a real implementation, this would:
        // 1. Send encrypted data to off-chain gateway
        // 2. Gateway decrypts with network private key
        // 3. Gateway calls back with decrypted result
        
        return requestId;
    }

    /**
     * @notice Callback function (must be implemented by inheriting contract)
     */
    function _gatewayCallback(uint256 requestId, bytes memory decryptedData) internal virtual;

    /**
     * @notice Mock gateway response
     */
    function mockGatewayResponse(uint256 requestId, bytes memory decryptedData) external {
        require(msg.sender == GATEWAY_CONTRACT || msg.sender == address(this), "Only gateway");
        emit GatewayResponse(requestId, decryptedData);
        _gatewayCallback(requestId, decryptedData);
    }
}
