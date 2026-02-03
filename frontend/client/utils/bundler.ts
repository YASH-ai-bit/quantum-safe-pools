import { BUNDLER_URLS, CONTRACTS } from '@shared/contracts';

/**
 * Convert a value to proper hex string format for bundler
 * Bundlers require all numeric fields to be hex strings with 0x prefix
 */
function toHex(value: string | number | bigint): string {
    if (typeof value === 'string') {
        // Already has 0x prefix
        if (value.startsWith('0x')) {
            return value;
        }
        // Numeric string without 0x
        const num = BigInt(value);
        return '0x' + num.toString(16);
    }
    if (typeof value === 'bigint') {
        return '0x' + value.toString(16);
    }
    if (typeof value === 'number') {
        return '0x' + value.toString(16);
    }
    return '0x0';
}

/**
 * Unpack a v0.7 PackedUserOperation to v0.6 format for bundlers
 * v0.7 uses packed fields (accountGasLimits, gasFees)
 * v0.6 uses individual fields (callGasLimit, verificationGasLimit, maxFeePerGas, maxPriorityFeePerGas)
 * 
 * IMPORTANT: All numeric fields must be hex strings with 0x prefix!
 */
function unpackUserOp(packedUserOp: any): any {
    // Parse accountGasLimits (bytes32): verificationGasLimit (16 bytes) + callGasLimit (16 bytes)
    let verificationGasLimit = '0x0';
    let callGasLimit = '0x0';

    if (packedUserOp.accountGasLimits && packedUserOp.accountGasLimits.length === 66) {
        // Remove 0x prefix, split into two 32-char (16 byte) portions
        const gasLimitsHex = packedUserOp.accountGasLimits.slice(2);
        const verificationHex = gasLimitsHex.slice(0, 32).replace(/^0+/, '');
        const callHex = gasLimitsHex.slice(32, 64).replace(/^0+/, '');
        verificationGasLimit = '0x' + (verificationHex || '0');
        callGasLimit = '0x' + (callHex || '0');
    }

    // Parse gasFees (bytes32): maxPriorityFeePerGas (16 bytes) + maxFeePerGas (16 bytes)
    let maxPriorityFeePerGas = '0x0';
    let maxFeePerGas = '0x0';

    if (packedUserOp.gasFees && packedUserOp.gasFees.length === 66) {
        const gasFeesHex = packedUserOp.gasFees.slice(2);
        const priorityHex = gasFeesHex.slice(0, 32).replace(/^0+/, '');
        const maxHex = gasFeesHex.slice(32, 64).replace(/^0+/, '');
        maxPriorityFeePerGas = '0x' + (priorityHex || '0');
        maxFeePerGas = '0x' + (maxHex || '0');
    }

    // Convert nonce to hex (this was the bug - '0' instead of '0x0')
    const nonce = toHex(packedUserOp.nonce || 0);

    // Convert preVerificationGas to hex
    const preVerificationGas = toHex(packedUserOp.preVerificationGas || 0);

    // Convert to v0.6 unpacked format with proper hex formatting
    const unpackedUserOp = {
        sender: packedUserOp.sender,
        nonce,
        initCode: packedUserOp.initCode || '0x',
        callData: packedUserOp.callData,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData: packedUserOp.paymasterAndData || '0x',
        signature: packedUserOp.signature || '0x',
    };

    console.log('%c[BUNDLER] Formatted UserOp fields:', 'color: #00ffff;', {
        nonce: unpackedUserOp.nonce,
        callGasLimit: unpackedUserOp.callGasLimit,
        verificationGasLimit: unpackedUserOp.verificationGasLimit,
        preVerificationGas: unpackedUserOp.preVerificationGas,
        maxFeePerGas: unpackedUserOp.maxFeePerGas,
        maxPriorityFeePerGas: unpackedUserOp.maxPriorityFeePerGas,
    });

    return unpackedUserOp;
}

