// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

interface ITWAMM {
    struct OrderKey {
        address owner;
        uint256 expiration;
        bool zeroForOne;
    }

    struct Order {
        uint256 sellRate;
        uint256 earningsFactorLast;
    }

    event SubmitOrder(
        PoolId indexed poolId,
        address indexed owner,
        uint256 expiration,
        bool zeroForOne,
        uint256 sellRate,
        uint256 earningsFactorLast
    );

    event UpdateOrder(
        PoolId indexed poolId,
        address indexed owner,
        uint256 expiration,
        bool zeroForOne,
        uint256 newSellRate,
        uint256 newEarningsFactorLast
    );

    error NotInitialized();
    error MustBeOwner(address owner, address sender);
    error ExpirationLessThanBlocktime(uint256 expiration);
    error SellRateCannotBeZero();
    error ExpirationNotOnInterval(uint256 expiration);
    error OrderAlreadyExists(OrderKey key);
    error OrderDoesNotExist(OrderKey key);
    error CannotModifyCompletedOrder(OrderKey key);
    error InvalidAmountDelta(OrderKey key, uint256 unsoldAmount, int256 amountDelta);

    function expirationInterval() external view returns (uint256);
    
    function executeTWAMMOrders(PoolKey memory key) external;

    function submitOrder(PoolKey calldata key, OrderKey memory orderKey, uint256 amountIn)
        external
        returns (bytes32 orderId);

    function updateOrder(PoolKey memory key, OrderKey memory orderKey, int256 amountDelta)
        external
        returns (uint256 tokens0Owed, uint256 tokens1Owed);

    function claimTokens(Currency token, address to, uint256 amountRequested)
        external
        returns (uint256 amountTransferred);
}
