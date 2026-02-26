import { create } from 'zustand';
import * as THREE from 'three';
import { getTerrainWorldHeight, getFlatnessScore } from '../utils/terrain';

export type ViewState = 'ORBIT' | 'TRANSITION' | 'SURFACE' | 'MOON';

export interface MoonData {
  id: string;
  size: number;
  distance: number;
  speed: number;
  angle: number;
  color: string;
  description: string;
}

export interface StructureStat {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical';
}

export interface StructureData {
  id: string;
  type: 'Polymer Plants' | 'Robotics Workshop' | 'Aeroponic Farms' | 'Barracks';
  position: [number, number, number];
  rotationY: number;
  stats: StructureStat[];
  amount?: number;
  image?: string;
}

export interface NodeData {
  id: string;
  position: THREE.Vector3;
  structures: StructureData[];
}

interface ThreeDState {
  // View state
  view: ViewState;
  isTransitioning: boolean;

  // Selection state
  selectedNode: NodeData | null;
  selectedStructure: StructureData | null;
  selectedMoon: MoonData | null;

  // Data
  nodes: NodeData[];
  moons: MoonData[];

  // Loading
  isLoading: boolean;
  initialLoadComplete: boolean;
  loadingProgress: number;

  // Actions state
  focusedStructureIndex: number;
  navigationOffset: number;
  heroes: HeroData[];
  spawnedHeroes: SpawnedHero[];
  activeGenerations: Record<string, ActiveGeneration>;
  selectedHeroDetail: HeroData | null;
  isFocusingHeroes: boolean;
  focusedHeroesStructureId: string | null;
  focusedHeroIndex: number;

  // Actions
  setView: (view: ViewState) => void;
  selectNode: (node: NodeData) => void;
  enterSurface: () => void;
  exitSurface: () => void;
  nextStructure: () => void;
  prevStructure: () => void;
  setNavigationOffset: (offset: number) => void;
  setSelectedStructure: (structure: StructureData | null) => void;
  setLoading: (loading: boolean, progress?: number) => void;
  updateStructureStats: (structureId: string, stats: StructureStat[]) => void;
  setFocusedStructure: (structureId: string) => void;
  focusMoon: (moon: MoonData) => void;
  exitMoon: () => void;
  nextMoon: () => void;
  prevMoon: () => void;
  startGeneration: (heroId: string, structureId: string) => void;
  cancelGeneration: (structureId: string) => void;
  spawnHero: (heroId: string, structureId: string) => void;
  setSelectedHeroDetail: (hero: HeroData | null) => void;
  setIsFocusingHeroes: (focus: boolean, structureId?: string | null) => void;
  nextFocusedHero: () => void;
  prevFocusedHero: () => void;
  setNodes: (nodes: NodeData[]) => void;
}



export interface HeroData {
  id: string;
  name: string;
  image: string;
  iconIndex: number; // 0-8 for 3x3 sprite
  level: number;
  duration: number;
  isActive: boolean;
  attack: number;
  defense: number;
  specialAttack: number;
  movementSpeed: number;
  hp: number;
  abilities: string[];
}

// Sample data - in production this would come from an API
const generateMoons = (): MoonData[] => {
  return [
    {
      id: 'moon-phobos',
      size: 0.25,
      distance: 3.8,
      speed: 0.3,
      angle: 0,
      color: '#b0b0b0',
      description: 'A cratered rock captured by gravity.'
    },
    {
      id: 'moon-deimos',
      size: 0.18,
      distance: 5.2,
      speed: 0.2,
      angle: 2.1,
      color: '#908070',
      description: 'Small and irregular, rich in carbon.'
    },
    {
      id: 'moon-triton',
      size: 0.35,
      distance: 7.5,
      speed: 0.1,
      angle: 4.2,
      color: '#aaddff',
      description: 'A captured Kuiper belt object.'
    }
  ];
};

export interface HeroAbility {
  name: string;
  description: string;
}



export interface SpawnedHero {
  id: string;
  heroId: string;
  structureId: string;
  position: [number, number, number];
  spawnedAt: number;
}

export interface ActiveGeneration {
  heroId: string;
  startTime: number;
  duration: number;
}

