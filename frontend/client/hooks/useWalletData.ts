import { useAccount, useBalance, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { sepolia } from 'wagmi/chains';
import { useState, useEffect } from 'react';
import { usePools } from './usePools';
import { useSnap } from './useSnap';
import { CONTRACTS } from '@shared/contracts';

// ERC20 ABI
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

// PoolManager ABI for position queries
const POOL_MANAGER_ABI = [
  {
    name: 'ModifyLiquidity',
    type: 'event',
    inputs: [
      { name: 'id', type: 'bytes32', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'tickLower', type: 'int24', indexed: false },
      { name: 'tickUpper', type: 'int24', indexed: false },
      { name: 'liquidityDelta', type: 'int256', indexed: false },
      { name: 'salt', type: 'bytes32', indexed: false },
    ],
  },
  {
    name: 'getSlot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
      { name: 'hookFee', type: 'uint24' },
    ],
  },
  {
    name: 'getLiquidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: 'liquidity', type: 'uint128' }],
  },
] as const;

interface TokenBalance {
  symbol: string;
  name: string;
  amount: string;
  value: string;
  address: string;
  isLP?: boolean;
  poolId?: string;
}

interface LPPosition {
  poolId: string;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  poolTVL: string;
}

// Sepolia Token Addresses
const SEPOLIA_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const SEPOLIA_PYUSD = '0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9';
const SEPOLIA_LINK = '0x779877A7B0D9E8603169DdbD7836e478b4624789';

