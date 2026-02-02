// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/IGroth16Verifier.sol";

/**
 * @title MockGroth16Verifier
 * @dev Mock verifier that always returns true for hackathon demo
 * @notice WARNING: This is NOT cryptographically secure - for demo only!
 * @notice Production version will use real Noir-generated verifier
 */
contract MockGroth16Verifier is IGroth16Verifier {
    event ProofVerified(bytes proof, bytes32[] publicInputs, bool result);

    /**
     * @dev Mock verification that always returns true
     * @param proof The zkSNARK proof (ignored in mock)
     * @param publicInputs Public inputs (ignored in mock)
     * @return true (always)
     */
    function verify(
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external view override returns (bool) {
        // Log for transparency in demo
        // In real version, this would perform actual Groth16 pairing checks
        
        // For demo purposes, we just validate that the proof and inputs have reasonable sizes
        require(proof.length > 0, "Empty proof");
        require(publicInputs.length == 2, "Expected 2 public inputs");
        
        // Mock: always return true
        // Real implementation would call Groth16 pairing check here
        return true;
    }
}
