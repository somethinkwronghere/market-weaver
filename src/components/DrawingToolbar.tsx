import { useState } from 'react';
import {
  TrendingUp,
  Minus,
  BarChart3,
  MousePointer,
  Trash2,
  Circle,
  LineChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useIndicatorsContext } from '@/contexts/IndicatorContext';

export type DrawingTool = 'select' | 'trendline' | 'horizontal' | 'fibonacci' | 'support-resistance';

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClearDrawings: () => void;
}

const tools = [
  { id: 'select' as const, icon: MousePointer, label: 'Select' },
  { id: 'trendline' as const, icon: TrendingUp, label: 'Trend Line' },
  { id: 'horizontal' as const, icon: Minus, label: 'Horizontal Line' },
  { id: 'fibonacci' as const, icon: BarChart3, label: 'Fibonacci' },
  { id: 'support-resistance' as const, icon: Circle, label: 'S/R Level' },
];

const indicatorLabels: Record<string, string> = {
  'rsi-default': 'RSI',
  'macd-default': 'MACD',
  'stochastic-default': 'Stochastic',
  'atr-default': 'ATR',
  'volume-default': 'Volume',
  'bollinger-default': 'Bollinger Bands',
  'ema-default': 'EMA',
  'sma-default': 'SMA',
};

export function DrawingToolbar({ activeTool, onToolChange, onClearDrawings }: DrawingToolbarProps) {
  const { indicators, toggleIndicator } = useIndicatorsContext();
  const [indicatorOpen, setIndicatorOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 p-1 bg-card rounded-lg border border-border">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
            className={cn(
              "p-2 rounded transition-colors",
              activeTool === tool.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      <div className="w-px h-6 bg-border mx-1" />

      {/* Indicators Toggle */}
      <Popover open={indicatorOpen} onOpenChange={setIndicatorOpen}>
        <PopoverTrigger asChild>
          <button
            title="Indicators"
            className={cn(
              "p-2 rounded transition-colors relative",
              indicators.some(ind => ind.enabled)
                ? "bg-blue-500/20 text-blue-400"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <LineChart className="w-4 h-4" />
            {indicators.some(ind => ind.enabled) && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-card border-border" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-sm font-semibold text-foreground">Indicators</span>
              <span className="text-xs text-muted-foreground">
                {indicators.filter(ind => ind.enabled).length} active
              </span>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {indicators.map((indicator) => (
                <div
                  key={indicator.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm text-foreground">
                    {indicatorLabels[indicator.id] || indicator.name}
                  </span>
                  <Switch
                    checked={indicator.enabled}
                    onCheckedChange={() => toggleIndicator(indicator.id)}
                    className="scale-75"
                  />
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-6 bg-border mx-1" />

      <button
        onClick={onClearDrawings}
        title="Clear All Drawings"
        className="p-2 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
