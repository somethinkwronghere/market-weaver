import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export type TradingPair = 'EUR/USD' | 'BTC/USD' | 'GBP/USD' | 'USD/JPY';

interface PairSelectorProps {
  activePair: TradingPair;
  onPairChange: (pair: TradingPair) => void;
}

const pairs: { value: TradingPair; label: string; type: 'forex' | 'crypto' }[] = [
  { value: 'EUR/USD', label: 'EUR/USD', type: 'forex' },
  { value: 'BTC/USD', label: 'BTC/USD', type: 'crypto' },
  { value: 'GBP/USD', label: 'GBP/USD', type: 'forex' },
  { value: 'USD/JPY', label: 'USD/JPY', type: 'forex' },
];

export function PairSelector({ activePair, onPairChange }: PairSelectorProps) {
  const currentPair = pairs.find(p => p.value === activePair);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 px-3 text-sm font-semibold text-foreground hover:bg-accent gap-1"
        >
          <span className={currentPair?.type === 'crypto' ? 'text-amber-400' : 'text-emerald-400'}>
            {activePair}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-card border-border">
        {pairs.map((pair) => (
          <DropdownMenuItem
            key={pair.value}
            onClick={() => onPairChange(pair.value)}
            className={`cursor-pointer ${
              pair.value === activePair ? 'bg-accent' : ''
            }`}
          >
            <span className={pair.type === 'crypto' ? 'text-amber-400' : 'text-emerald-400'}>
              {pair.label}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              {pair.type === 'crypto' ? 'Kripto' : 'Forex'}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
