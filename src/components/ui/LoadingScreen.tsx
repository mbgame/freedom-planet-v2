'use client';import { useGameStore } from '@/store/gameStore';

export const LoadingScreen: React.FC = () => {
  const isLoading = useGameStore(state => state.isLoading);
  const progress = useGameStore(state => state.loadingProgress);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-[#020617] z-50 flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-white tracking-tighter">
            AETHER<span className="text-cyan-400">OS</span>
          </h1>
          <p className="text-sm text-cyan-400/60 uppercase tracking-[0.3em]">
            Planetary Systems Monitor
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-80 mx-auto space-y-3">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>INITIALIZING SYSTEMS</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Loading animation */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        {/* Status messages */}
        <div className="text-xs text-slate-600 uppercase tracking-widest">
          {progress < 30 && 'Loading Core Systems...'}
          {progress >= 30 && progress < 60 && 'Initializing 3D Engine...'}
          {progress >= 60 && progress < 90 && 'Connecting to Orbital Network...'}
          {progress >= 90 && 'Ready for Launch...'}
        </div>
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-scan" />
      </div>
    </div>
  );
};
