// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";

library TransferHelper {
    function safeTransfer(
        IERC20Minimal token,
        address to,
        uint256 value
    ) internal {
        (bool success, bytes memory data) =
            address(token).call(abi.encodeWithSelector(IERC20Minimal.transfer.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TF");
    }

    function safeTransferFrom(
        IERC20Minimal token,
        address from,
        address to,
        uint256 value
    ) internal {
        (bool success, bytes memory data) =
            address(token).call(abi.encodeWithSelector(IERC20Minimal.transferFrom.selector, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "STF");
    }
}
