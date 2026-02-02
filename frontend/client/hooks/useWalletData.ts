import { useAccount, useBalance, useReadContract } from 'wagmi';
import { usePublicClient } from 'wagmi';
import { formatUnits, parseAbiItem } from 'viem';
import { sepolia } from 'wagmi/chains';
import { useState, useEffect, useCallback } from 'react';
import { usePools } from './usePools';

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
] as const;

interface TokenBalance {
  symbol: string;
  name: string;
  amount: string;
  value: string;
  address: string;
}

export function useWalletData() {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({
    address,
    chainId: sepolia.id,
  });
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const { pools } = usePools();

  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [totalBalance, setTotalBalance] = useState<string>('0.00');
  const [portfolioChange, setPortfolioChange] = useState<string>('0.00');
  const [volume24h, setVolume24h] = useState<string>('0.00');
  const [poolsJoined, setPoolsJoined] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Common token addresses on Sepolia
  const TOKEN_ADDRESSES: Record<string, { address: string; symbol: string; name: string }> = {
    WETH: {
      address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
    },
    USDC: {
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      symbol: 'USDC',
      name: 'USD Coin',
    },
  };

  // Fetch token balances
  const fetchTokenBalances = useCallback(async () => {
    if (!address || !publicClient || !isConnected) {
      setTokenBalances([]);
      return;
    }

    setLoading(true);
    try {
      const balances: TokenBalance[] = [];

      // Add ETH balance
      if (ethBalance) {
        const ethValue = parseFloat(formatUnits(ethBalance.value, 18));
        balances.push({
          symbol: 'ETH',
          name: 'Ethereum',
          amount: ethValue.toFixed(4),
          value: `$${(ethValue * 3000).toFixed(2)}`, // Simplified price
          address: '0x0000000000000000000000000000000000000000',
        });
      }

      // Fetch token balances
      for (const [key, token] of Object.entries(TOKEN_ADDRESSES)) {
        try {
          const [balance, decimals] = await Promise.all([
            publicClient.readContract({
              address: token.address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address],
            }),
            publicClient.readContract({
              address: token.address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'decimals',
            }),
          ]);

          const amount = parseFloat(formatUnits(balance, decimals));
          if (amount > 0) {
            balances.push({
              symbol: token.symbol,
              name: token.name,
              amount: amount.toFixed(2),
              value: `$${amount.toFixed(2)}`, // Simplified - would need price oracle
              address: token.address,
            });
          }
        } catch (err) {
          console.error(`Error fetching ${key} balance:`, err);
        }
      }

      setTokenBalances(balances);

      // Calculate total balance
      const total = balances.reduce((sum, token) => {
        const value = parseFloat(token.value.replace('$', '').replace(',', ''));
        return sum + value;
      }, 0);
      setTotalBalance(total.toFixed(2));
    } catch (err) {
      console.error('Error fetching wallet data:', err);
    } finally {
      setLoading(false);
    }
  }, [address, publicClient, isConnected, ethBalance]);

  // Calculate statistics from pools
  useEffect(() => {
    if (pools.length > 0) {
      // Calculate 24h volume from pools
      const totalVolume = pools.reduce((sum, pool) => {
        return sum + parseFloat(pool.volume24h || '0');
      }, 0);
      setVolume24h(totalVolume.toFixed(2));

      // Count pools user has joined (simplified - would need to check LP positions)
      setPoolsJoined(0); // Would need to query LP token balances
    } else {
      setVolume24h('0.00');
      setPoolsJoined(0);
    }
  }, [pools]);

  useEffect(() => {
    fetchTokenBalances();
    const interval = setInterval(fetchTokenBalances, 30000);
    return () => clearInterval(interval);
  }, [fetchTokenBalances]);

  return {
    totalBalance,
    portfolioChange,
    volume24h,
    poolsJoined,
    tokenBalances,
    loading,
    isConnected,
  };
}
