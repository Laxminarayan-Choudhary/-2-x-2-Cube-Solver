import React from 'react';
import { ShieldCheck, ShieldAlert, Cpu, Layers, Activity } from 'lucide-react';

export default function MetricsDashboard({
  isValid,
  validationError,
  movesCount,
  nodesExplored,
  executionTimeMs,
  status // 'solved', 'scrambled', 'invalid'
}) {
  const getStatusBadge = () => {
    if (!isValid) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/40 border border-rose-900/60 text-rose-400 font-semibold text-xs glow-rose">
          <ShieldAlert className="w-3.5 h-3.5" />
          Invalid Configuration
        </div>
      );
    }
    if (status === 'solved') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 font-semibold text-xs glow-emerald">
          <ShieldCheck className="w-3.5 h-3.5" />
          Solved State
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/40 border border-indigo-900/60 text-indigo-400 font-semibold text-xs glow-indigo">
        <Activity className="w-3.5 h-3.5 animate-pulse" />
        Scrambled Cube
      </div>
    );
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800/60 shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-sm font-medium text-slate-300">Cube Diagnostics</h3>
        {getStatusBadge()}
      </div>

      {/* Validation Message Box */}
      {!isValid ? (
        <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl text-rose-300 text-xs leading-relaxed font-mono">
          <div className="font-semibold mb-1 text-rose-400">Validator Error:</div>
          {validationError || "Invalid Rubik's Cube configuration"}
        </div>
      ) : (
        <div className="p-4 bg-emerald-950/15 border border-emerald-900/30 rounded-xl text-emerald-300 text-xs leading-relaxed font-mono">
          All physical constraints satisfied. The configuration has a valid corner permutation, orientation twist, and color distribution.
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Solution Length */}
        <div className="p-3 bg-slate-900/30 border border-slate-800/50 rounded-xl text-center">
          <div className="text-slate-500 text-[10px] font-semibold tracking-wider uppercase mb-1">Solution Length</div>
          <div className="text-xl font-bold font-mono text-slate-200">
            {isValid && movesCount !== null ? movesCount : '-'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">moves</div>
        </div>

        {/* C++ Runtime */}
        <div className="p-3 bg-slate-900/30 border border-slate-800/50 rounded-xl text-center">
          <div className="text-slate-500 text-[10px] font-semibold tracking-wider uppercase mb-1 flex items-center justify-center gap-1">
            <Cpu className="w-3 h-3 text-indigo-400" />
            C++ Runtime
          </div>
          <div className="text-xl font-bold font-mono text-indigo-400">
            {isValid && executionTimeMs !== null ? `${executionTimeMs.toFixed(3)}` : '-'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">milliseconds</div>
        </div>

        {/* Nodes Visited */}
        <div className="p-3 bg-slate-900/30 border border-slate-800/50 rounded-xl text-center">
          <div className="text-slate-500 text-[10px] font-semibold tracking-wider uppercase mb-1 flex items-center justify-center gap-1">
            <Layers className="w-3 h-3 text-indigo-400" />
            Nodes Searched
          </div>
          <div className="text-xl font-bold font-mono text-slate-200">
            {isValid && nodesExplored !== null ? nodesExplored.toLocaleString() : '-'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">states</div>
        </div>
      </div>
      
      {/* Benchmark Info */}
      <div className="text-[10px] text-slate-500 text-center font-mono leading-relaxed border-t border-slate-900 pt-3">
        Engine runs inside WebAssembly (compiled with -O3 optimizations). Search states are packed into 40-bit keys.
      </div>
    </div>
  );
}
