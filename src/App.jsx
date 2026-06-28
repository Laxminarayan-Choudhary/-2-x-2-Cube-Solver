import React, { useState, useEffect, useRef, useCallback } from 'react';
import createSolverModule from './wasm/solver.js';
import Cube3D from './components/Cube3D';
import Cube2D, { COLOR_MAP } from './components/Cube2D';
import Controls from './components/Controls';

import MetricsDashboard from './components/MetricsDashboard';
import { HelpCircle, RefreshCw, Cpu, Layers, Sun, Moon, Palette, X } from 'lucide-react';

const SOLVED_STICKERS = "WWWWYYYYGGGGBBBBOOOORRRR";

export default function App() {
  // WASM solver module instance
  const [wasmInstance, setWasmInstance] = useState(null);
  const [wasmLoading, setWasmLoading] = useState(true);

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Native Modal Dialog Ref
  const dialogRef = useRef(null);

  // Sync theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const openModal = () => {
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
  };

  const closeModal = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
  };

  const handleDialogClick = (e) => {
    if (e.target === dialogRef.current) {
      closeModal();
    }
  };

  // Cube state
  const [stickers, setStickers] = useState(SOLVED_STICKERS);
  const [scrambledStickers, setScrambledStickers] = useState(SOLVED_STICKERS);
  const [activeColor, setActiveColor] = useState('W'); // Paint brush color
  
  // Validation state
  const [isValid, setIsValid] = useState(true);
  const [validationError, setValidationError] = useState("");

  // Solver & Playback state
  const [algorithm, setAlgorithm] = useState('bidirectional');
  const [solutionMoves, setSolutionMoves] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1); // -1 means start
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMoveFor3D, setCurrentMoveFor3D] = useState(null);
  const [moveSpeed, setMoveSpeed] = useState(300); // Animation speed in ms
  const [isSolving, setIsSolving] = useState(false);
  
  // Benchmark metrics
  const [metrics, setMetrics] = useState({
    movesCount: null,
    nodesExplored: null,
    executionTimeMs: null,
    status: 'solved' // 'solved', 'scrambled', 'invalid'
  });

  const isGoingBackwardRef = useRef(false);

  // Initialize WASM Module
  useEffect(() => {
    createSolverModule()
      .then((instance) => {
        setWasmInstance(instance);
        setWasmLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load WASM module", err);
        setWasmLoading(false);
      });
  }, []);

  // Helper to call WASM solve
  const solveCube = useCallback((stickersStr, algo) => {
    if (!wasmInstance) return null;
    try {
      const res = wasmInstance.ccall(
        'solve_cube_wasm',
        'string',
        ['string', 'string'],
        [stickersStr, algo]
      );
      return JSON.parse(res);
    } catch (e) {
      console.error("WASM solve error", e);
      return { status: 'error', message: 'Engine calculation failed' };
    }
  }, [wasmInstance]);

  // Helper to call WASM apply_move
  const applyMove = useCallback((stickersStr, move) => {
    if (!wasmInstance) return stickersStr;
    try {
      const res = wasmInstance.ccall(
        'apply_move_wasm',
        'string',
        ['string', 'string'],
        [stickersStr, move]
      );
      return res;
    } catch (e) {
      console.error("WASM apply move error", e);
      return stickersStr;
    }
  }, [wasmInstance]);

  // Validate cube whenever stickers change
  useEffect(() => {
    if (!wasmInstance) return;
    
    // Call solver briefly to check validity
    const result = solveCube(stickers, "bidirectional");
    if (result && result.status === "error") {
      setIsValid(false);
      setValidationError(result.message || "Invalid Rubik’s Cube configuration");
      setMetrics(prev => ({ ...prev, status: 'invalid' }));
    } else {
      setIsValid(true);
      setValidationError("");
    }
  }, [stickers, wasmInstance, solveCube]);

  // Handle color painting on 2D Net
  const handleStickerClick = (index) => {
    if (isSolving || isPlaying) return;
    
    const newStickers = stickers.split('');
    newStickers[index] = activeColor;
    const updated = newStickers.join('');
    
    setStickers(updated);
    setSolutionMoves([]);
    setCurrentStepIndex(-1);
    
    // Reset benchmark metrics
    setMetrics({
      movesCount: null,
      nodesExplored: null,
      executionTimeMs: null,
      status: updated === SOLVED_STICKERS ? 'solved' : 'scrambled'
    });
  };

  // Scramble the cube randomly
  const handleScramble = () => {
    if (!wasmInstance || isSolving || isPlaying) return;

    const possibleFaces = ['U', 'D', 'F', 'B', 'L', 'R'];
    const possibleTypes = ['', "'", '2'];
    let currentStickers = SOLVED_STICKERS;
    let lastFace = '';
    const scrambleSequence = [];

    // Generate 15 moves avoiding consecutive duplicates on same face
    for (let i = 0; i < 15; ++i) {
      let face = '';
      do {
        face = possibleFaces[Math.floor(Math.random() * 6)];
      } while (face === lastFace);
      
      const type = possibleTypes[Math.floor(Math.random() * 3)];
      const move = face + type;
      scrambleSequence.push(move);
      lastFace = face;
      
      currentStickers = applyMove(currentStickers, move);
    }
    
    setStickers(currentStickers);
    setScrambledStickers(currentStickers);
    setSolutionMoves([]);
    setCurrentStepIndex(-1);
    
    setMetrics({
      movesCount: null,
      nodesExplored: null,
      executionTimeMs: null,
      status: 'scrambled'
    });
  };

  // Reset to solved state
  const handleReset = () => {
    if (isSolving || isPlaying) return;
    setStickers(SOLVED_STICKERS);
    setScrambledStickers(SOLVED_STICKERS);
    setSolutionMoves([]);
    setCurrentStepIndex(-1);
    setMetrics({
      movesCount: null,
      nodesExplored: null,
      executionTimeMs: null,
      status: 'solved'
    });
  };

  // Execute solver
  const handleSolve = () => {
    if (!wasmInstance || isSolving || isPlaying || !isValid) return;

    setIsSolving(true);
    // Timeout to allow UI thread spinner to render
    setTimeout(() => {
      const result = solveCube(stickers, algorithm);
      setIsSolving(false);
      
      if (result && result.status === 'success') {
        setSolutionMoves(result.moves);
        setScrambledStickers(stickers);
        setCurrentStepIndex(-1);
        
        setMetrics({
          movesCount: result.moves.length,
          nodesExplored: result.nodes_explored,
          executionTimeMs: result.time_ms,
          status: result.moves.length === 0 ? 'solved' : 'scrambled'
        });

        // If already solved, celebrate!
        if (result.moves.length === 0) {
          triggerCelebration();
        }
      } else {
        alert(result?.message || "Solve failed.");
      }
    }, 50);
  };

  // Playback engine loop
  useEffect(() => {
    if (!isPlaying || currentMoveFor3D !== null) return;
    
    // Finished all moves
    if (currentStepIndex >= solutionMoves.length - 1) {
      setIsPlaying(false);
      triggerCelebration();
      return;
    }
    
    // Trigger next move animation
    const nextStep = currentStepIndex + 1;
    const timer = setTimeout(() => {
      isGoingBackwardRef.current = false;
      setCurrentMoveFor3D(solutionMoves[nextStep]);
      setCurrentStepIndex(nextStep);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, solutionMoves, currentMoveFor3D]);

  // Stepper controls
  const handleStepForward = () => {
    if (currentStepIndex >= solutionMoves.length - 1 || currentMoveFor3D !== null) return;
    const nextStep = currentStepIndex + 1;
    isGoingBackwardRef.current = false;
    setCurrentMoveFor3D(solutionMoves[nextStep]);
    setCurrentStepIndex(nextStep);
  };

  const handleStepBackward = () => {
    if (currentStepIndex < 0 || currentMoveFor3D !== null) return;
    
    const move = solutionMoves[currentStepIndex];
    // Invert move string
    const invMove = move.includes("'") 
      ? move[0] 
      : move.includes("2") 
        ? move 
        : move + "'";
        
    isGoingBackwardRef.current = true;
    setCurrentMoveFor3D(invMove);
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    setCurrentMoveFor3D(null);
    isGoingBackwardRef.current = false;
    setStickers(scrambledStickers);
    setCurrentStepIndex(-1);
  };

  // 3D move completion sync handler
  const handleMoveComplete = () => {
    const moveApplied = currentMoveFor3D;
    const wasGoingBackward = isGoingBackwardRef.current;
    
    isGoingBackwardRef.current = false;
    
    // Sync sticker state using WASM transition
    setStickers(prev => {
      const nextStickers = applyMove(prev, moveApplied);
      return nextStickers;
    });
    
    setCurrentMoveFor3D(null);
    
    if (wasGoingBackward) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Solver success celebration
  const triggerCelebration = () => {
    import('canvas-confetti').then((confetti) => {
      confetti.default({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444']
      });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-mesh relative text-slate-100 flex flex-col justify-between py-8 px-6 md:px-8 overflow-x-hidden select-none">
      {/* Background Blobs */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      {/* Header */}
      <header className="w-full mb-8 text-center md:text-left flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-100 flex items-center justify-center md:justify-start gap-3">
            <span>2×2 Rubik’s Solver</span>
            <span className="text-xs bg-blue-500/10 dark:bg-indigo-500/20 text-blue-600 dark:text-indigo-300 border border-blue-500/20 dark:border-indigo-500/30 px-2.5 py-1 rounded-full font-mono uppercase tracking-widest font-semibold">C++ + WASM</span>
          </h1>

        </div>

        <div className="flex items-center justify-center md:justify-end gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700/80 text-slate-300 hover:text-white transition-all cursor-pointer shadow-md"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {wasmLoading && (
            <div className="flex items-center gap-2 bg-slate-950/40 border border-slate-900 px-4 py-2.5 rounded-full text-xs text-indigo-400 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Initializing...
            </div>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1 mb-8">
        
        {/* Left Column: 3D Visualizer (Sticky) */}
        <section className="lg:col-span-7 lg:sticky lg:top-8 self-start space-y-6 w-full">
          <div className="space-y-2 flex flex-col">

            <Cube3D
              stickers={stickers}
              currentMove={currentMoveFor3D}
              moveSpeed={moveSpeed}
              onMoveComplete={handleMoveComplete}
              heightClass="h-[450px] lg:h-[calc(100vh-14rem)]"
            />
            
            {/* Action Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <button
                onClick={openModal}
                disabled={isSolving || isPlaying}
                className="flex items-center justify-center gap-2 py-3 px-5 bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/10 text-white rounded-xl shadow-lg border border-indigo-500/20 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm font-semibold"
              >
                <Palette className="w-4 h-4" />
                Paint Cube Colors (Manual Entry)
              </button>
              
              <div className="text-xs text-slate-400 font-mono text-center sm:text-right">
                Current State: <span className="text-indigo-400 font-semibold">{stickers === SOLVED_STICKERS ? 'Solved' : 'Custom'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Controls and Diagnostics (Scrollable independently on desktop) */}
        <section className="lg:col-span-5 lg:h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-3 space-y-6">
          <Controls
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            onSolve={handleSolve}
            onScramble={handleScramble}
            onReset={handleReset}
            isSolving={isSolving}
            isPlaying={isPlaying}
            isValid={isValid}
            
            // Playback props
            moves={solutionMoves}
            currentStepIndex={currentStepIndex}
            setIsPlaying={setIsPlaying}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
            onResetPlayback={handleResetPlayback}
            moveSpeed={moveSpeed}
            setMoveSpeed={setMoveSpeed}
            onClearSolution={() => setSolutionMoves([])}
          />

          <MetricsDashboard
            isValid={isValid}
            validationError={validationError}
            movesCount={metrics.movesCount}
            nodesExplored={metrics.nodesExplored}
            executionTimeMs={metrics.executionTimeMs}
            status={stickers === SOLVED_STICKERS ? 'solved' : metrics.status}
          />
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">

        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5" />
            WASM Solver
          </span>
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            Graph Search
          </span>
        </div>
      </footer>

      {/* Manual Sticker Editor Dialog Modal */}
      <dialog ref={dialogRef} className="p-0" onClick={handleDialogClick}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-400" />
              Manual Sticker Editor
            </h3>
            <button 
              onClick={closeModal} 
              className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700/80 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Dual-view Content Grid (Side-by-side 50/50 split on desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: 3D Live Preview (Large) */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 block mb-1">3D Live Preview</span>
              <Cube3D
                stickers={stickers}
                currentMove={null}
                moveSpeed={100}
                onMoveComplete={null}
                heightClass="h-[340px] md:h-[380px]"
              />
            </div>
            
            {/* Right: 2D Color Net Paint Brush */}
            <div className="space-y-2 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-slate-400 block self-start mb-1">2D Paint Net</span>
              <Cube2D
                stickers={stickers}
                activeColor={activeColor}
                setActiveColor={setActiveColor}
                onStickerClick={handleStickerClick}
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <button 
              onClick={closeModal}
              className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md active:scale-95 transition-all text-sm cursor-pointer"
            >
              Apply & Close
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
