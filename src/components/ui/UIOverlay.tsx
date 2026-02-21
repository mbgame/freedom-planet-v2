'use client';import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';

export const UIOverlay: React.FC = () => {
  const view = useGameStore(state => state.view);
  const exitSurface = useGameStore(state => state.exitSurface);
  const exitMoon = useGameStore(state => state.exitMoon);
  const moons = useGameStore(state => state.moons);
  const focusMoon = useGameStore(state => state.focusMoon);
  const isTransitioning = useGameStore(state => state.isTransitioning);
  const [showTransition, setShowTransition] = useState(false);

  useEffect(() => {
    if (isTransitioning) {
      setShowTransition(true);
      const timer = setTimeout(() => setShowTransition(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
      {/* Transition overlay */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-700 ${showTransition ? 'opacity-30' : 'opacity-0'
          }`}
      />

      {/* Header */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            AETHER<span className="text-cyan-400">OS</span>
          </h1>
          <p className="text-xs text-cyan-200/70 uppercase tracking-[0.25em] mt-1.5">
            Planetary Systems Monitor
          </p>
        </div>

        {/* Status indicators */}
        {/* <div className="flex gap-3">
          <div className="bg-slate-900/90 border border-slate-700/50 rounded-md px-3 py-1.5 text-xs text-cyan-400 font-mono backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              NET: ONLINE
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-700/50 rounded-md px-3 py-1.5 text-xs text-emerald-400 font-mono backdrop-blur-sm">
            SYS: NOMINAL
          </div>
        </div> */}

        {/* Moon Selection UI */}
        {view === 'ORBIT' && (
          <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="text-[10px] text-cyan-400/80 uppercase tracking-[0.2em] text-right mb-1">
              Select Moons
            </div>
            {moons.map((moon) => (
              <button
                key={moon.id}
                onClick={() => focusMoon(moon)}
                className="group flex items-center justify-end gap-3 px-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-md backdrop-blur-md transition-all hover:bg-cyan-900/30 hover:border-cyan-500/50"
              >
                <span className="text-xs text-slate-300 font-mono capitalize group-hover:text-cyan-300">
                  {moon.id.replace('moon-', '')}
                </span>
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: moon.color,
                    boxShadow: `0 0 6px ${moon.color}`
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between pointer-events-auto">
        {/* Info text */}
        <div className="max-w-md bg-slate-900/80 backdrop-blur-sm border border-slate-700/30 rounded-lg p-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            {view === 'SURFACE' ? (
              <>
                {/* <span className="text-cyan-400 font-semibold">Surface Operations Active.</span>{' '} */}
                {/* Monitor facility structures and their real-time telemetry data. Tap on
                structures to inspect detailed metrics. */}
              </>
            ) : view === 'MOON' ? (
              <>
                <span className="text-cyan-400 font-semibold">Lunar Analysis Active.</span>{' '}
                Scanning surface composition and orbital trajectory.
              </>
            ) : (
              <>
                <span className="text-cyan-400 font-semibold">Orbital Scan Mode.</span>{' '}
                Select a node beacon to initiate surface descent and access ground-level
                facility operations.
              </>
            )}
          </p>
        </div>

        {/* Return button */}
        {(view === 'SURFACE' || view === 'MOON') && (
          <button
            onClick={view === 'SURFACE' ? exitSurface : exitMoon}
            className="group relative px-8 py-3 bg-slate-800/90 text-cyan-400 text-sm font-bold uppercase tracking-wider border border-cyan-500/30 rounded-md backdrop-blur-sm transition-all hover:bg-cyan-900/30 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Return to Orbit
            </span>
          </button>
        )}
      </div>

      {/* Vignette effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />
    </div>
  );
};
