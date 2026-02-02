import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { useQuantumRegistry } from '../hooks/useQuantumRegistry';

interface AddressIndicatorProps {
  address: string;
  onStatusChange?: (isQuantumSafe: boolean) => void;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function AddressIndicator({ 
  address, 
  onStatusChange,
  showLabel = true,
  size = 'md'
}: AddressIndicatorProps) {
  const [isQuantumSafe, setIsQuantumSafe] = useState<boolean | null>(null);
  const { checkQuantumSafe, isLoading } = useQuantumRegistry();

  useEffect(() => {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      setIsQuantumSafe(null);
      return;
    }

    const checkStatus = async () => {
      const status = await checkQuantumSafe(address);
      setIsQuantumSafe(status);
      if (onStatusChange) {
        onStatusChange(status);
      }
    };

    checkStatus();
  }, [address, checkQuantumSafe, onStatusChange]);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const iconSize = sizeClasses[size];

  if (!address || isQuantumSafe === null) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 pixel-text">
        <Loader2 className={`${iconSize} animate-spin text-foreground/60`} />
        {showLabel && <span className="text-foreground/60 text-sm">Checking...</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 animate-in fade-in duration-300">
      {isQuantumSafe ? (
        <>
          <div className="relative">
            <Shield className={`${iconSize} text-primary drop-shadow-[0_0_8px_rgba(0,255,0,0.5)]`} />
            <div className="absolute inset-0 animate-pulse">
              <Shield className={`${iconSize} text-primary opacity-30`} />
            </div>
          </div>
          {showLabel && (
            <div className="pixel-text">
              <span className="text-primary font-bold glitch-text-hover">QUANTUM-SAFE</span>
              <span className="block text-xs text-foreground/60">0.15% fee</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="relative">
            <AlertTriangle className={`${iconSize} text-red-500 drop-shadow-[0_0_8px_rgba(255,0,0,0.5)]`} />
            <div className="absolute inset-0 animate-pulse">
              <AlertTriangle className={`${iconSize} text-red-500 opacity-30`} />
            </div>
          </div>
          {showLabel && (
            <div className="pixel-text">
              <span className="text-red-500 font-bold">VULNERABLE</span>
              <span className="block text-xs text-foreground/60">0.40% fee</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
