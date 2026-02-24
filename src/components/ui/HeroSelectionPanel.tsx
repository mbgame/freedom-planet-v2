import React, { useState, useEffect } from 'react';
import { useGameStore, type HeroData } from '@/store/gameStore';

export const HeroSelectionPanel: React.FC = () => {
    const heroes = useGameStore(state => state.heroes);
    const selectedStructure = useGameStore(state => state.selectedStructure);
    const activeGenerations = useGameStore(state => state.activeGenerations);
    const startGeneration = useGameStore(state => state.startGeneration);
    const spawnHero = useGameStore(state => state.spawnHero);
    const isFocusingHeroes = useGameStore(state => state.isFocusingHeroes);
    const setIsFocusingHeroes = useGameStore(state => state.setIsFocusingHeroes);
    const setSelectedStructure = useGameStore(state => state.setSelectedStructure);
    const spawnedHeroesCount = useGameStore(state =>
        selectedStructure ? state.spawnedHeroes.filter(h => h.structureId === selectedStructure.id).length : 0
    );

    const [selectedHeroId, setSelectedHeroId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const currentGen = selectedStructure?.type === 'Barracks' ? activeGenerations[selectedStructure.id] : null;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!selectedStructure || selectedStructure.type !== 'Barracks' || isFocusingHeroes) return null;

    const selectedHero = heroes.find(h => h.id === selectedHeroId);

    return (
        <div className="fixed left-4 right-4 sm:left-auto sm:right-6 top-24 bottom-24 sm:w-80 bg-slate-900/90 border border-cyan-500/30 rounded-xl backdrop-blur-xl pointer-events-auto flex flex-col overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">

            {/* Header */}
            <div className="p-4 border-b border-cyan-500/20 bg-cyan-500/10">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-cyan-400 tracking-tight">BARRACKS</h2>
                        <p className="text-[10px] text-cyan-300/60 uppercase tracking-widest mt-1">Hero Deployment Terminal</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                            {spawnedHeroesCount > 0 && (
                                <button
                                    onClick={() => {
                                        if (selectedStructure) {
                                            setIsFocusingHeroes(true, selectedStructure.id);
                                            setSelectedStructure(null);
                                        }
                                    }}
                                    className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 px-3 py-1.5 rounded text-[10px] font-black tracking-tighter transition-all whitespace-nowrap"
                                >
                                    SHOW HEROES
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedStructure(null)}
                                className="bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-red-400 hover:border-red-500/50 p-1.5 rounded transition-all"
                                title="Close Terminal"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        {currentGen && (
                            <div className="px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded text-[8px] text-red-400 animate-pulse font-mono uppercase">
                                Facility Busy
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hero List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <div className="text-[10px] text-cyan-400/50 uppercase tracking-widest mb-2 font-bold">Selection Matrix</div>

                {heroes.map((hero) => {
                    const isLocked = !hero.isActive;
                    const isSelected = selectedHeroId === hero.id;

                    return (
                        <button
                            key={hero.id}
                            onClick={() => setSelectedHeroId(hero.id)}
                            disabled={isLocked}
                            className={`w-full group relative flex items-center gap-3 p-2 rounded-lg border transition-all duration-300 ${isSelected
                                ? 'bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                                : isLocked
                                    ? 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed'
                                    : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-cyan-500/30'
                                }`}
                        >
                            {/* Hero Image */}
                            <div className="relative w-12 h-12 rounded-md overflow-hidden bg-slate-700 border border-slate-600 flex-shrink-0">
                                <div
                                    className="w-full h-full bg-no-repeat"
                                    style={{
                                        backgroundImage: `url(${hero.image})`,
                                        backgroundSize: '300% 300%',
                                        backgroundPosition: `${(hero.iconIndex % 3) * 50}% ${Math.floor(hero.iconIndex / 3) * 50}%`
                                    }}
                                />
                                {isLocked && (
                                    <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 text-left min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                                        {hero.name.toUpperCase()}
                                    </div>
                                    <div className="text-[9px] text-slate-500 font-mono">LVL {hero.level}</div>
                                </div>
                                <div className="text-[8px] text-slate-500 font-mono mt-0.5">{Math.floor(hero.duration / 60)}m {hero.duration % 60}s ENGAGEMENT</div>
                            </div>

                            {isSelected && !isLocked && (
                                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Generation Logic / Hero Details */}
            <div className="p-4 bg-slate-900/80 border-t border-cyan-500/20">
                {currentGen ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest">
                                Generating: {(heroes.find(h => h.id === currentGen.heroId)?.name || 'Unknown').toUpperCase()}
                            </div>
                            {currentGen ? (() => {
                                const elapsed = ((currentTime - currentGen.startTime) / 1000) * 10;
                                const remaining = Math.max(0, currentGen.duration - elapsed);
                                const m = Math.floor(remaining / 60);
                                const s = Math.floor(remaining % 60);
                                return `${m}:${s.toString().padStart(2, '0')}`;
                            })() : '0:00'}
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                style={{
                                    width: `${currentGen ? Math.min(100, (((currentTime - currentGen.startTime) / 1000) * 10) / currentGen.duration * 100) : 0}%`
                                }}
                            />
                        </div>
                        <p className="text-[9px] text-slate-500 text-center italic uppercase tracking-tighter">Initializing biological synthesis & armor forging...</p>
                    </div>
                ) : selectedHero ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono">
                            <div className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-500">HP:</span>
                                <span className="text-emerald-400 font-bold">{selectedHero.hp}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-500">SPD:</span>
                                <span className="text-cyan-400 font-bold">{selectedHero.movementSpeed}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-500">ATK:</span>
                                <span className="text-red-400 font-bold">{selectedHero.attack}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800 pb-1">
                                <span className="text-slate-500">DEF:</span>
                                <span className="text-blue-400 font-bold">{selectedHero.defense}</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Specialized Abilities</div>
                            <div className="flex flex-wrap gap-1">
                                {selectedHero.abilities.map(ability => (
                                    <span key={ability} className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-[9px] text-cyan-300">
                                        {ability}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => selectedHero && selectedStructure && startGeneration(selectedHero.id, selectedStructure.id)}
                            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-xs uppercase tracking-widest rounded-lg transition-all transform active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)] flex items-center justify-center gap-2"
                        >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Initiate Generation
                        </button>
                    </div>
                ) : (
                    <div className="py-8 text-center bg-slate-900/40 rounded-lg">
                        <div className="text-slate-600 text-[10px] uppercase tracking-[0.2em]">Select Unit Profile</div>
                    </div>
                )}
            </div>
        </div>
    );
};
