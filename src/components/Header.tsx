import { Activity, Settings, ChevronDown } from 'lucide-react';

interface HeaderProps {
  symbol?: string;
  spread?: number;
}

export function Header({ symbol = 'EUR/USD', spread = 0.8 }: HeaderProps) {
  return (
    <header className="h-12 bg-[#0a0e17] border-b border-[#1a2332] flex items-center justify-between px-4">
      {/* Left - Logo & Symbol */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide text-white">SYNTHEX</span>
        </div>
        
        <div className="h-6 w-px bg-[#1a2332]" />
        
        {/* Symbol Selector */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#0f1521] border border-[#1a2332] hover:border-blue-500/50 transition-colors">
          <span className="text-sm font-semibold text-white">{symbol}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
        
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Spread:</span>
            <span className="text-white font-mono">{spread.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Right - Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Synthetic Feed</span>
        </div>
        <button className="p-2 rounded hover:bg-[#1a2332] transition-colors">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
