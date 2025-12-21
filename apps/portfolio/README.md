# Digital Garden

Personal portfolio built with React, Vite, React Three Fiber, and post-processing effects.

## Design

Dual-mode UI that switches based on Web3 wallet detection:

- **Default**: Editorial aesthetic (WSJ/Colonial.vc inspired)
- **Crypto Mode**: CAD/terminal aesthetic with CRT effects (activates when MetaMask detected)

## Tech Stack

- React 19 + Vite
- React Three Fiber
- Post-processing effects (Bloom, Noise, Glitch)
- Gaussian Splats

## Development

```bash
pnpm --filter @cool-website/portfolio dev
```

## Build

```bash
pnpm --filter @cool-website/portfolio build
```
