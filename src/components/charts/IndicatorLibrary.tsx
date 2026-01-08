import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Settings, TrendingUp, Activity, BarChart3, Waves, Trash2, Eye, EyeOff } from 'lucide-react';
import { IndicatorConfig } from '@/types/chart';

interface IndicatorLibraryProps {
  onAddIndicator: (config: IndicatorConfig) => void;
  onRemoveIndicator?: (id: string) => void;
  onToggleIndicator?: (id: string) => void;
  activeIndicators?: IndicatorConfig[];
}

const builtinIndicators = [
  {
    id: 'rsi',
    name: 'RSI',
    type: 'separate' as const,
    icon: Activity,
    params: { period: 14 },
    description: 'Relative Strength Index'
  },
  {
    id: 'macd',
    name: 'MACD',
    type: 'separate' as const,
    icon: TrendingUp,
    params: { fast: 12, slow: 26, signal: 9 },
    description: 'Moving Average Convergence Divergence'
  },
  {
    id: 'ema',
    name: 'EMA',
    type: 'overlay' as const,
    icon: Waves,
    params: { period: 20 },
    description: 'Exponential Moving Average'
  },
  {
    id: 'sma',
    name: 'SMA',
    type: 'overlay' as const,
    icon: BarChart3,
    params: { period: 20 },
    description: 'Simple Moving Average'
  },
  {
    id: 'bollinger',
    name: 'Bollinger Bands',
    type: 'overlay' as const,
    icon: Activity,
    params: { period: 20, stdDev: 2 },
    description: 'Bollinger Bands'
  },
  {
    id: 'stochastic',
    name: 'Stochastic',
    type: 'separate' as const,
    icon: TrendingUp,
    params: { kPeriod: 14, dPeriod: 3 },
    description: 'Stochastic Oscillator'
  },
  {
    id: 'atr',
    name: 'ATR',
    type: 'separate' as const,
    icon: BarChart3,
    params: { period: 14 },
    description: 'Average True Range'
  },
  {
    id: 'volume',
    name: 'Volume',
    type: 'separate' as const,
    icon: BarChart3,
    params: {},
    description: 'Volume Bars'
  }
];

export function IndicatorLibrary({
  onAddIndicator,
  onRemoveIndicator,
  onToggleIndicator,
  activeIndicators = []
}: IndicatorLibraryProps) {
  const [open, setOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<typeof builtinIndicators[0] | null>(null);
  const [params, setParams] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<'library' | 'active'>('library');

  const handleIndicatorClick = (indicator: typeof builtinIndicators[0]) => {
    setSelectedIndicator(indicator);
    setParams({ ...indicator.params });
  };

  const handleAdd = () => {
    if (!selectedIndicator) return;

    const config: IndicatorConfig = {
      id: `${selectedIndicator.id}-${Date.now()}`,
      name: selectedIndicator.name,
      type: selectedIndicator.type,
      params,
      enabled: true
    };

    onAddIndicator(config);
    setOpen(false);
    setSelectedIndicator(null);
    setParams({});
  };

  const isActive = (indicatorId: string) => {
    return activeIndicators.some(ind => ind.name.toLowerCase() === indicatorId.toLowerCase());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Plus className="w-4 h-4 mr-2" />
          Indicators
          {activeIndicators.filter(i => i.enabled).length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 text-[10px] flex items-center justify-center text-white">
              {activeIndicators.filter(i => i.enabled).length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0a0e17] border-[#1a2332] max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Indicator Library</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add and manage chart indicators
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#1a2332] pb-2">
          <Button
            variant={tab === 'library' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('library')}
            className={tab === 'library' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Add Indicator
          </Button>
          <Button
            variant={tab === 'active' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('active')}
            className={tab === 'active' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Active ({activeIndicators.length})
          </Button>
        </div>

        {/* Library Tab */}
        {tab === 'library' && (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Indicator List */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-2">
              {builtinIndicators.map((indicator) => {
                const active = isActive(indicator.id);
                return (
                  <Card
                    key={indicator.id}
                    className={`bg-[#050810] border-[#1a2332] cursor-pointer transition-all hover:border-blue-500/50 ${
                      selectedIndicator?.id === indicator.id ? 'border-blue-500' : ''
                    } ${active ? 'opacity-50' : ''}`}
                    onClick={() => !active && handleIndicatorClick(indicator)}
                  >
                    <div className="p-3">
                      <div className="flex items-center gap-2">
                        <indicator.icon className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-white">{indicator.name}</span>
                        <Badge variant="outline" className="ml-auto">
                          {indicator.type}
                        </Badge>
                        {active && (
                          <Badge variant="secondary" className="text-green-400">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{indicator.description}</p>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Parameters Panel */}
            <div className="w-64">
              {selectedIndicator ? (
                <Card className="bg-[#050810] border-[#1a2332]">
                  <div className="p-4 space-y-4">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      {selectedIndicator.name} Settings
                    </h3>

                    {Object.entries(selectedIndicator.params).map(([key, value]) => (
                      <div key={key}>
                        <Label className="text-white text-sm capitalize">{key}</Label>
                        <Input
                          type="number"
                          value={params[key] ?? value}
                          onChange={(e) =>
                            setParams((prev) => ({
                              ...prev,
                              [key]: parseFloat(e.target.value) || 0
                            }))
                          }
                          className="bg-[#0a0e17] border-[#1a2332] mt-1"
                        />
                      </div>
                    ))}

                    <Button onClick={handleAdd} className="w-full">
                      Add to Chart
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="bg-[#050810] border-[#1a2332]">
                  <div className="p-4 text-center text-muted-foreground">
                    Select an indicator to configure
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Active Indicators Tab */}
        {tab === 'active' && (
          <div className="flex-1 overflow-y-auto space-y-2">
            {activeIndicators.length === 0 ? (
              <Card className="bg-[#050810] border-[#1a2332]">
                <div className="p-8 text-center text-muted-foreground">
                  No indicators added yet. Go to "Add Indicator" tab to add some.
                </div>
              </Card>
            ) : (
              activeIndicators.map((indicator) => (
                <Card key={indicator.id} className="bg-[#050810] border-[#1a2332]">
                  <div className="p-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={indicator.enabled}
                        onCheckedChange={() => onToggleIndicator?.(indicator.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{indicator.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {indicator.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {Object.entries(indicator.params)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveIndicator?.(indicator.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
