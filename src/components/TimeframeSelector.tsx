import { cn } from '@/lib/utils';

export type Timeframe = '1M' | '5M' | '15M' | '1H' | '4H' | '1D' | '1W' | '1MO';

interface TimeframeSelectorProps {
  activeTimeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
}

const timeframeGroups = [
  { 
    label: 'Dakikalık',
    items: [
      { id: '1M' as Timeframe, label: '1M' },
      { id: '5M' as Timeframe, label: '5M' },
      { id: '15M' as Timeframe, label: '15M' },
    ]
  },
  {
    label: 'Saatlik/Günlük',
    items: [
      { id: '1H' as Timeframe, label: '1H' },
      { id: '4H' as Timeframe, label: '4H' },
      { id: '1D' as Timeframe, label: '1D' },
    ]
  },
  {
    label: 'Uzun Vadeli',
    items: [
      { id: '1W' as Timeframe, label: '1W' },
      { id: '1MO' as Timeframe, label: '1MO' },
    ]
  }
];

export function TimeframeSelector({ activeTimeframe, onTimeframeChange }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 p-1 bg-card rounded-lg border border-border">
      {timeframeGroups.map((group, groupIdx) => (
        <div key={group.label} className="flex items-center">
          {groupIdx > 0 && <div className="w-px h-4 bg-border mx-1" />}
          {group.items.map((tf) => (
            <button
              key={tf.id}
              onClick={() => onTimeframeChange(tf.id)}
              className={cn(
                "px-2 py-1 text-xs font-medium rounded transition-colors",
                activeTimeframe === tf.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
