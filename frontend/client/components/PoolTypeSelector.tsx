import { Info } from "lucide-react";

interface PoolTypeSelectorProps {
  selectedType: "normal" | "dark";
  onSelectType: (type: "normal" | "dark") => void;
  tradeAmountUSD?: number;
}

export default function PoolTypeSelector({
  selectedType,
  onSelectType,
  tradeAmountUSD,
}: PoolTypeSelectorProps) {
  // Auto-recommend based on trade size
  const recommendation = tradeAmountUSD
    ? tradeAmountUSD < 10000
      ? "normal"
      : "dark"
    : null;

  return (
    <div className="mb-6 border-2 border-primary p-4">
      <h3 className="font-bold mb-4 pixel-text text-foreground">
        SELECT POOL TYPE
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Normal Pool Option */}
        <button
          type="button"
          onClick={() => onSelectType("normal")}
          className={`p-4 border-2 pixel-text text-left transition-all ${
            selectedType === "normal"
              ? "border-primary bg-primary/20"
              : "border-foreground/20 hover:border-foreground/40"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-lg">⚡ NORMAL POOL</div>
            {recommendation === "normal" && (
              <span className="text-xs bg-green-500 text-black px-2 py-1">
                RECOMMENDED
              </span>
            )}
          </div>
          <div className="text-sm text-foreground/80 space-y-1">
            <div>✓ Fast execution (~150k gas)</div>
            <div>✓ Low cost (~$5-10)</div>
            <div>✓ Public transparency</div>
            <div>✓ Standard AMM</div>
            <div className="text-xs text-foreground/60 mt-2">
              Best for: Regular traders, small amounts
            </div>
          </div>
        </button>

        {/* Dark Pool Option */}
        <button
          type="button"
          onClick={() => onSelectType("dark")}
          className={`p-4 border-2 pixel-text text-left transition-all ${
            selectedType === "dark"
              ? "border-primary bg-primary/20"
              : "border-foreground/20 hover:border-foreground/40"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-lg">🔒 DARK POOL (FHE)</div>
            {recommendation === "dark" && (
              <span className="text-xs bg-green-500 text-black px-2 py-1">
                RECOMMENDED
              </span>
            )}
          </div>
          <div className="text-sm text-foreground/80 space-y-1">
            <div>✓ MEV-proof encryption</div>
            <div>✓ Private amounts</div>
            <div>✓ OTC + Limit orders</div>
            <div>✓ Quantum-safe</div>
            <div className="text-yellow-500 mt-2">⚠️ High gas (~$300-600)</div>
            <div className="text-xs text-foreground/60 mt-1">
              Best for: Whales, institutions, large trades
            </div>
          </div>
        </button>
      </div>

      {selectedType === "dark" && (
        <div className="mt-4 p-4 border-2 border-yellow-500 bg-yellow-500/10">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm pixel-text">
              <div className="font-bold mb-2">🔒 DARK POOL BENEFITS:</div>
              <ul className="space-y-1 text-foreground/80">
                <li>• MEV-resistant: Bots can't see your trade size</li>
                <li>• Private positions: Nobody tracks your liquidity</li>
                <li>• OTC matching: Execute large orders privately</li>
                <li>• Quantum-safe + Privacy = Double protection</li>
              </ul>
              <div className="mt-3 text-xs text-foreground/60">
                Note: Requires FHE encryption. Transactions take ~30 seconds and
                cost 50-100x more gas.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