const HERO_MOCK_DATA: HeroData[] = [
  {
    id: 'hero-1',
    name: 'Neon Blade',
    image: '/images/heroes/heroes.png',
    iconIndex: 0,
    level: 1,
    duration: 120,
    isActive: true,
    attack: 85,
    defense: 45,
    specialAttack: 70,
    movementSpeed: 90,
    hp: 120,
    abilities: ['Quantum Slash', 'Speed Burst', 'Digital Cloak']
  },
  {
    id: 'hero-2',
    name: 'Iron Shield',
    image: '/images/heroes/heroes.png',
    iconIndex: 1,
    level: 1,
    duration: 120,
    isActive: true,
    attack: 40,
    defense: 95,
    specialAttack: 30,
    movementSpeed: 40,
    hp: 250,
    abilities: ['Aegis Wall', 'Taunt', 'Counter-Strike']
  },
  {
    id: 'hero-3',
    name: 'Pulse Mage',
    image: '/images/heroes/heroes.png',
    iconIndex: 2,
    level: 2,
    duration: 240,
    isActive: true,
    attack: 60,
    defense: 35,
    specialAttack: 95,
    movementSpeed: 65,
    hp: 100,
    abilities: ['Arcane Overload', 'Mana Shield', 'Teleport']
  },
  {
    id: 'hero-4',
    name: 'Shadow Scout',
    image: '/images/heroes/heroes.png',
    iconIndex: 3,
    level: 3,
    duration: 360,
    isActive: false,
    attack: 75,
    defense: 30,
    specialAttack: 65,
    movementSpeed: 100,
    hp: 90,
    abilities: ['Assassinate', 'Ambush', 'Smoke Screen']
  },
  {
    id: 'hero-5',
    name: 'Titan',
    image: '/images/heroes/heroes.png',
    iconIndex: 4,
    level: 5,
    duration: 600,
    isActive: false,
    attack: 70,
    defense: 75,
    specialAttack: 50,
    movementSpeed: 30,
    hp: 400,
    abilities: ['Earthquake', 'Titan\'s Grip', 'Unstoppable']
  },
  {
    id: 'hero-6',
    name: 'Nova',
    image: '/images/heroes/heroes.png',
    iconIndex: 5,
    level: 4,
    duration: 480,
    isActive: false,
    attack: 50,
    defense: 40,
    specialAttack: 100,
    movementSpeed: 70,
    hp: 110,
    abilities: ['Supernova', 'Stellar Flare', 'Cosmic Shield']
  }
];

