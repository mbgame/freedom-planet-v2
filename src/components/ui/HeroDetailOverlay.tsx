'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';

export const HeroDetailOverlay: React.FC = () => {
    const hero = useGameStore(state => state.selectedHeroDetail);
    const setSelectedHeroDetail = useGameStore(state => state.setSelectedHeroDetail);

    if (!hero) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm pointer-events-auto">
            <div
                className="relative w-full max-w-md bg-slate-900/90 border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.2)] animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={() => setSelectedHeroDetail(null)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Hero Header */}
                <div className="p-8 bg-gradient-to-b from-cyan-500/20 to-transparent border-b border-cyan-500/10 text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-slate-800 rounded-2xl border-2 border-cyan-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] overflow-hidden">
                        <div
                            className="w-full h-full bg-no-repeat"
                            style={{
                                backgroundImage: `url(${hero.image})`,
                                backgroundSize: '300% 300%',
                                backgroundPosition: `${(hero.iconIndex % 3) * 50}% ${Math.floor(hero.iconIndex / 3) * 50}%`
                            }}
                        />
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">{hero.name}</h2>
                    <div className="mt-1 px-4 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full inline-block">
                        <span className="text-[10px] text-cyan-300 font-bold tracking-[0.3em] uppercase">Level {hero.level} Unit</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span>Vitality</span>
                                <span className="text-emerald-400">{hero.hp}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (hero.hp / 300) * 100)}%` }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span>Velocity</span>
                                <span className="text-cyan-400">{hero.movementSpeed}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-400" style={{ width: `${hero.movementSpeed}%` }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span>Offense</span>
                                <span className="text-red-400">{hero.attack}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500" style={{ width: `${hero.attack}%` }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <span>Defense</span>
                                <span className="text-blue-400">{hero.defense}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${hero.defense}%` }} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l-2 border-cyan-500 pl-2">Combat Protocol Abilities</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {hero.abilities.map(ability => (
                                <div key={ability} className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg flex items-center gap-3 group hover:border-cyan-500/30 transition-colors">
                                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">{ability.toUpperCase()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Unit ID: {hero.id.toUpperCase()} // STATUS: ACTIVE</p>
                </div>
            </div>

            {/* Backdrop Close */}
            <div
                className="absolute inset-0 -z-10"
                onClick={() => setSelectedHeroDetail(null)}
            />
        </div>
    );
};
