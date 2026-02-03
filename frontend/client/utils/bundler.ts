import { BUNDLER_URLS, CONTRACTS } from "@shared/contracts";

/**
 * Convert a value to proper hex string format for bundler
 * Bundlers require all numeric fields to be hex strings with 0x prefix
 */
// Helper for hex conversion
function toHex(value: bigint | number | string): string {
  if (value === undefined || value === null) return "0x0";
  if (typeof value === "string" && value.startsWith("0x")) return value;
  return "0x" + BigInt(value).toString(16);
}

export async function submitUserOpToBundler(
  userOp: any,
  chainId: number,
): Promise<string> {
  const bundlerUrl =
    chainId === 11155111 ? BUNDLER_URLS.SEPOLIA : BUNDLER_URLS.LOCAL;

  console.log(
    "%c[BUNDLER] Submitting UserOp to bundler...",
    "color: #00ffff; font-weight: bold;",
  );
  console.log("%c[BUNDLER] Bundler URL:", "color: #00ffff;", bundlerUrl);

  // Convert PackedUserOperation (Solidity/Snap format) to JSON UserOperation v0.7 (Bundler format)
  let jsonUserOp = userOp;

  // Check if it looks like a PackedUserOperation
  if (userOp.accountGasLimits && userOp.gasFees) {
    console.log(
      "%c[BUNDLER] Detected PackedUserOperation, converting to JSON v0.7...",
      "color: #ffff00;",
    );

    // unpacking gas limits
    const accountGasLimits = userOp.accountGasLimits.startsWith("0x")
      ? userOp.accountGasLimits.slice(2)
      : userOp.accountGasLimits;
    const verificationGasLimit = BigInt("0x" + accountGasLimits.slice(0, 32));
    const callGasLimit = BigInt("0x" + accountGasLimits.slice(32));

    // unpacking gas fees
    const gasFees = userOp.gasFees.startsWith("0x")
      ? userOp.gasFees.slice(2)
      : userOp.gasFees;
    const maxPriorityFeePerGas = BigInt("0x" + gasFees.slice(0, 32));
    const maxFeePerGas = BigInt("0x" + gasFees.slice(32));

    // Handle factory/factoryData
    let factory = undefined;
    let factoryData = undefined;
    if (
      userOp.initCode &&
      userOp.initCode !== "0x" &&
      userOp.initCode.length > 2
    ) {
      factory = "0x" + userOp.initCode.slice(2, 42);
      factoryData = "0x" + userOp.initCode.slice(42);
    }

    // Handle paymaster
    let paymaster = undefined;
    let paymasterData = undefined;
    if (
      userOp.paymasterAndData &&
      userOp.paymasterAndData !== "0x" &&
      userOp.paymasterAndData.length > 2
    ) {
      paymaster = "0x" + userOp.paymasterAndData.slice(2, 42);
      paymasterData = "0x" + userOp.paymasterAndData.slice(42);
    }

    jsonUserOp = {
      sender: userOp.sender,
      nonce: toHex(userOp.nonce),

      ...(factory ? { factory, factoryData } : {}),

      callData: userOp.callData,

      callGasLimit: toHex(callGasLimit),
      verificationGasLimit: toHex(verificationGasLimit),
      preVerificationGas: toHex(userOp.preVerificationGas),

      maxFeePerGas: toHex(maxFeePerGas),
      maxPriorityFeePerGas: toHex(maxPriorityFeePerGas),

      ...(paymaster ? { paymaster, paymasterData } : {}),

      signature: userOp.signature,
    };
  }

  console.log("%c[BUNDLER] UserOp to send:", "color: #00ffff;", jsonUserOp);

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_sendUserOperation",
    params: [jsonUserOp, "0x0000000071727De22E5E9d8BAf0edAc6f37da032"],
  };

  try {
    const response = await fetch(bundlerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    console.log(
      "%c[BUNDLER] Full Response:",
      "color: #00ffff;",
      JSON.stringify(result, null, 2),
    );

    if (result.error) {
      console.error(
        "%c[BUNDLER] Bundler error:",
        "color: #ff0000;",
        result.error,
      );
      // Log the full error object for debugging
      console.error("%c[BUNDLER] Error details:", "color: #ff0000;", {
        code: result.error.code,
        message: result.error.message,
        data: result.error.data,
      });
      throw new Error(
        `Bundler error: ${result.error.message || JSON.stringify(result.error)}`,
      );
    }

    if (!result.result) {
      throw new Error("Bundler did not return a userOpHash");
    }

    console.log(
      "%c[BUNDLER] ✅ UserOp submitted successfully!",
      "color: #00ff00; font-weight: bold;",
    );
    console.log("%c[BUNDLER] UserOpHash:", "color: #00ff00;", result.result);

    return result.result;
  } catch (error: any) {
    console.error(
      "%c[BUNDLER] ❌ Failed to submit UserOp:",
      "color: #ff0000; font-weight: bold;",
      error,
    );
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
  maxAttempts: number = 60,
): Promise<any> {
  const bundlerUrl =
    chainId === 11155111 ? BUNDLER_URLS.SEPOLIA : BUNDLER_URLS.LOCAL;

  console.log(
    "%c[BUNDLER] Waiting for UserOp receipt...",
    "color: #00ffff; font-weight: bold;",
  );
  console.log("%c[BUNDLER] UserOpHash:", "color: #00ffff;", userOpHash);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(bundlerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getUserOperationReceipt",
          params: [userOpHash],
        }),
      });

      const result = await response.json();

      if (result.result) {
        console.log(
          "%c[BUNDLER] ✅ UserOp included in block!",
          "color: #00ff00; font-weight: bold;",
        );
        console.log("%c[BUNDLER] Receipt:", "color: #00ff00;", result.result);
        return result.result;
      }

      // Log progress every 5 attempts
      if (i > 0 && i % 5 === 0) {
        console.log(
          `%c[BUNDLER] Still waiting... (attempt ${i}/${maxAttempts})`,
          "color: #ffff00;",
        );
      }

      // Wait 2 seconds before next attempt
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.warn(`[BUNDLER] Attempt ${i + 1}/${maxAttempts} failed:`, error);
    }
  }

  throw new Error("UserOp receipt not found after maximum attempts");
}
