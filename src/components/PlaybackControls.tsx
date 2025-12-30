import { Play, Pause, SkipForward, SkipBack, RotateCcw } from 'lucide-react';
import { PlaybackSpeed } from '@/types/trading';
import { cn } from '@/lib/utils';

interface PlaybackControlsProps {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  progress: number;
  currentIndex: number;
  totalCandles: number;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onSeek: (index: number) => void;
}

const speeds: PlaybackSpeed[] = [0.5, 1, 2, 4, 8];

export function PlaybackControls({
  isPlaying,
  speed,
  progress,
  currentIndex,
  totalCandles,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onReset,
  onSpeedChange,
  onSeek,
}: PlaybackControlsProps) {
  return (
    <div className="trading-card">
      <div className="flex flex-col gap-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span>Candle {currentIndex + 1}</span>
            <span>{totalCandles} total</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              min={0}
              max={totalCandles - 1}
              value={currentIndex}
              onChange={(e) => onSeek(parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onReset}
            className="playback-btn"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={onStepBackward}
            className="playback-btn"
            disabled={currentIndex <= 0}
            title="Step Back"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="playback-btn !p-4 !bg-primary hover:!bg-primary/90"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-primary-foreground" />
            ) : (
              <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
            )}
          </button>
          
          <button
            onClick={onStepForward}
            className="playback-btn"
            disabled={currentIndex >= totalCandles - 1}
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">Speed:</span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={cn('speed-badge', speed === s && 'active')}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
