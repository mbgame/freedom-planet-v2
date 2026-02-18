# 🚀 Quick Start Guide

## Installation & Setup

### 1. Extract the project files
Unzip the project to your desired location.

### 2. Install dependencies
```bash
cd planet-explorer
npm install
```

This will install:
- Next.js 14
- React & React DOM
- React Three Fiber & Drei
- Three.js
- Zustand
- TypeScript
- Tailwind CSS

### 3. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app!

---

## What You'll See

### 🌍 Orbit View (Scene 1)
- Beautiful planet with atmosphere glow
- Rotating slowly with subtle camera drift
- 8 glowing cyan nodes on the surface
- Deep space starfield background

**Interaction**: 
- Drag to rotate camera around planet
- Click any cyan node to zoom in

### 🏗 Surface View (Scene 2)
- Ground terrain with grid
- Multiple structures (cylinders, cubes, dodecahedrons)
- 3D floating data labels showing live stats
- Fog effect for depth

**Interaction**:
- Hover over structures to see info panel
- Labels show structure type and telemetry
- Click "Return to Orbit" to go back

---

## Project Structure

```
planet-explorer/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main page
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Styles
│   ├── components/
│   │   ├── 3d/              # All 3D components
│   │   └── ui/              # UI overlays
│   └── store/
│       └── gameStore.ts      # Zustand state
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## Key Files to Explore

### State Management
**`src/store/gameStore.ts`**
- Zustand store with all app state
- Actions to control view, selection, data
- Easy to modify and extend

### 3D Components
**`src/components/3d/Planet.tsx`**
- Planet rendering with atmosphere
- Cloud layer
- Fixed shader

**`src/components/3d/DataLabel.tsx`**
- 3D Billboard text labels
- Always faces camera
- Shows structure stats

**`src/components/3d/Structure.tsx`**
- Surface structures
- Floating animation
- Different types (EXTRACTOR, GENERATOR, PROCESSOR)

### UI Components
**`src/components/ui/UIOverlay.tsx`**
- Main HUD
- Info panels
- Controls

**`src/components/ui/LoadingScreen.tsx`**
- Animated loading screen
- Progress tracking

---

## Customization

### Change Planet Colors
Edit `src/components/3d/Planet.tsx`:
```typescript
const planetMaterial = new THREE.MeshStandardMaterial({
  color: '#1a1a2e',      // Change this
  emissive: '#0a0a1a',   // And this
});
```

### Add More Nodes
Edit `src/store/gameStore.ts`:
```typescript
for (let i = 0; i < 12; i++) {  // Change from 8 to 12
  // ...
}
```

### Modify Structure Data
Edit `src/store/gameStore.ts` in `generateStatsForType()`:
```typescript
case 'EXTRACTOR':
  return [
    { label: 'YOUR_STAT', value: '100%', status: 'good' },
    // Add more stats
  ];
```

### Change Colors
Edit `src/app/globals.css` or `tailwind.config.ts`

---

## Performance Tips

### Already Optimized
✅ Adaptive pixel ratio  
✅ Memoized expensive calculations  
✅ Efficient geometries  
✅ No SSR for 3D  
✅ Code splitting  

### If Performance Issues
1. Reduce sphere segments in Planet.tsx
2. Lower `dpr` in page.tsx from `[1, 2]` to `[1, 1]`
3. Reduce number of stars in StarField
4. Disable shadows in SceneManager

---

## Building for Production

### Build the app
```bash
npm run build
```

### Start production server
```bash
npm start
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

---

## Adding Features

### Load Real Textures
In `Planet.tsx`:
```typescript
const textureLoader = new THREE.TextureLoader();
material.map = textureLoader.load('/textures/planet_albedo.jpg');
material.normalMap = textureLoader.load('/textures/planet_normal.jpg');
```

### Add GLB Models
```bash
npm install @react-three/drei
```

In Structure.tsx:
```typescript
import { useGLTF } from '@react-three/drei';

const { scene } = useGLTF('/models/structure.glb');
return <primitive object={scene} />;
```

### Add Bloom Effect
```bash
npm install postprocessing
```

See React Three Fiber docs for EffectComposer setup.

---

## Troubleshooting

### "Module not found"
Run `npm install` again

### Black screen
Check browser console for errors  
Make sure port 3000 is available

### Low FPS
- Open Chrome DevTools → Performance
- Record a session to see bottlenecks
- Try performance optimizations above

### TypeScript errors
Run `npm run build` to see all errors  
Fix or add `// @ts-ignore` if needed

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Three.js](https://threejs.org/docs/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## Support

For issues or questions:
1. Check README.md
2. Check FIXES.md for implementation details
3. Review component comments
4. Check browser console for errors

---

**Have fun exploring! 🌌**
