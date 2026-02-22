'use client';

import { useGameStore } from '@/store/gameStore';
import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

export const LoadingScreen: React.FC = () => {
  const initialLoadComplete = useGameStore(state => state.initialLoadComplete);
  const setLoading = useGameStore(state => state.setLoading);

  // Use the reliable useProgress hook from drei
  const { progress, active } = useProgress();

  // Local state for smooth exit animation
  const [mounted, setMounted] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // Sync the progress to the store
  useEffect(() => {
    if (initialLoadComplete) {
      setMounted(false);
      return;
    }

    if (active) {
      setLoading(true, Math.round(progress));
    } else if (progress === 100) {
      // Small delay to ensure everything is actually rendered behind the scenes
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setLoading(false, 100);
          setMounted(false);
        }, 800);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [progress, active, initialLoadComplete, setLoading]);

  // Handle case where nothing might be loading at first
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!active && progress === 0 && !initialLoadComplete) {
        // If after 3 seconds nothing started loading, just fade out
        setFadeOut(true);
        setTimeout(() => {
          setLoading(false, 100);
          setMounted(false);
        }, 800);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [active, progress, initialLoadComplete, setLoading]);

  // If already finished or animation done, don't render anything
  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 bg-[#020617] z-[100] flex items-center justify-center transition-all duration-1000 ease-in-out ${fadeOut ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100'
        }`}
    >
      <div className="text-center space-y-10 max-w-lg px-6">
        {/* Logo/Title */}
        <div className="space-y-4 relative">
          <div className="absolute -inset-16 bg-cyan-500/10 blur-[100px] rounded-full animate-pulse" />
          <h1 className="text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_40px_rgba(34,211,238,0.3)] italic">
            AETHER<span className="text-cyan-400 not-italic">OS</span>
          </h1>
          <p className="text-xs text-cyan-400/40 uppercase tracking-[0.6em] font-light">
            Nexus Protocol • Terminal v4.2
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-80 mx-auto space-y-5">
          <div className="relative h-1.5 bg-slate-900/80 rounded-full overflow-hidden backdrop-blur-md border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(34,211,238,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono tracking-[0.2em]">
            <span className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              INITIALIZING_UPLINK
            </span>
            <span className="text-cyan-400 font-bold">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Status messages */}
        <div className="h-6">
          <p className="text-[10px] text-cyan-500/60 uppercase tracking-[0.4em] animate-pulse font-mono">
            {progress < 25 && 'Establishing bypass...'}
            {progress >= 25 && progress < 50 && 'Injecting visual modules...'}
            {progress >= 50 && progress < 75 && 'Compiling orbital shaders...'}
            {progress >= 75 && progress < 100 && 'Rendering matrix topology...'}
            {progress >= 100 && 'Uplink successful.'}
          </p>
        </div>
      </div>

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 z-[-1] opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#1e293b 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />

      {/* Decorative HUD elements */}
      <div className="absolute top-12 left-12 text-[10px] font-mono text-cyan-500/30 space-y-2 border-l border-cyan-500/20 pl-4">
        <div>NODE_ID: SOL_03</div>
        <div>SYS_LOAD: PASS</div>
        <div>ENCRYPT: AES-256</div>
      </div>

      <div className="absolute bottom-12 right-12 text-[10px] font-mono text-cyan-500/30 border-r border-cyan-500/20 pr-4 text-right">
        MEMORY_BUFFER: OK<br />
        LATENCY: 14ms
      </div>

      {/* Scanline / CRT effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-10 bg-[length:100%_3px,3px_100%] opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent animate-scan h-full w-full opacity-40 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
      </div>
    </div>
  );
};
