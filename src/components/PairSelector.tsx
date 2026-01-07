import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export type TradingPair = 'EUR/USD' | 'GBP/USD';

interface PairSelectorProps {
  activePair: TradingPair;
  onPairChange: (pair: TradingPair) => void;
}

const pairs: { value: TradingPair; label: string }[] = [
  { value: 'EUR/USD', label: 'EUR/USD' },
  { value: 'GBP/USD', label: 'GBP/USD' },
];

export function PairSelector({ activePair, onPairChange }: PairSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 px-3 text-sm font-semibold text-foreground hover:bg-accent gap-1"
        >
          <span className="text-emerald-400">{activePair}</span>
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
            <span className="text-emerald-400">{pair.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
