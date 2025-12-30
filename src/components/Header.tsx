import { Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="trading-card !rounded-none border-x-0 border-t-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Synthetic Market Simulator</h1>
            <p className="text-xs text-muted-foreground">Forward Test Universe • EUR/USD</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Synthetic Data Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
