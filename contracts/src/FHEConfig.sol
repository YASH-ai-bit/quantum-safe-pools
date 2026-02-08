// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/Impl.sol";

/**
 * @title FHEConfig
 * @notice Configuration library for Zama fhEVM coprocessor addresses on different networks
 * @dev Provides network-specific CoprocessorConfig structs for fhEVM initialization
 * 
 * NOTE: These addresses are from Zama's official fhEVM library (ZamaConfig.sol)
 * They are deployed and maintained by Zama on Sepolia testnet (ChainID: 11155111)
 */
library FHEConfig {
    /**
     * @notice Returns the Zama fhEVM coprocessor configuration for Sepolia testnet
     * @dev Addresses sourced from fhevm/library-solidity/config/ZamaConfig.sol
     * @return CoprocessorConfig struct with ACL, Executor (Coprocessor), and KMS Verifier addresses
     * 
     * Contract Addresses (Sepolia - from Zama's official library):
     * - ACL: Access Control List for encrypted data permissions
     * - Coprocessor (Executor): FHE computation executor  
     * - KMS Verifier: Key Management System verifier for decryption
     */
    function sepoliaConfig() internal pure returns (CoprocessorConfig memory) {
        return CoprocessorConfig({
            ACLAddress: 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D,
            CoprocessorAddress: 0x92C920834Ec8941d2C77D188936E1f7A6f49c127,
            KMSVerifierAddress: 0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A
        });
    }

    /**
     * @notice Returns the Zama protocol ID for Sepolia
     * @dev Protocol ID is 10001 for Sepolia (10000 + Ethereum mainnet protocol id)
     */
    function sepoliaProtocolId() internal pure returns (uint256) {
        return 10001;
    }

    /**
     * @notice Returns the Gateway contract address for Sepolia
     * @dev Gateway handles async decryption requests via KMS
     * Official Zama Gateway address on Sepolia testnet
     */
    function sepoliaGateway() internal pure returns (address) {
        return 0x33347831500F1e73F0253F8f6B4e33aa4fBb17E9;
    }
}

