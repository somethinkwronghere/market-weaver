import { cn } from '@/lib/utils';

export type Timeframe = '1H' | '4H' | '1D';

interface TimeframeSelectorProps {
  activeTimeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

const timeframes: { id: Timeframe; label: string }[] = [
  { id: '1H', label: '1H' },
  { id: '4H', label: '4H' },
  { id: '1D', label: '1D' },
];

export function TimeframeSelector({ activeTimeframe, onTimeframeChange }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-card rounded-lg border border-border">
      {timeframes.map((tf) => (
        <button
          key={tf.id}
          onClick={() => onTimeframeChange(tf.id)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded transition-colors",
            activeTimeframe === tf.id
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}