export function useWalletData() {
  const { address, isConnected: wagmiConnected } = useAccount();
  const { isConnected: snapConnected } = useSnap();
  const isConnected = snapConnected || wagmiConnected;

  const { pools } = usePools();

  // Use Wagmi hooks for balances (no CORS issues)
  const { data: ethBalanceData } = useBalance({
    address,
    chainId: sepolia.id,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  // USDC Hooks
  const { data: usdcBalanceData } = useReadContract({
    address: SEPOLIA_USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address && isConnected, refetchInterval: 30000 },
  });
  const { data: usdcDecimalsData } = useReadContract({
    address: SEPOLIA_USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: sepolia.id,
    query: { enabled: !!address && isConnected },
  });

  // PYUSD Hooks
  const { data: pyusdBalanceData } = useReadContract({
    address: SEPOLIA_PYUSD as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address && isConnected, refetchInterval: 30000 },
  });

  // LINK Hooks
  const { data: linkBalanceData } = useReadContract({
    address: SEPOLIA_LINK as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address && isConnected, refetchInterval: 30000 },
  });

  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [totalBalance, setTotalBalance] = useState<string>('0.00');
  const [portfolioChange, setPortfolioChange] = useState<string>('0.00');
  const [volume24h, setVolume24h] = useState<string>('0.00');
  const [poolsJoined, setPoolsJoined] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);

  // Prices state
  const [prices, setPrices] = useState<{ [key: string]: number }>({
    ETH: 3200, // Fallback
    LINK: 18.5,
    USDC: 1.0,
    PYUSD: 1.0
  });

  // Fetch prices from CoinGecko
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,chainlink,usd-coin,paypal-usd&vs_currencies=usd');
        if (response.ok) {
          const data = await response.json();
          setPrices({
            ETH: data.ethereum?.usd || 3200,
            LINK: data.chainlink?.usd || 18.5,
            USDC: data['usd-coin']?.usd || 1.0,
            PYUSD: data['paypal-usd']?.usd || 1.0
          });
        }
      } catch (error) {
        console.warn('Failed to fetch prices, using fallback:', error);
      }
    };

    fetchPrices();
    // Only fetch on load, no polling per user request
  }, []);

  // LP positions - simplified for now (would need event fetching via provider)
  useEffect(() => {
    // For now, just count pools user might have positions in
    // In production, would fetch from events via provider
    setLpPositions([]);
    setPoolsJoined(0);
  }, [isConnected, pools.length]);

  // Calculate token balances from Wagmi data (runs only when data changes)
  useEffect(() => {
    if (!address || !isConnected) {
      setTokenBalances([]);
      setTotalBalance('0.00');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const balances: TokenBalance[] = [];

      // Add ETH balance
      const ethValue = ethBalanceData?.value
        ? parseFloat(formatUnits(ethBalanceData.value, 18))
        : 0;
      balances.push({
        symbol: 'ETH',
        name: 'Sepolia ETH',
        amount: ethValue.toFixed(6),
        value: `$${(ethValue * prices.ETH).toFixed(2)}`,
        address: '0x0000000000000000000000000000000000000000',
      });

      // Add USDC
      const usdcDecimals = usdcDecimalsData ? Number(usdcDecimalsData) : 6;
      const usdcValue = usdcBalanceData
        ? parseFloat(formatUnits(usdcBalanceData as bigint, usdcDecimals))
        : 0;
      balances.push({
        symbol: 'USDC',
        name: 'USD Coin',
        amount: usdcValue.toFixed(2),
        value: `$${(usdcValue * prices.USDC).toFixed(2)}`,
        address: SEPOLIA_USDC,
      });

      // Add PYUSD
      const pyusdValue = pyusdBalanceData
        ? parseFloat(formatUnits(pyusdBalanceData as bigint, 6))
        : 0;
      balances.push({
        symbol: 'PYUSD',
        name: 'PayPal USD',
        amount: pyusdValue.toFixed(2),
        value: `$${(pyusdValue * prices.PYUSD).toFixed(2)}`,
        address: SEPOLIA_PYUSD,
      });

      // Add LINK
      const linkValue = linkBalanceData
        ? parseFloat(formatUnits(linkBalanceData as bigint, 18))
        : 0;
      balances.push({
        symbol: 'LINK',
        name: 'Chainlink',
        amount: linkValue.toFixed(4),
        value: `$${(linkValue * prices.LINK).toFixed(2)}`,
        address: SEPOLIA_LINK,
      });

      // Add LP positions as LP tokens
      for (const position of lpPositions) {
        if (position.liquidity > 0n) {
          const pool = pools.find(p => p.id === position.poolId);
          if (pool) {
            // Calculate LP token value based on pool share
            const poolLiquidity = pool.liquidity || 0n;
            const userShare = poolLiquidity > 0n
              ? Number(position.liquidity) / Number(poolLiquidity)
              : 0;

            const poolTVL = parseFloat(pool.tvl || '0');
            const lpValue = poolTVL * userShare;

            const poolName = `${pool.token0Symbol || 'TOKEN0'}-${pool.token1Symbol || 'TOKEN1'}`;

            balances.push({
              symbol: 'LP',
              name: `${poolName} LP`,
              amount: formatUnits(position.liquidity, 18),
              value: `$${lpValue.toFixed(2)}`,
              address: position.poolId,
              isLP: true,
              poolId: position.poolId,
            });
          }
        }
      }

      setTokenBalances(balances);

      // Calculate total balance
      const total = balances.reduce((sum, token) => {
        // Safe parsing: remove '$' and ',' and parse float.
        // If result is NaN, treat as 0.
        const valueStr = token.value.replace('$', '').replace(/,/g, '');
        const value = parseFloat(valueStr);
        return sum + (isNaN(value) ? 0 : value);
      }, 0);

      setTotalBalance(total.toFixed(2));
    } catch (err) {
      console.error('Error calculating balances:', err);
      // Even on error, set fallback so UI isn't empty
      setTotalBalance('0.00');
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, ethBalanceData, usdcBalanceData, usdcDecimalsData, pyusdBalanceData, linkBalanceData, lpPositions, pools, prices]);

  // Calculate statistics from pools
  useEffect(() => {
    if (pools.length > 0) {
      // Calculate 24h volume from pools
      const totalVolume = pools.reduce((sum, pool) => {
        return sum + parseFloat(pool.volume24h || '0');
      }, 0);
      setVolume24h(totalVolume.toFixed(2));
    } else {
      setVolume24h('0.00');
    }
  }, [pools]);

  // No additional effects needed - Wagmi handles refetching automatically

  return {
    totalBalance,
    portfolioChange,
    volume24h,
    poolsJoined,
    tokenBalances,
    lpPositions,
    loading,
    isConnected,
    refetch: () => {
      // Wagmi handles refetching automatically via query refetchInterval
    },
  };
}