export const useGameStore = create<ThreeDState>((set, get) => ({
  view: 'ORBIT',
  isTransitioning: false,
  selectedNode: null,
  selectedStructure: null,
  focusedStructureIndex: 0,
  navigationOffset: 0,
  nodes: [],
  moons: generateMoons(),
  selectedMoon: null,
  isLoading: true,
  initialLoadComplete: false,
  loadingProgress: 0,
  heroes: HERO_MOCK_DATA,
  spawnedHeroes: [],
  activeGenerations: {},
  selectedHeroDetail: null,
  isFocusingHeroes: false,
  focusedHeroesStructureId: null,
  focusedHeroIndex: 0,
  setNodes: (nodes) => set({ nodes }),

  setView: (view) => set({ view }),

  selectNode: (node) => {
    set({ selectedNode: node, view: 'TRANSITION', isTransitioning: true });
  },

  enterSurface: () => set({ view: 'SURFACE', isTransitioning: false }),

  exitSurface: () => {
    set({
      view: 'ORBIT',
      selectedNode: null,
      selectedStructure: null,
      focusedStructureIndex: 0,
      isTransitioning: false,
      isFocusingHeroes: false,
      focusedHeroesStructureId: null
    });
  },

  nextStructure: () => {
    const { selectedNode, focusedStructureIndex } = get();
    if (!selectedNode || selectedNode.structures.length === 0) return;
    const nextIndex = (focusedStructureIndex + 1) % selectedNode.structures.length;
    set({ focusedStructureIndex: nextIndex, selectedStructure: null });
  },

  prevStructure: () => {
    const { selectedNode, focusedStructureIndex } = get();
    if (!selectedNode || selectedNode.structures.length === 0) return;
    const prevIndex = (focusedStructureIndex - 1 + selectedNode.structures.length) % selectedNode.structures.length;
    set({ focusedStructureIndex: prevIndex, selectedStructure: null });
  },

  setNavigationOffset: (offset) => set({ navigationOffset: offset }),

  setSelectedStructure: (structure) => set((state) => ({
    selectedStructure: structure,
    isFocusingHeroes: structure ? false : state.isFocusingHeroes
  })),

  setLoading: (loading, progress = 0) => {
    const { initialLoadComplete } = get();
    // Once initial load is complete, we don't show the loading screen anymore
    if (initialLoadComplete) {
      set({ isLoading: false, loadingProgress: 100 });
      return;
    }

    if (!loading && progress >= 100) {
      set({ isLoading: false, initialLoadComplete: true, loadingProgress: 100 });
    } else {
      set({ isLoading: loading, loadingProgress: progress });
    }
  },

  updateStructureStats: (structureId, stats) => {
    const nodes = get().nodes.map(node => ({
      ...node,
      structures: node.structures.map(s =>
        s.id === structureId ? { ...s, stats } : s
      )
    }));
    set({ nodes });
  },

  setFocusedStructure: (structureId) => {
    const { selectedNode } = get();
    if (!selectedNode) return;
    const index = selectedNode.structures.findIndex(s => s.id === structureId);
    if (index !== -1) {
      set({ focusedStructureIndex: index });
    }
  },

  focusMoon: (moon) => {
    set({ selectedMoon: moon, view: 'MOON', isTransitioning: false });
  },

  exitMoon: () => {
    set({ view: 'ORBIT', selectedMoon: null, isTransitioning: false });
  },

  nextMoon: () => {
    const { selectedMoon, moons } = get();
    if (!selectedMoon || moons.length === 0) return;
    const index = moons.findIndex(m => m.id === selectedMoon.id);
    const nextIndex = (index + 1) % moons.length;
    set({ selectedMoon: moons[nextIndex], view: 'MOON', isTransitioning: false });
  },

  prevMoon: () => {
    const { selectedMoon, moons } = get();
    if (!selectedMoon || moons.length === 0) return;
    const index = moons.findIndex(m => m.id === selectedMoon.id);
    const prevIndex = (index - 1 + moons.length) % moons.length;
    set({ selectedMoon: moons[prevIndex], view: 'MOON', isTransitioning: false });
  },

  startGeneration: (heroId, structureId) => {
    const hero = get().heroes.find(h => h.id === heroId);
    if (!hero) return;

    set(state => ({
      activeGenerations: {
        ...state.activeGenerations,
        [structureId]: {
          heroId,
          startTime: Date.now(),
          duration: hero.duration
        }
      }
    }));
  },

  cancelGeneration: (structureId) => {
    set(state => {
      const newGenerations = { ...state.activeGenerations };
      delete newGenerations[structureId];
      return { activeGenerations: newGenerations };
    });
  },

  spawnHero: (heroId, structureId) => {
    const { nodes, activeGenerations } = get();
    const structure = nodes.flatMap(n => n.structures).find(s => s.id === structureId);
    if (!structure) return;

    // Layout heroes in a staggered arc to prevent overlap from frontal view
    const count = get().spawnedHeroes.filter(h => h.structureId === structureId).length;
    const offset = 4;
    const angle = structure.rotationY;

    // Spread them laterally (X-axis relative to structure face)
    const lateralSpread = (count % 4 - 1.5) * 3;
    // Stagger depth slightly so they aren't in a perfect line
    const depthStagger = (Math.floor(count / 4)) * 2 + (count % 2) * 0.5;

    // Calculate final position using rotation
    const finalX = structure.position[0] + Math.sin(angle) * (offset + depthStagger) + Math.cos(angle) * lateralSpread;
    const finalZ = structure.position[2] + Math.cos(angle) * (offset + depthStagger) - Math.sin(angle) * lateralSpread;
    const finalY = getTerrainWorldHeight(finalX, finalZ);

    const newSpawn: SpawnedHero = {
      id: `spawn-${Date.now()}`,
      heroId,
      structureId,
      position: [finalX, finalY, finalZ],
      spawnedAt: Date.now()
    };

    set(state => {
      const newGenerations = { ...state.activeGenerations };
      delete newGenerations[structureId];
      return {
        spawnedHeroes: [...state.spawnedHeroes, newSpawn],
        activeGenerations: newGenerations
      };
    });
  },

  setSelectedHeroDetail: (hero) => set({ selectedHeroDetail: hero }),

  setIsFocusingHeroes: (focus, structureId = null) => set({
    isFocusingHeroes: focus,
    focusedHeroesStructureId: structureId,
    focusedHeroIndex: 0
  }),

  nextFocusedHero: () => {
    const { spawnedHeroes, focusedHeroesStructureId, focusedHeroIndex } = get();
    if (!focusedHeroesStructureId) return;
    const heroesCount = spawnedHeroes.filter(h => h.structureId === focusedHeroesStructureId).length;
    if (heroesCount === 0) return;
    set({ focusedHeroIndex: (focusedHeroIndex + 1) % heroesCount });
  },

  prevFocusedHero: () => {
    const { spawnedHeroes, focusedHeroesStructureId, focusedHeroIndex } = get();
    if (!focusedHeroesStructureId) return;
    const heroesCount = spawnedHeroes.filter(h => h.structureId === focusedHeroesStructureId).length;
    if (heroesCount === 0) return;
    set({ focusedHeroIndex: (focusedHeroIndex - 1 + heroesCount) % heroesCount });
  }
}));;
