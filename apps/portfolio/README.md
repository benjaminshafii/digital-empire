# Digital Garden

Open sourcing my personal website. A few fun things packed into it:

## Features

### Wireframe → Splat Transition
The hero section shows a wireframe mesh that can transform into a 3D Gaussian Splat with a "magic reveal" shader effect. Click the `[ LOAD 2026 ]` button to see it.

**How it works:**
1. GLB wireframe model rendered with Three.js `EdgesGeometry` (tri-color segments)
2. Gaussian Splat loaded via [@sparkjsdev/spark](https://github.com/sparkjsdev/spark) `SplatMesh`
3. Custom `objectModifier` shader animates the reveal (radial sweep, noise displacement, glow)
4. Wireframe fades out as splat reveals

### Wallet Detection Mode Switch
Detects `window.ethereum` (MetaMask, etc.) on load and auto-switches to "Technical Mode" - a CAD/terminal aesthetic with neon colors, CRT effects, and monospace everything. Users without wallets see a cleaner editorial layout.

```tsx
if (typeof window !== 'undefined' && (window as any).ethereum) {
  setIsTechnical(true);
}
```

### Post-Processing Effects
Custom shader effects in `src/effects/`:
- **GlitchEffect** - Randomized horizontal slice displacement
- **HologramEffect** - Animated scanlines, edge glow, flicker
- **DitheringOverlayEffect** - Film grain and dither patterns
- Plus standard bloom, chromatic aberration, noise via `@react-three/postprocessing`

## Tools

### `decimate.py` - Blender Mesh Decimation
Python script for Blender that intelligently decimates meshes with different ratios for face vs body regions. Useful for creating low-poly wireframe models from high-poly scans.

```bash
blender --background --python decimate.py -- input.glb output.glb 0.02 0.15 0.5
# Args: body_ratio, face_ratio, face_cutoff_y
```

### Splat Workflow
The `.ply` splat file is pre-cropped and compressed (2.1MB vs 27MB original). To create your own:
1. Capture with a Gaussian Splat app (Luma, Polycam, etc.)
2. Export as `.ply`
3. Use [antimatter15/splat](https://github.com/antimatter15/splat) tools to crop/compress
4. Load with Spark.js `SplatMesh`

## Tech Stack

- React + Vite
- React Three Fiber
- @sparkjsdev/spark (Gaussian Splats)
- @react-three/postprocessing
- Tailwind CSS

## Development

```bash
pnpm --filter @cool-website/portfolio dev
```

Press `Ctrl+Shift+D` in the app to open debug controls for aligning wireframe/splat transforms.
