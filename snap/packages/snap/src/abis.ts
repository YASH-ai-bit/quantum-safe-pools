
export const ROUTER_ABI = [
    "function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external returns (int256 delta)",
    "function modifyLiquidity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external returns (int256 delta)",
    "function submitOrder(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(address owner, uint256 expiration, bool zeroForOne) orderKey, uint256 amountIn) external returns (bytes32 orderId)"
];

export const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)"
];
