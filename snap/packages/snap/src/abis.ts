


export const ROUTER_ABI = [
    "function createPool(address tokenA, address tokenB) external returns (address pool)",
    "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
    "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB)",
    "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)"
];

export const POOL_ABI = [
    "function mint(address to) external returns (uint256 liquidity)",
    "function burn(address to) external returns (uint256 amount0, uint256 amount1)",
    "function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external",
    "function getReserves() external view returns (uint256 reserve0, uint256 reserve1)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)"
];

export const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)"
];
