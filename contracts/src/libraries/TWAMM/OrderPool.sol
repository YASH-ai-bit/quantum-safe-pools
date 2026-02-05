// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import {FixedPoint96} from "@uniswap/v4-core/src/libraries/FixedPoint96.sol";

library OrderPool {
    struct State {
        uint256 sellRateCurrent;
        uint256 earningsFactorCurrent;
        mapping(uint256 => uint256) sellRateEndingAtInterval;
        mapping(uint256 => uint256) earningsFactorAtInterval;
    }

    function advanceToInterval(State storage self, uint256 timestamp, uint256 earningsFactor) internal {
        unchecked {
            self.earningsFactorCurrent += earningsFactor;
            self.earningsFactorAtInterval[timestamp] = self.earningsFactorCurrent;
            self.sellRateCurrent -= self.sellRateEndingAtInterval[timestamp];
        }
    }

    function advanceToCurrentTime(State storage self, uint256 earningsFactor) internal {
        unchecked {
            self.earningsFactorCurrent += earningsFactor;
        }
    }
}