/**
 * Submit a UserOperation to the bundler
 * @param userOp The packed user operation from the snap
 * @param chainId The chain ID (11155111 for Sepolia)
 * @returns The userOpHash from the bundler
 */
export async function submitUserOpToBundler(userOp: any, chainId: number): Promise<string> {
    const bundlerUrl = chainId === 11155111 ? BUNDLER_URLS.SEPOLIA : BUNDLER_URLS.LOCAL;

    console.log('%c[BUNDLER] Submitting UserOp to bundler...', 'color: #00ffff; font-weight: bold;');
    console.log('%c[BUNDLER] Bundler URL:', 'color: #00ffff;', bundlerUrl);
    console.log('%c[BUNDLER] EntryPoint:', 'color: #00ffff;', CONTRACTS.ENTRYPOINT);

    // Convert packed v0.7 format to unpacked v0.6 format with proper hex formatting
    const unpackedUserOp = unpackUserOp(userOp);

    console.log('%c[BUNDLER] Unpacked UserOp:', 'color: #00ffff;', unpackedUserOp);

    try {
        const response = await fetch(bundlerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_sendUserOperation',
                params: [
                    unpackedUserOp,
                    CONTRACTS.ENTRYPOINT,
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('%c[BUNDLER] HTTP Error response:', 'color: #ff0000;', errorText);
            throw new Error(`Bundler HTTP error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();

        console.log('%c[BUNDLER] Response:', 'color: #00ffff;', result);

        if (result.error) {
            console.error('%c[BUNDLER] Bundler error:', 'color: #ff0000;', result.error);
            throw new Error(`Bundler error: ${result.error.message || JSON.stringify(result.error)}`);
        }

        if (!result.result) {
            throw new Error('Bundler did not return a userOpHash');
        }

        console.log('%c[BUNDLER] ✅ UserOp submitted successfully!', 'color: #00ff00; font-weight: bold;');
        console.log('%c[BUNDLER] UserOpHash:', 'color: #00ff00;', result.result);

        return result.result;
    } catch (error: any) {
        console.error('%c[BUNDLER] ❌ Failed to submit UserOp:', 'color: #ff0000; font-weight: bold;', error);
        throw new Error(`Failed to submit to bundler: ${error.message}`);
    }
}

/**
 * Wait for a UserOperation to be included in a block
 * @param userOpHash The hash of the user operation
 * @param chainId The chain ID
 * @param maxAttempts Maximum number of polling attempts
 * @returns The transaction receipt
 */
export async function waitForUserOpReceipt(
    userOpHash: string,
    chainId: number,
    maxAttempts: number = 60
): Promise<any> {
    const bundlerUrl = chainId === 11155111 ? BUNDLER_URLS.SEPOLIA : BUNDLER_URLS.LOCAL;

    console.log('%c[BUNDLER] Waiting for UserOp receipt...', 'color: #00ffff; font-weight: bold;');
    console.log('%c[BUNDLER] UserOpHash:', 'color: #00ffff;', userOpHash);

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(bundlerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_getUserOperationReceipt',
                    params: [userOpHash],
                }),
            });

            const result = await response.json();

            if (result.result) {
                console.log('%c[BUNDLER] ✅ UserOp included in block!', 'color: #00ff00; font-weight: bold;');
                console.log('%c[BUNDLER] Receipt:', 'color: #00ff00;', result.result);
                return result.result;
            }

            // Log progress every 5 attempts
            if (i > 0 && i % 5 === 0) {
                console.log(`%c[BUNDLER] Still waiting... (attempt ${i}/${maxAttempts})`, 'color: #ffff00;');
            }

            // Wait 2 seconds before next attempt
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.warn(`[BUNDLER] Attempt ${i + 1}/${maxAttempts} failed:`, error);
        }
    }

    throw new Error('UserOp receipt not found after maximum attempts');
}
