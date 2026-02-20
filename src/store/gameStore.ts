import { create } from 'zustand';
import * as THREE from 'three';

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
  type: 'Polymer Plants' | 'Robotics Workshop' | 'Aeroponic Farms';
  position: [number, number, number];
  stats: StructureStat[];
}

export interface NodeData {
  id: string;
  position: THREE.Vector3;
  structures: StructureData[];
}

interface GameState {
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
  loadingProgress: number;

  // Actions
  focusedStructureIndex: number;
  navigationOffset: number;

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
}

// Sample data - in production this would come from an API
const generateNodes = (): NodeData[] => {
  const nodes: NodeData[] = [];
  const phiSpan = Math.PI * 2;
  const thetaSpan = Math.PI;
  const radius = 2.05;
  const MIN_NODE_DISTANCE = 1.2;

  for (let i = 0; i < 8; i++) {
    let x = 0, y = 0, z = 0;
    let foundNodePos = false;
    let nodeAttempts = 0;

    while (!foundNodePos && nodeAttempts < 100) {
      nodeAttempts++;
      const phi = Math.random() * phiSpan;
      const theta = Math.random() * thetaSpan;

      x = radius * Math.sin(theta) * Math.cos(phi);
      y = radius * Math.sin(theta) * Math.sin(phi);
      z = radius * Math.cos(theta);

      let tooClose = false;
      for (const existingNode of nodes) {
        const dist = existingNode.position.distanceTo(new THREE.Vector3(x, y, z));
        if (dist < MIN_NODE_DISTANCE) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        foundNodePos = true;
      }
    }

    // Generate 2-4 structures per node
    const structureCount = 2 + Math.floor(Math.random() * 3);
    const structures: StructureData[] = [];

    const MIN_STR_DISTANCE = 12;
    const SPAWN_RANGE = 40;

    for (let j = 0; j < structureCount; j++) {
      const types: ('Polymer Plants' | 'Robotics Workshop' | 'Aeroponic Farms')[] = ['Polymer Plants', 'Robotics Workshop', 'Aeroponic Farms'];
      const type = types[Math.floor(Math.random() * types.length)];

      let xPos = (Math.random() - 0.5) * SPAWN_RANGE;
      let zPos = (Math.random() - 0.5) * SPAWN_RANGE;
      let attempts = 0;
      let isTooClose = true;

      while (isTooClose && attempts < 50) {
        attempts++;
        isTooClose = false;

        xPos = (Math.random() - 0.5) * SPAWN_RANGE;
        zPos = (Math.random() - 0.5) * SPAWN_RANGE;

        for (const existing of structures) {
          const dx = xPos - existing.position[0];
          const dz = zPos - existing.position[2];
          const distance = Math.sqrt(dx * dx + dz * dz);

          if (distance < MIN_STR_DISTANCE) {
            isTooClose = true;
            break;
          }
        }
      }

      structures.push({
        id: `${type.toLowerCase().replace(/\s+/g, '-')}-${i}-${j}`,
        type,
        position: [xPos, 1, zPos],
        stats: generateStatsForType(type)
      });
    }

    nodes.push({
      id: `node-${i}`,
      position: new THREE.Vector3(x, y, z),
      structures
    });
  }

  return nodes;
};

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

const generateStatsForType = (type: string): StructureStat[] => {
  switch (type) {
    case 'Aeroponic Farms':
      return [
        { label: 'YIELD', value: `${60 + Math.floor(Math.random() * 40)}%`, status: Math.random() > 0.3 ? 'good' : 'warning' },
        { label: 'HUMIDITY', value: `${70 + Math.floor(Math.random() * 20)}%`, status: Math.random() > 0.5 ? 'good' : 'warning' },
        { label: 'SYSTEMS', value: 'OPTIMAL', status: 'good' },
      ];
    case 'Polymer Plants':
      return [
        { label: 'PURITY', value: `${95 + Math.floor(Math.random() * 5)}%`, status: 'good' },
        { label: 'THERMAL', value: `${300 + Math.floor(Math.random() * 200)}°C`, status: Math.random() > 0.4 ? 'good' : 'warning' },
      ];
    case 'Robotics Workshop':
      return [
        { label: 'STATUS', value: Math.random() > 0.1 ? 'ACTIVE' : 'IDLE', status: Math.random() > 0.1 ? 'good' : 'warning' },
        { label: 'BOTS', value: `${10 + Math.floor(Math.random() * 20)} Units`, status: 'good' },
        { label: 'QUEUE', value: `${Math.floor(Math.random() * 5)} Pending`, status: 'good' },
      ];
    default:
      return [];
  }
};

export const useGameStore = create<GameState>((set, get) => ({
  view: 'ORBIT',
  isTransitioning: false,
  selectedNode: null,
  selectedStructure: null,
  focusedStructureIndex: 0,
  navigationOffset: 0,
  nodes: generateNodes(),
  moons: generateMoons(),
  selectedMoon: null,
  isLoading: true,
  loadingProgress: 0,

  setView: (view) => set({ view }),

  selectNode: (node) => {
    set({ selectedNode: node, view: 'TRANSITION', isTransitioning: true });
    // Simulate transition time
    setTimeout(() => set({ isTransitioning: false }), 1500);
  },

  enterSurface: () => set({ view: 'SURFACE', isTransitioning: false }),

  exitSurface: () => {
    set({
      view: 'ORBIT',
      selectedNode: null,
      selectedStructure: null,
      focusedStructureIndex: 0,
      isTransitioning: true
    });
    // Reset transition state after orbit return
    setTimeout(() => set({ isTransitioning: false }), 1500);
  },

  nextStructure: () => {
    const { selectedNode, focusedStructureIndex } = get();
    if (!selectedNode || selectedNode.structures.length === 0) return;
    const nextIndex = (focusedStructureIndex + 1) % selectedNode.structures.length;
    set({ focusedStructureIndex: nextIndex });
  },

  prevStructure: () => {
    const { selectedNode, focusedStructureIndex } = get();
    if (!selectedNode || selectedNode.structures.length === 0) return;
    const prevIndex = (focusedStructureIndex - 1 + selectedNode.structures.length) % selectedNode.structures.length;
    set({ focusedStructureIndex: prevIndex });
  },

  setNavigationOffset: (offset) => set({ navigationOffset: offset }),

  setSelectedStructure: (structure) => set({ selectedStructure: structure }),

  setLoading: (loading, progress = 0) => set({ isLoading: loading, loadingProgress: progress }),

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
    set({ selectedMoon: moon, view: 'MOON', isTransitioning: true });
    setTimeout(() => set({ isTransitioning: false }), 1000);
  },

  exitMoon: () => {
    set({ view: 'ORBIT', selectedMoon: null, isTransitioning: true });
    setTimeout(() => set({ isTransitioning: false }), 1000);
  }
}));
