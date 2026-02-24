'use client';
import React from 'react';
import { useGameStore } from '@/store/gameStore';

export const HeroViewControls: React.FC = () => {
    const isFocusingHeroes = useGameStore(state => state.isFocusingHeroes);
    const focusedHeroesStructureId = useGameStore(state => state.focusedHeroesStructureId);
    const focusedHeroIndex = useGameStore(state => state.focusedHeroIndex);
    const nextFocusedHero = useGameStore(state => state.nextFocusedHero);
    const prevFocusedHero = useGameStore(state => state.prevFocusedHero);
    const setIsFocusingHeroes = useGameStore(state => state.setIsFocusingHeroes);
    const setSelectedStructure = useGameStore(state => state.setSelectedStructure);
    const setSelectedHeroDetail = useGameStore(state => state.setSelectedHeroDetail);
    const spawnedHeroes = useGameStore(state => state.spawnedHeroes);
    const heroes = useGameStore(state => state.heroes);
    const nodes = useGameStore(state => state.nodes);

    if (!isFocusingHeroes) return null;

    const filteredHeroes = spawnedHeroes.filter(h => h.structureId === focusedHeroesStructureId);
    const currentHeroData = filteredHeroes[focusedHeroIndex];
    const currentHeroInfo = currentHeroData ? heroes.find(h => h.id === currentHeroData.heroId) : null;

    const handleExit = () => {
        // Find the structure to re-select it
        if (focusedHeroesStructureId) {
            const structure = nodes.flatMap(n => n.structures).find(s => s.id === focusedHeroesStructureId);
            if (structure) {
                setSelectedStructure(structure);
            }
        }
        setIsFocusingHeroes(false, null);
    };

    return (
        <div className="fixed bottom-6 sm:bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-500 w-[95vw] sm:w-auto max-w-2xl">
            <div className="bg-slate-900/95 border border-cyan-500/50 rounded-2xl p-3 sm:p-4 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row items-center gap-4 sm:gap-6">

                {/* Hero Navigation */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                    <button
                        onClick={prevFocusedHero}
                        className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-full border border-cyan-500/20 transition-all hover:scale-110 active:scale-95"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="flex flex-col items-center min-w-[120px] sm:min-w-[140px]">
                        <span className="text-[8px] sm:text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                            Unit {focusedHeroIndex + 1} of {filteredHeroes.length}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-white uppercase italic tracking-tighter text-center">
                            {currentHeroInfo?.name || 'Unknown Unit'}
                        </span>
                    </div>

                    <button
                        onClick={nextFocusedHero}
                        className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-full border border-cyan-500/20 transition-all hover:scale-110 active:scale-95"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                <div className="hidden sm:block h-8 w-px bg-slate-800" />

                {/* Actions */}
                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => currentHeroInfo && setSelectedHeroDetail(currentHeroInfo)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-xl font-bold text-[9px] sm:text-[10px] uppercase tracking-widest transition-all"
                    >
                        Details
                    </button>

                    <button
                        onClick={handleExit}
                        className="flex-1 sm:flex-none group flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                    >
                        Exit
                    </button>
                </div>
            </div>
        </div>
    );
};
