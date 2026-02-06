// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title HookMiner
 * @notice Utility to mine a hook address with specific flags
 */
library HookMiner {
    function find(
        address deployer,
        uint160 flags,
        bytes memory creationCode,
        bytes memory constructorArgs
    ) internal pure returns (address, bytes32) {
        bytes memory bytecode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 salt = bytes32(0);
        uint256 i = 0;
        
        // Loop until we find a salt that produces an address with the desired flags
        // Warning: This can be gas intensive if done on-chain, but okay for scripts/foundry
        while (true) {
            salt = bytes32(i);
            address hookAddress = computeAddress(deployer, salt, bytecode);
            
            // Check if address matches flags
            // We want bits to be set where flags are set
            // And potentially UNSET where flags are not set, but usually just containing flags is enough
            // But V4 spec: "address & ALL_HOOK_FLAGS must equal flags" ?
            // Usually we just need the bits SET. Extra bits are usually ignored or optional.
            // But strict miners check specific mask.
            // Let's enforce that the lowest 14 bits MATCH the flags exactly to be safe.
            // Mask: (1 << 14) - 1 = 16383 (0x3FFF)
            
            if (uint160(hookAddress) & 0x3FFF == flags) {
                return (hookAddress, salt);
            }
            
            i++;
            // Safety break to prevent infinite loop in tests (though unlikely to hit in reasonably scoped mine)
            if (i > 500000) {
                revert("HookMiner: Could not find salt");
            }
        }
        return (address(0), bytes32(0));
    }

    function computeAddress(address deployer, bytes32 salt, bytes memory bytecode) internal pure returns (address) {
        bytes32 bytecodeHash = keccak256(bytecode);
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                deployer,
                salt,
                bytecodeHash
            )
        );
        // Cast to address: last 20 bytes
        return address(uint160(uint256(hash)));
    }
}
