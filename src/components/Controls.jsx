import React from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Shuffle, Sparkles, ArrowLeft } from 'lucide-react';

export default function Controls({
  algorithm,
  setAlgorithm,
  onSolve,
  onScramble,
  onReset,
  isSolving,
  isPlaying,
  isValid,
  
  // Playback props
  moves = [],
  currentStepIndex,
  setIsPlaying,
  onStepForward,
  onStepBackward,
  onResetPlayback,
  moveSpeed,
  setMoveSpeed,
  onClearSolution
}) {
  const hasMoves = moves.length > 0;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800/60 shadow-xl space-y-6">
      <h3 className="text-sm font-medium text-slate-300 pb-3">Engine Controls</h3>
      
      {!hasMoves ? (
        <>
          {/* Algorithm Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 block">Solving Algorithm</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'bidirectional', name: 'Bidirectional BFS (Optimized)', desc: 'Fastest. Meets in the middle from start and solved configurations.' },
                { id: 'bfs', name: 'BFS (Breadth-First)', desc: 'Baseline shortest-path finder. Searches layer by layer.' },
                { id: 'iddfs', name: 'IDDFS (Iterative Deepening)', desc: 'Extremely memory efficient. Increments depth limit.' }
              ].map((algo) => {
                const isSelected = algorithm === algo.id;
                return (
                  <button
                    key={algo.id}
                    id={`algo-select-${algo.id}`}
                    onClick={() => setAlgorithm(algo.id)}
                    disabled={isSolving || isPlaying}
                    className={`text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                      ${isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/80 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.1)]'
                        : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700/60 text-slate-300'
                      }
                    `}
                  >
                    <div className="text-sm font-semibold flex items-center justify-between">
                      <span>{algo.name}</span>
                      {isSelected && <span className="w-2 h-2 bg-indigo-400 rounded-full glow-indigo" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{algo.desc}</p>
                  </button>
                );
              })}
            </div>
            
            {/* Warning Banner for slow search algorithms */}
            {(algorithm === 'bfs' || algorithm === 'iddfs') && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 rounded-xl leading-relaxed font-medium">
                ⚠️ Note: BFS and IDDFS search the entire graph and can take 2-4 seconds on deep scrambles. The screen may briefly pause. For instant results, use Bidirectional BFS.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="btn-scramble"
              onClick={onScramble}
              disabled={isSolving || isPlaying}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 text-slate-300 hover:text-white rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-semibold"
              title="Scramble with 15 random moves"
            >
              <Shuffle className="w-4 h-4" />
              Scramble
            </button>

            <button
              id="btn-reset"
              onClick={onReset}
              disabled={isSolving || isPlaying}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 text-slate-300 hover:text-white rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-semibold"
              title="Reset to solved state"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Solved
            </button>
          </div>

          {/* Solve Button */}
          <button
            id="btn-solve"
            onClick={onSolve}
            disabled={isSolving || isPlaying || !isValid}
            className={`w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] cursor-pointer text-sm
              ${!isValid
                ? 'bg-rose-950/20 border border-rose-900/40 text-rose-500/80 cursor-not-allowed'
                : isSolving
                  ? 'bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/20 shadow-indigo-600/10 border border-indigo-500/30'
              }
            `}
          >
            {isSolving ? (
              <>
                <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Computing Solution...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Find Solution
              </>
            )}
          </button>
        </>
      ) : (
        <>
          {/* Solution Player */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3">
              <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full glow-indigo animate-pulse" />
                Solution Player ({algorithm})
              </h4>
              <span className="text-[10px] font-mono text-slate-500">
                Step {currentStepIndex + 1} of {moves.length}
              </span>
            </div>

            {/* Timeline */}
            <div className="flex flex-wrap items-center gap-1.5 p-3 bg-slate-950/60 rounded-xl border border-slate-900 shadow-inner max-h-[110px] overflow-y-auto">
              <button
                onClick={onResetPlayback}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all duration-150 cursor-pointer
                  ${currentStepIndex === -1
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900/40 text-slate-500 hover:text-slate-350'
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
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-all duration-200 shadow-sm
                        ${isCurrent
                          ? 'bg-indigo-600 text-white scale-105 border border-indigo-400/40 glow-indigo'
                          : isPassed
                            ? 'bg-slate-850 text-indigo-350 border border-slate-800'
                            : 'bg-slate-900/20 text-slate-650 border border-transparent'
                        }
                      `}
                    >
                      {move}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Playback speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold text-slate-400">Playback Speed</label>
                <span className="text-[10px] font-mono text-indigo-400">{moveSpeed}ms</span>
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

            {/* Controls */}
            <div className="flex justify-center items-center gap-3 pt-1">
              <button
                onClick={onResetPlayback}
                className="p-2.5 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer"
                title="Reset player to start"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={onStepBackward}
                disabled={currentStepIndex === -1 || isPlaying}
                className="p-2.5 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Previous step"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-3 rounded-full transition-all duration-150 active:scale-95 cursor-pointer shadow-lg
                  ${isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/10'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10 hover:shadow-indigo-500/20'
                  }
                `}
                title={isPlaying ? 'Pause' : 'Play animation'}
              >
                {isPlaying ? <Pause className="w-4.5 h-4.5 fill-current" /> : <Play className="w-4.5 h-4.5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={onStepForward}
                disabled={currentStepIndex === moves.length - 1 || isPlaying}
                className="p-2.5 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 text-slate-400 hover:text-slate-200 rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Next step"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Back Button */}
            <button
              onClick={onClearSolution}
              className="w-full py-2 px-4 bg-slate-900/40 hover:bg-slate-800/50 border border-slate-850 hover:border-slate-700 text-[10px] font-semibold text-slate-400 hover:text-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Change Solving Algorithm
            </button>
          </div>

          {/* Action Buttons for Scramble/Reset */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              id="btn-scramble"
              onClick={onScramble}
              disabled={isPlaying}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900/45 hover:bg-slate-800/45 border border-slate-850 hover:border-slate-750 text-slate-450 hover:text-white rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs font-semibold"
              title="Scramble with 15 random moves"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Scramble
            </button>

            <button
              id="btn-reset"
              onClick={onReset}
              disabled={isPlaying}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900/45 hover:bg-slate-800/45 border border-slate-850 hover:border-slate-750 text-slate-450 hover:text-white rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs font-semibold"
              title="Reset to solved state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Solved
            </button>
          </div>
        </>
      )}
    </div>
  );
}
