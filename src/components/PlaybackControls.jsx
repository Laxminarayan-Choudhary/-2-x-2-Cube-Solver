import React from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw } from 'lucide-react';

export default function PlaybackControls({
  moves = [],
  currentStepIndex, // -1 means start (scrambled), 0 means after 1st move, etc.
  isPlaying,
  setIsPlaying,
  onStepForward,
  onStepBackward,
  onResetPlayback,
  moveSpeed,
  setMoveSpeed
}) {
  const hasMoves = moves.length > 0;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800/60 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <h3 className="text-sm font-medium text-slate-300">Solution Player</h3>
        {hasMoves && (
          <span className="text-xs font-mono text-slate-500">
            Step {currentStepIndex + 1} of {moves.length}
          </span>
        )}
      </div>

      {!hasMoves ? (
        <div className="text-center py-6 text-slate-500 text-sm font-mono leading-relaxed">
          No solution loaded.<br />Scramble the cube and click "Find Solution".
        </div>
      ) : (
        <div className="space-y-6">
          {/* Timeline / Stepper indicator */}
          <div className="flex flex-wrap items-center gap-1.5 p-3 bg-slate-950/60 rounded-xl border border-slate-900 shadow-inner max-h-[120px] overflow-y-auto">
            <button
              onClick={onResetPlayback}
              className={`px-2 py-1 text-xs font-semibold rounded transition-all duration-150 cursor-pointer
                ${currentStepIndex === -1
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900/40 text-slate-500 hover:text-slate-300'
                }
              `}
            >
              Start
            </button>
            {moves.map((move, idx) => {
              const isPassed = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              
              return (
                <div key={idx} className="flex items-center">
                  <span className="text-[10px] text-slate-600 mx-0.5">→</span>
                  <span
                    className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all duration-200 shadow-sm
                      ${isCurrent
                        ? 'bg-indigo-600 text-white scale-105 border border-indigo-400/40 glow-indigo'
                        : isPassed
                          ? 'bg-slate-850 text-indigo-300/80 border border-slate-800'
                          : 'bg-slate-900/20 text-slate-600 border border-transparent'
                      }
                    `}
                  >
                    {move}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Speed slider control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400">Playback Speed</label>
              <span className="text-xs font-mono text-indigo-400">{moveSpeed}ms</span>
            </div>
            <input
              type="range"
              min="150"
              max="1000"
              step="50"
              value={moveSpeed}
              onChange={(e) => setMoveSpeed(Number(e.target.value))}
              disabled={isPlaying}
              className="w-full cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center items-center gap-3">
            <button
              onClick={onResetPlayback}
              className="p-3 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer"
              title="Reset player to start"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={onStepBackward}
              disabled={currentStepIndex === -1 || isPlaying}
              className="p-3 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Previous step"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-4 rounded-full transition-all duration-150 active:scale-95 cursor-pointer shadow-lg
                ${isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/10'
                  : 'bg-indigo-600 hover:bg-indigo-505 text-white shadow-indigo-600/10 hover:shadow-indigo-500/20'
                }
              `}
              title={isPlaying ? 'Pause' : 'Play animation'}
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>

            <button
              onClick={onStepForward}
              disabled={currentStepIndex === moves.length - 1 || isPlaying}
              className="p-3 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Next step"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
