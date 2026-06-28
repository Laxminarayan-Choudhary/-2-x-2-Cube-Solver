import React from 'react';

// Maps face characters to standard color styles
export const COLOR_MAP = {
  'W': { bg: 'bg-white', hex: '#ffffff', label: 'White (Up)' },
  'Y': { bg: 'bg-yellow-400', hex: '#eab308', label: 'Yellow (Down)' },
  'G': { bg: 'bg-emerald-500', hex: '#10b981', label: 'Green (Front)' },
  'B': { bg: 'bg-blue-600', hex: '#2563eb', label: 'Blue (Back)' },
  'O': { bg: 'bg-orange-500', hex: '#f97316', label: 'Orange (Left)' },
  'R': { bg: 'bg-rose-600', hex: '#e11d48', label: 'Red (Right)' }
};

const PALETTE_COLORS = ['W', 'Y', 'G', 'B', 'O', 'R'];

export default function Cube2D({ stickers, activeColor, setActiveColor, onStickerClick }) {
  // Helper to render a 2x2 grid for a single face
  // faceIndexOffset is the starting index in the 24-character stickers string
  const renderFace = (faceName, faceIndexOffset) => {
    const indices = [0, 1, 2, 3].map(i => faceIndexOffset + i);
    
    return (
      <div className="flex flex-col items-center">
        <span className="text-xs font-semibold text-slate-400 mb-1">{faceName}</span>
        <div className="grid grid-cols-2 grid-rows-2 gap-1 p-1.5 bg-slate-950/80 rounded-lg border border-slate-800/80 shadow-inner w-20 h-20">
          {indices.map((idx) => {
            const colorChar = stickers[idx];
            const colorInfo = COLOR_MAP[colorChar] || { bg: 'bg-slate-800' };
            return (
              <button
                key={idx}
                id={`sticker-2d-${idx}`}
                onClick={() => onStickerClick(idx)}
                className={`w-full h-full rounded-md transition-all duration-150 active:scale-95 ${colorInfo.bg} cursor-pointer hover:brightness-110 shadow-sm border border-black/10`}
                title={`Sticker #${idx}`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Color Palette Selection */}
      <div className="w-full">
        <h3 className="text-sm font-medium text-slate-300 mb-3 text-center">Active Paint Brush</h3>
        <div className="flex justify-center gap-2">
          {PALETTE_COLORS.map((colorChar) => {
            const colorInfo = COLOR_MAP[colorChar];
            const isActive = activeColor === colorChar;
            return (
              <button
                key={colorChar}
                id={`color-brush-${colorChar}`}
                onClick={() => setActiveColor(colorChar)}
                className={`w-10 h-10 rounded-xl transition-all duration-200 ${colorInfo.bg} flex items-center justify-center cursor-pointer border-2 relative
                  ${isActive 
                    ? 'border-indigo-400 scale-110 shadow-[0_0_12px_rgba(99,102,241,0.5)] z-10' 
                    : 'border-slate-800 hover:scale-105 opacity-80 hover:opacity-100 hover:border-slate-600'
                  }
                `}
                title={colorInfo.label}
              >
                {isActive && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 rounded-full border border-slate-900 flex items-center justify-center shadow-lg">
                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2D Unfolded Grid Layout */}
      <div className="relative p-6 glass-panel rounded-2xl border border-slate-800/60 shadow-xl overflow-auto w-full max-w-md">
        <div className="grid grid-cols-4 grid-rows-3 gap-y-4 gap-x-2 w-max mx-auto">
          {/* Row 1 */}
          <div className="col-start-1 col-end-1"></div>
          <div className="col-start-2 col-end-2 flex justify-center">
            {renderFace('UP (U)', 0)}
          </div>
          <div className="col-start-3 col-end-3"></div>
          <div className="col-start-4 col-end-4"></div>

          {/* Row 2 */}
          <div className="col-start-1 col-end-1 flex justify-center">
            {renderFace('LEFT (L)', 16)}
          </div>
          <div className="col-start-2 col-end-2 flex justify-center">
            {renderFace('FRONT (F)', 8)}
          </div>
          <div className="col-start-3 col-end-3 flex justify-center">
            {renderFace('RIGHT (R)', 20)}
          </div>
          <div className="col-start-4 col-end-4 flex justify-center">
            {renderFace('BACK (B)', 12)}
          </div>

          {/* Row 3 */}
          <div className="col-start-1 col-end-1"></div>
          <div className="col-start-2 col-end-2 flex justify-center">
            {renderFace('DOWN (D)', 4)}
          </div>
          <div className="col-start-3 col-end-3"></div>
          <div className="col-start-4 col-end-4"></div>
        </div>
        
        <div className="text-center text-xs text-slate-500 mt-4 font-mono">
          Click on any square above to paint it with the selected brush color.
        </div>
      </div>
    </div>
  );
}
