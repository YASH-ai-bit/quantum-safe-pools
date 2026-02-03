import { createConfig, http, createStorage } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { CONTRACTS, RPC_URLS } from '@shared/contracts';

// Helper to get Flask provider
function getFlaskProvider() {
  const { ethereum } = window as any;
  if (!ethereum) return null;

  if (ethereum.providers?.length) {
    const flaskProvider = ethereum.providers.find((p: any) => p.isMetaMask && p.isFlask);
    if (flaskProvider) return flaskProvider;
    return ethereum.providers.find((p: any) => p.isMetaMask);
  }
  return ethereum;
}

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected({
      target: () => ({
        id: 'flask',
        name: 'MetaMask Flask',
        provider: getFlaskProvider(),
      }),
    }),
  ],
  transports: {
    [sepolia.id]: http(RPC_URLS.SEPOLIA),
  },
  ssr: false,
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }),
});

export const contracts = CONTRACTS;
