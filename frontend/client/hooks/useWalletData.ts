import { useAccount, useBalance, useReadContract, usePublicClient } from 'wagmi';
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
  balance: bigint;
  share: number;
  value: string;
}

// Sepolia Token Addresses with robust fallbacks
const SEPOLIA_USDC = CONTRACTS?.TOKENS?.USDC || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const SEPOLIA_PYUSD = CONTRACTS?.TOKENS?.PYUSD || "0xCaC524BcA292aaade2DF8A53592ed26633cc858C";
const SEPOLIA_LINK = CONTRACTS?.TOKENS?.LINK || "0x779877A7B0D9E8603169DdbD7836e478b4624789";

export function useWalletData() {
  const { address: eoaAddress, isConnected: wagmiConnected } = useAccount();
  const { isConnected: snapConnected, accountAddress: quantumAccountAddress } = useSnap();
  const isConnected = snapConnected || wagmiConnected;

  // Use the QuantumAccount address for balance queries (this is where funds need to be)
  // Falls back to EOA if QuantumAccount not available yet
  const address = quantumAccountAddress as `0x${string}` | undefined || eoaAddress;

  const { pools } = usePools();
  const publicClient = usePublicClient({ chainId: sepolia.id });

  // Use Wagmi hooks for balances (no CORS issues)
  const { data: ethBalanceData, refetch: ethBalanceRefetch } = useBalance({
    address,
    chainId: sepolia.id,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  // USDC Hooks
  const { data: usdcBalanceData, refetch: usdcRefetch } = useReadContract({
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
  const { data: pyusdBalanceData, refetch: pyusdRefetch } = useReadContract({
    address: SEPOLIA_PYUSD as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address && isConnected, refetchInterval: 30000 },
  });

  // LINK Hooks
  const { data: linkBalanceData, refetch: linkRefetch } = useReadContract({
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
  const [lpPositions, setLpPositions] = useState<LPPosition[]>([]);
  const [loading, setLoading] = useState(false);

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
  }, []);

  // Fetch LP positions (User balance of Pool Tokens)
  useEffect(() => {
    const fetchLP = async () => {
      if (!address || !publicClient || pools.length === 0) {
        setLpPositions([]);
        setPoolsJoined(0);
        return;
      }


      const positions: LPPosition[] = [];
      let joinedCount = 0;

      // Check both addresses to aggregate positions
      const addressesToCheck: `0x${string}`[] = [];
      if (quantumAccountAddress) addressesToCheck.push(quantumAccountAddress as `0x${string}`);
      if (eoaAddress && eoaAddress !== quantumAccountAddress) addressesToCheck.push(eoaAddress);

      for (const pool of pools) {
        try {
          let totalBalance = 0n;

          // Check balance for each address and sum them
          for (const addr of addressesToCheck) {
            try {
              const balance = await publicClient.readContract({
                address: pool.id as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [addr],
              }) as bigint;
              totalBalance += balance;
            } catch (err) {
              // Ignore individual read errors
            }
          }

          if (totalBalance > 0n) {
            joinedCount++;

            // Calculate value share
            // Share = Balance / TotalSupply
            // Value = Share * TVL
            const totalSupply = pool.liquidity; // In our new Pool interface, liquidity IS totalSupply
            const share = totalSupply > 0n ? Number(totalBalance) / Number(totalSupply) : 0;
            const tvlVal = parseFloat(pool.tvl || "0");
            const val = tvlVal * share;

            positions.push({
              poolId: pool.id,
              balance: totalBalance,
              share,
              value: val.toFixed(2)
            });
          }
        } catch (e) {
          console.error("[LP Fetch] Error fetching LP balance for pool", pool.id, ":", e);
        }
      }


      setLpPositions(positions);
      setPoolsJoined(joinedCount);
    };

    fetchLP();
  }, [address, pools, publicClient]);

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
        const pool = pools.find(p => p.id === position.poolId);
        if (pool) {
          const poolName = `${pool.token0Symbol || 'TOKEN0'}-${pool.token1Symbol || 'TOKEN1'}`;

          balances.push({
            symbol: `${poolName} LP`, // Changed from 'LP' to pool-specific
            name: `${poolName} LP`,
            amount: formatUnits(position.balance, 18),
            value: `$${position.value}`,
            address: position.poolId,
            isLP: true,
            poolId: position.poolId,
          });
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

  return {
    totalBalance,
    portfolioChange,
    volume24h,
    poolsJoined,
    tokenBalances,
    lpPositions,
    loading,
    isConnected,
    prices,
    refetch: async () => {
      await Promise.all([
        ethBalanceRefetch(),
        usdcRefetch(),
        pyusdRefetch(),
        linkRefetch(),
      ]);
      setLoading(true);
      // The useEffects will trigger update
    },
  };
}
