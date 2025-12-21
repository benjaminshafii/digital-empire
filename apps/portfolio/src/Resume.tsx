import React, { useRef, useMemo, Suspense, useState, useEffect, memo } from 'react';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera, shaderMaterial, OrbitControls } from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
} from '@react-three/postprocessing';
import { GlitchEffect } from './effects/GlitchEffect';
import * as THREE from 'three';
import { EditorialResume } from './EditorialResume';
import { CV } from './CV';

// Data types - exported for use in other components
export interface DataModule {
  ZERO_FINANCE_CONTENT: typeof import('./data').ZERO_FINANCE_CONTENT;
  BENJAMIN_PROFILE: typeof import('./data').BENJAMIN_PROFILE;
  UI_LABELS: typeof import('./data').UI_LABELS;
}
import { GitHubContributions } from './GitHubContributions';
import { SplatMesh, dyno } from '@sparkjsdev/spark';

// --- 3D & Technical Components ---

// 4-color CAD palette - direction-binned, discrete hues
const UVGridMaterial = shaderMaterial(
  {
    uFrequency: new THREE.Vector2(24, 36), // spanwise/chordwise panels
    uLineWidth: 0.014,
    uColor: new THREE.Color(0xf3ff6a), // yellow-green tint
  },
  // Vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader - crisp CAD panel grid
  `
    uniform vec2 uFrequency;
    uniform float uLineWidth;
    uniform vec3 uColor;
    varying vec2 vUv;

    void main() {
      vec2 grid = fract(vUv * uFrequency);
      float gx = step(grid.x, uLineWidth) + step(1.0 - uLineWidth, grid.x);
      float gy = step(grid.y, uLineWidth) + step(1.0 - uLineWidth, grid.y);
      float gridLine = max(gx, gy);

      if (gridLine < 0.5) discard;

      vec3 finalColor = mix(vec3(1.0), uColor, 0.15);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
);

extend({ UVGridMaterial });

// Model paths - Ben's wireframe model (decimated to 10% for clean video game wireframe look)
const BEN_WIREFRAME_MODEL = '/ben_wireframe_lowpoly.glb';

// Legacy models for other sections
const MODELS = [
  BEN_WIREFRAME_MODEL,                    // Section 1 - Ben wireframe
  '/Space Shuttle (D) eng.glb',           // Section 2
  '/GL Transmission Format - Binary.glb', // Section 3
  '/Space Shuttle (D) eng.glb',           // Section 4
  '/GL Transmission Format - Binary.glb', // Section 5
  '/Space Shuttle (D) eng.glb',           // Section 6
];

// Preload models
useGLTF.preload(BEN_WIREFRAME_MODEL);
MODELS.forEach((model) => useGLTF.preload(model));

interface WireframeAppearance {
  edgeThreshold: number;
  lineOpacity: number;
  color1: string;
  color2: string;
  color3: string;
  showAllEdges: boolean;
}

interface WireframeRocketProps {
  scrollProgress: number;
  rotation: { x: number; y: number; z: number };
  scale: number;
  position: { x: number; y: number; z: number };
  customModels?: string[]; // Optional custom model path
  appearance?: WireframeAppearance;
  fadeOut?: boolean; // When true, triggers a 3s fade out animation
}

// Subtle camera drift component
function CameraDrift() {
  useFrame((state) => {
    if (state.camera) {
      // Very subtle camera position drift
      state.camera.position.x +=
        Math.sin(state.clock.elapsedTime * 0.1) * 0.002;
      state.camera.position.y +=
        Math.cos(state.clock.elapsedTime * 0.08) * 0.002;

      // Make camera look at center with subtle variation
      const target = new THREE.Vector3(
        Math.sin(state.clock.elapsedTime * 0.05) * 0.1,
        Math.cos(state.clock.elapsedTime * 0.07) * 0.1,
        0,
      );
      state.camera.lookAt(target);
    }
  });
  return null;
}

function WireframeRocket({
  scrollProgress,
  rotation,
  scale,
  position,
  customModels,
  appearance,
  fadeOut = false,
}: WireframeRocketProps) {
  // Determine which model to show based on scroll progress
  const modelIndex = Math.min(Math.floor(scrollProgress * 7), 5);
  const modelPath = customModels && customModels[modelIndex]
    ? customModels[modelIndex]
    : MODELS[Math.min(modelIndex, MODELS.length - 1)]; 

  const { scene } = useGLTF(modelPath);
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<THREE.LineBasicMaterial[]>([]);
  const fadeStartTimeRef = useRef<number | null>(null);

  // Track when fadeOut starts
  useEffect(() => {
    if (fadeOut && !fadeStartTimeRef.current) {
      fadeStartTimeRef.current = Date.now();
    } else if (!fadeOut) {
      fadeStartTimeRef.current = null;
    }
  }, [fadeOut]);

  // Color palette from appearance prop or defaults
  const colorPalette = useMemo(
    () => [
      appearance?.color1 || '#1b29ff', // primary blue
      appearance?.color2 || '#ff3d5b', // risograph red
      appearance?.color3 || '#00ff88', // bright green/cyan
    ],
    [appearance?.color1, appearance?.color2, appearance?.color3],
  );

  const edgeThreshold = appearance?.edgeThreshold ?? 1;
  const lineOpacity = appearance?.lineOpacity ?? 1.0;
  const showAllEdges = appearance?.showAllEdges ?? false;

  const edgeLines = useMemo(() => {
    const lines: React.ReactElement[] = [];
    materialsRef.current = []; // Reset materials array

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // Use threshold from appearance, or show all edges if enabled
        const edges = showAllEdges 
          ? new THREE.WireframeGeometry(child.geometry)
          : new THREE.EdgesGeometry(child.geometry, edgeThreshold);

        // Split edges into 3 parts and color each differently
        const positions = edges.attributes.position;
        const count = positions.count;
        const third = Math.floor(count / 3);

        // Create 3 separate geometries for each color
        for (let i = 0; i < 3; i++) {
          const start = i * third * 3;
          const end = i === 2 ? count * 3 : (i + 1) * third * 3;
          const segmentPositions = new Float32Array(end - start);
          
          for (let j = start; j < end; j++) {
            segmentPositions[j - start] = positions.array[j];
          }
          
          const segmentGeometry = new THREE.BufferGeometry();
          segmentGeometry.setAttribute('position', new THREE.BufferAttribute(segmentPositions, 3));
          
          const material = new THREE.LineBasicMaterial({
            color: colorPalette[i],
            transparent: true,
            opacity: lineOpacity,
          });
          materialsRef.current.push(material);

          lines.push(
            <lineSegments key={`${child.uuid}-${i}`} geometry={segmentGeometry} material={material} />,
          );
        }
      }
    });

    return lines;
  }, [scene, colorPalette, modelPath, edgeThreshold, lineOpacity, showAllEdges]);

  useFrame(() => {
    // Handle fade out animation (3 seconds)
    if (fadeOut && fadeStartTimeRef.current && materialsRef.current.length > 0) {
      const elapsed = Date.now() - fadeStartTimeRef.current;
      const fadeDuration = 3000; // 3 seconds
      const progress = Math.min(elapsed / fadeDuration, 1);
      const newOpacity = lineOpacity * (1 - progress);
      
      materialsRef.current.forEach(mat => {
        mat.opacity = newOpacity;
      });
    }
  });

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      scale={scale}
    >
      <primitive object={scene} visible={false} />
      {edgeLines}
    </group>
  );
}

// CRT effect - scanlines, grain, minimal RGB split
function CRTEffect() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {/* Strong Film Grain - higher opacity and finer texture */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      {/* Secondary coarser grain layer for more texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter2'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.4' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter2)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      {/* Scanlines - faint, ~15-20% opacity */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px)',
        }}
      />
      {/* Cross-shaped subpixel mask - very subtle */}
      <div
        className="absolute inset-0 opacity-[0.26]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 2.8px, rgba(255,255,255,0.015) 2.8px, rgba(255,255,255,0.015) 5.6px),
            repeating-linear-gradient(90deg, transparent, transparent 2.8px, rgba(255,255,255,0.015) 2.8px, rgba(255,255,255,0.015) 5.6px)
          `,
        }}
      />
    </div>
  );
}

// CAD Viewport - AutoCAD-style viewport with corner brackets and technical annotations
interface CADViewportProps {
  children: React.ReactNode;
  label?: string;
  viewType?: string;
  className?: string;
}

function CADViewport({
  children,
  label = 'VIEWPORT_3D',
  viewType = 'PERSPECTIVE',
  className = '',
}: CADViewportProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{ backgroundColor: '#000000' }}
    >
      {/* Main content */}
      <div className="w-full h-full relative">{children}</div>

      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-6 h-6 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-[#00FF00]"></div>
        <div className="absolute top-0 left-0 w-[2px] h-full bg-[#00FF00]"></div>
      </div>
      <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none">
        <div className="absolute top-0 right-0 w-full h-[2px] bg-[#00FF00]"></div>
        <div className="absolute top-0 right-0 w-[2px] h-full bg-[#00FF00]"></div>
      </div>
      <div className="absolute bottom-0 left-0 w-6 h-6 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#00FF00]"></div>
        <div className="absolute bottom-0 left-0 w-[2px] h-full bg-[#00FF00]"></div>
      </div>
      <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-full h-[2px] bg-[#00FF00]"></div>
        <div className="absolute bottom-0 right-0 w-[2px] h-full bg-[#00FF00]"></div>
      </div>

      {/* Technical annotations */}
      <div className="absolute top-1 left-8 font-mono text-[9px] text-[#00FF00] tracking-wider pointer-events-none uppercase">
        [ {label} ]
      </div>
      <div className="absolute top-1 right-8 font-mono text-[9px] text-[#00FFFF] tracking-wider pointer-events-none uppercase">
        {viewType}
      </div>

      {/* Grid coordinates - bottom left */}
      <div className="absolute bottom-1 left-8 font-mono text-[8px] text-[#00FF00]/60 tracking-wider pointer-events-none">
        GRID: ENABLED
      </div>

      {/* Viewport info - bottom right */}
      <div className="absolute bottom-1 right-8 font-mono text-[8px] text-[#00FFFF]/60 tracking-wider pointer-events-none">
        RENDER: WIREFRAME
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 19px, #00FF00 19px, #00FF00 20px),
            repeating-linear-gradient(90deg, transparent, transparent 19px, #00FF00 19px, #00FF00 20px)
          `,
        }}
      />
    </div>
  );
}

// Spark.js Splat component - MUST be defined outside TechnicalResume to prevent re-mounting on parent state changes
interface SparkSplatViewerProps {
  scale: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

const SparkSplatViewer = memo(function SparkSplatViewer({ 
  scale, 
  position, 
  rotation 
}: SparkSplatViewerProps) {
  const { scene } = useThree();
  const splatMeshRef = useRef<SplatMesh | null>(null);
  const animateTRef = useRef<any>(null);
  const baseTimeRef = useRef(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Store latest props in refs to avoid re-creating splat
  const propsRef = useRef({ scale, position, rotation });
  propsRef.current = { scale, position, rotation };

  // Create splat only once on mount
  useEffect(() => {
    // Create animation time uniform
    const animateT = dyno.dynoFloat(0);
    animateTRef.current = animateT;

    // Create SplatMesh with pre-cropped compressed ply (2.1MB vs 27MB original)
    const splatMesh = new SplatMesh({ url: '/gs_ben_cropped.compressed.ply' });
    splatMeshRef.current = splatMesh;
    
    // Set initial transform from refs
    const { scale: s, position: p, rotation: r } = propsRef.current;
    splatMesh.quaternion.setFromEuler(new THREE.Euler(r.x, r.y, r.z));
    splatMesh.position.set(p.x, p.y, p.z);
    splatMesh.scale.setScalar(s);
    
    scene.add(splatMesh);

    // Wait for splat to load, then apply shader effect
    const checkLoaded = setInterval(() => {
      if (splatMesh.packedSplats && splatMesh.packedSplats.numSplats > 0) {
        setIsLoaded(true);
        clearInterval(checkLoaded);
        
        // Apply Magic reveal effect shader (splat is pre-cropped, no runtime clipping needed)
        splatMesh.objectModifier = dyno.dynoBlock(
          { gsplat: dyno.Gsplat },
          { gsplat: dyno.Gsplat },
          ({ gsplat }) => {
            const d = new dyno.Dyno({
              inTypes: { gsplat: dyno.Gsplat, t: "float" },
              outTypes: { gsplat: dyno.Gsplat },
              globals: () => [
                dyno.unindent(`
                  // Pseudo-random hash function
                  vec3 hash(vec3 p) {
                    p = fract(p * 0.3183099 + 0.1);
                    p *= 17.0;
                    return fract(vec3(p.x * p.y * p.z, p.x + p.y * p.z, p.x * p.y + p.z));
                  }

                  // 3D Perlin-style noise function
                  vec3 noise(vec3 p) {
                    vec3 i = floor(p);
                    vec3 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    
                    vec3 n000 = hash(i + vec3(0,0,0));
                    vec3 n100 = hash(i + vec3(1,0,0));
                    vec3 n010 = hash(i + vec3(0,1,0));
                    vec3 n110 = hash(i + vec3(1,1,0));
                    vec3 n001 = hash(i + vec3(0,0,1));
                    vec3 n101 = hash(i + vec3(1,0,1));
                    vec3 n011 = hash(i + vec3(0,1,1));
                    vec3 n111 = hash(i + vec3(1,1,1));
                    
                    vec3 x0 = mix(n000, n100, f.x);
                    vec3 x1 = mix(n010, n110, f.x);
                    vec3 x2 = mix(n001, n101, f.x);
                    vec3 x3 = mix(n011, n111, f.x);
                    
                    vec3 y0 = mix(x0, x1, f.y);
                    vec3 y1 = mix(x2, x3, f.y);
                    
                    return mix(y0, y1, f.z);
                  }
                `)
              ],
              statements: ({ inputs, outputs }) => dyno.unindentLines(`
                ${outputs.gsplat} = ${inputs.gsplat};
                float t = ${inputs.t};
                
                vec3 localPos = ${inputs.gsplat}.center;
                vec3 scales = ${inputs.gsplat}.scales;
                
                // Stronger reveal animation (faster, more dramatic)
                float revealSpeed = 1.5;
                float s = smoothstep(0., 8., t * revealSpeed - 3.0) * 10.;
                float l = length(localPos.xz);
                
                // Enhanced Magic Effect with stronger distortion
                float border = abs(s - l - .5);
                float distortionStrength = 0.3;
                localPos *= 1. - distortionStrength * exp(-15. * border);
                
                // Scale transition (particles shrink before reveal)
                vec3 finalScales = mix(scales, vec3(0.001), smoothstep(s - .5, s, l + .5));
                
                // Add noise displacement with stronger effect
                float noiseStrength = 0.15;
                vec3 noiseOffset = noiseStrength * noise(localPos.xyz * 2. + t * 0.8) * smoothstep(s - .5, s, l + .5);
                ${outputs.gsplat}.center = localPos + noiseOffset;
                ${outputs.gsplat}.scales = finalScales;
                
                // Radial reveal with glow
                float at = atan(localPos.x, localPos.z) / 3.1416;
                ${outputs.gsplat}.rgba *= step(at, t * revealSpeed - 3.1416);
                
                // Glow effects - fade out after reveal completes
                float glowFade = 1.0 - smoothstep(4., 6., t); // Fade out glow between t=4 and t=6
                float borderGlow = exp(-15. * border) * 0.6 * glowFade;
                float sweepGlow = exp(-40. * abs(t * revealSpeed - at - 3.1416)) * 0.3 * glowFade;
                ${outputs.gsplat}.rgba += borderGlow + sweepGlow;
                
                // Clamp to prevent over-bright pixels
                ${outputs.gsplat}.rgba = clamp(${outputs.gsplat}.rgba, vec4(0.), vec4(1.));
              `),
            });

            gsplat = d.apply({ 
              gsplat, 
              t: animateT,
            }).gsplat;
            
            return { gsplat };
          }
        );

        splatMesh.updateGenerator();
      }
    }, 100);

    return () => {
      clearInterval(checkLoaded);
      scene.remove(splatMesh);
      splatMesh.dispose?.();
    };
  }, [scene]);

  // Animate the reveal effect only - no mouse/auto rotation (wireframe handles that)
  useFrame(() => {
    if (isLoaded && animateTRef.current && splatMeshRef.current) {
      const { scale: s, position: p, rotation: r } = propsRef.current;
      
      // Update animation time for reveal effect
      baseTimeRef.current += 1/60;
      animateTRef.current.value = baseTimeRef.current;
      splatMeshRef.current.updateVersion();
      
      // Apply transform directly from props - no extra rotation
      splatMeshRef.current.quaternion.setFromEuler(new THREE.Euler(r.x, r.y, r.z));
      splatMeshRef.current.position.set(p.x, p.y, p.z);
      splatMeshRef.current.scale.setScalar(s);
    }
  });

  return null;
});

// Section definitions for navigation (desktop has all, mobile uses MOBILE_SECTIONS)
const SECTIONS = [
  { id: 'profile', label: 'OVERVIEW', shortLabel: 'HOME', color: '#00FFFF' },
  { id: '0finance', label: '0.FINANCE', shortLabel: '0.FI', color: '#00FFFF' },
  { id: 'gnosis', label: 'GNOSIS_PAY', shortLabel: 'GNO', color: '#FFFF00' },
  { id: 'request', label: 'REQUEST', shortLabel: 'REQ', color: '#FF00FF' },
  { id: 'notecompanion', label: 'NOTE_COMPANION', shortLabel: 'NOTE', color: '#00FF00' },
  { id: 'contact', label: 'CONTACT', shortLabel: 'MSG', color: '#FF00FF' },
  { id: 'cv-section', label: 'RESUME', shortLabel: 'CV', color: '#00FFFF' },
] as const;

// Simplified mobile navigation
const MOBILE_SECTIONS = [
  { id: 'profile', label: 'HOME', color: '#00FFFF' },
  { id: '0finance', label: 'WORK', color: '#00FF00' },
  { id: 'contact', label: 'MSG', color: '#FF00FF' },
  { id: 'cv-section', label: 'CV', color: '#00FFFF' },
] as const;

// Model controls state for debugging
interface ModelControls {
  cameraPosition: [number, number, number];
  cameraFov: number;
  rotation: { x: number; y: number; z: number };
  scale: number;
  position: { x: number; y: number; z: number };
}

interface TechnicalResumeProps {
  onToggle: () => void;
  data: DataModule;
}

function TechnicalResume({ onToggle, data }: TechnicalResumeProps) {
  const [activeSection, setActiveSection] = useState('profile');
  const [isMobile, setIsMobile] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // 'splat-points' = splat with magic reveal, 'wireframe' = ben wireframe model (default), 'superimpose' = both (debug only)
  const [renderMode, setRenderMode] = useState<'splat-points' | 'wireframe' | 'superimpose'>('wireframe');

  const content = data.ZERO_FINANCE_CONTENT.crypto;
  const ui = data.UI_LABELS;
  
  // Dynamic sections using UI labels from data
  const sections = useMemo(() => [
    { id: 'profile', label: 'OVERVIEW', shortLabel: 'HOME', color: '#00FFFF' },
    { id: '0finance', label: '0.FINANCE', shortLabel: '0.FI', color: '#00FFFF' },
    { id: 'gnosis', label: 'GNOSIS_PAY', shortLabel: 'GNO', color: '#FFFF00' },
    { id: 'request', label: 'REQUEST', shortLabel: 'REQ', color: '#FF00FF' },
    { id: 'notecompanion', label: 'NOTE_COMPANION', shortLabel: 'NOTE', color: '#00FF00' },
    { id: 'contact', label: 'CONTACT', shortLabel: 'MSG', color: '#FF00FF' },
    ...(ui.showCvSection ? [{ id: 'cv-section', label: ui.aboutSectionLabel, shortLabel: 'CV', color: '#00FFFF' }] : []),
  ], [ui.aboutSectionLabel, ui.showCvSection]);
  
  const mobileSections = useMemo(() => [
    { id: 'profile', label: 'HOME', color: '#00FFFF' },
    { id: '0finance', label: 'WORK', color: '#00FF00' },
    { id: 'contact', label: 'MSG', color: '#FF00FF' },
    ...(ui.showCvSection ? [{ id: 'cv-section', label: 'CV', color: '#00FFFF' }] : []),
  ], [ui.showCvSection]);

  // Model controls for wireframe - this is the main control, splat uses same values
  const [wireframeControl, setWireframeControl] = useState<ModelControls>({
    cameraPosition: [0, 0.2, 7.8],
    cameraFov: 45,
    rotation: { x: 0, y: 0.59, z: 0 },
    scale: 1.53,
    position: { x: 0, y: 2.8, z: 0.05 },
  });
  
  // Splat offset - the .ply data is oriented/positioned differently than the .glb
  // These offsets are ADDED to wireframeControl values
  const [splatRotationOffset, setSplatRotationOffset] = useState({ x: 3.21, y: -1.18, z: 0.01 });
  const [splatPositionOffset, setSplatPositionOffset] = useState({ x: 0, y: -1.42, z: 0 });
  const [splatScaleOffset, setSplatScaleOffset] = useState(-0.04); // Added to wireframe scale
  
  // Splat uses wireframe transform + offsets
  const splatControl = {
    cameraPosition: wireframeControl.cameraPosition,
    cameraFov: wireframeControl.cameraFov,
    rotation: {
      x: wireframeControl.rotation.x + splatRotationOffset.x,
      y: wireframeControl.rotation.y + splatRotationOffset.y,
      z: wireframeControl.rotation.z + splatRotationOffset.z,
    },
    scale: wireframeControl.scale + splatScaleOffset,
    position: {
      x: wireframeControl.position.x + splatPositionOffset.x,
      y: wireframeControl.position.y + splatPositionOffset.y,
      z: wireframeControl.position.z + splatPositionOffset.z,
    },
  };
  


  // Wireframe appearance controls
  const [wireframeAppearance, setWireframeAppearance] = useState({
    edgeThreshold: 30, // angle in degrees - higher = fewer edges (cleaner look)
    lineOpacity: 1.0,
    color1: '#1b29ff', // blue
    color2: '#ff3d5b', // red  
    color3: '#00ff88', // green
    showAllEdges: false, // if true, shows all triangle edges (no threshold)
  });

  // Toggle controls with Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowControls((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Detect mobile vs desktop
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((s) => document.getElementById(s.id));
      const scrollContainer = isMobile 
        ? document.querySelector('.flex-1.bg-black.overflow-y-auto') 
        : null;
      
      // Guard against null scrollContainer on mobile
      if (isMobile && !scrollContainer) return;
      
      const scrollPosition = isMobile && scrollContainer
        ? scrollContainer.scrollTop + scrollContainer.clientHeight / 2
        : window.scrollY + window.innerHeight / 2;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section) {
          const sectionTop = section.offsetTop;
          if (sectionTop <= scrollPosition) {
            setActiveSection(SECTIONS[i].id);
            break;
          }
        }
      }
    };

    setTimeout(handleScroll, 100);

    if (isMobile) {
      const scrollContainer = document.querySelector('.flex-1.bg-black.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll);
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
      }
    } else {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isMobile]);

  const navigateToSection = (sectionId: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveSection(sectionId);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'auto' });
      }
      setTimeout(() => setIsTransitioning(false), 100);
    }, 400);
  };

  // Loading state for splat
  const [isLoadingSplat, setIsLoadingSplat] = useState(false);
  
  // Handle mode switch - simple: splat just overlays wireframe
  const handleModeSwitch = (newMode: 'splat-points' | 'wireframe') => {
    if (renderMode === 'wireframe' && newMode === 'splat-points') {
      // Wireframe -> Splat: add splat on top, it will cover wireframe as it reveals
      setIsLoadingSplat(true);
      setSplatRevealed(false);
      setRenderMode('splat-points');
      
      // Hide loading indicator after splat should be visible
      setTimeout(() => {
        setIsLoadingSplat(false);
      }, 2000);
      
      // Hide wireframe after splat reveal animation completes (~2.5 seconds)
      setTimeout(() => {
        setSplatRevealed(true);
      }, 2500);
      
    } else if (newMode === 'wireframe') {
      // Splat -> Wireframe: just remove splat, wireframe is already there
      setSplatRevealed(false);
      setRenderMode('wireframe');
    } else {
      setRenderMode(newMode);
    }
  };

  // Track if splat reveal animation is complete (takes ~8 seconds)
  const [splatRevealed, setSplatRevealed] = useState(false);
  
  // Compute derived state for 3D viewer
  const isSplat = renderMode === 'splat-points';
  const isSuperimpose = renderMode === 'superimpose';
  // In debug mode (showControls), always show both for alignment
  // Otherwise: show wireframe until splat is fully revealed
  const showSplat = isSplat || isSuperimpose || showControls;
  const showWireframe = showControls || isSuperimpose || renderMode === 'wireframe' || (isSplat && !splatRevealed);
  
  // Get view type label
  const getViewType = () => {
    if (showControls) return "EDIT MODE";
    if (isSuperimpose) return "SUPERIMPOSE";
    if (isSplat) return "2026 PREVIEW";
    return "WIREFRAME";
  };
  
  // Hero 3D viewer - renders both splat and wireframe
  // The Canvas stays mounted, only children change
  const ctrl = wireframeControl;
  
  const Model3D = (
    <CADViewport
      label="3D_VIEW"
      viewType={getViewType()}
      className="w-full h-[600px]"
    >
      <Canvas
        camera={{ position: ctrl.cameraPosition, fov: ctrl.cameraFov }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        style={{ backgroundColor: '#000000' }}
        gl={{ antialias: true }}
      >
        <PerspectiveCamera
          makeDefault
          position={ctrl.cameraPosition}
          fov={ctrl.cameraFov}
        />
        {/* Mouse interaction - rotate with drag, full controls in debug mode */}
        <OrbitControls 
          enablePan={showControls} 
          enableZoom={showControls} 
          enableRotate={true}
          autoRotate={!showControls}
          autoRotateSpeed={0.5}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          {/* Show splat when in splat mode */}
          {showSplat && (
            <SparkSplatViewer
              key="splat-viewer-stable"
              scale={splatControl.scale}
              position={splatControl.position}
              rotation={splatControl.rotation}
            />
          )}
          {/* Show wireframe when in wireframe, superimpose, or during transition */}
          {showWireframe && (
            <WireframeRocket
              scrollProgress={0}
              rotation={wireframeControl.rotation}
              scale={wireframeControl.scale}
              position={wireframeControl.position}
              customModels={[BEN_WIREFRAME_MODEL]}
              appearance={wireframeAppearance}
              fadeOut={false}
            />
          )}
        </Suspense>
        <EffectComposer>
          {/* Disable all post-processing when splat is revealed to avoid whitish glow */}
          {!showControls && !splatRevealed ? (
            <>
              <Bloom intensity={0.6} luminanceThreshold={0.7} radius={0.3} />
              <primitive object={new GlitchEffect()} />
              <ChromaticAberration 
                offset={new THREE.Vector2(0.005, 0.005)}
                radialModulation={false}
                modulationOffset={0}
              />
              <Noise opacity={0.05} />
            </>
          ) : <></>}
        </EffectComposer>
      </Canvas>
      
      {/* Loading indicator */}
      {isLoadingSplat && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="font-mono text-[#00FF00] text-sm uppercase tracking-widest animate-pulse">
            <span className="inline-block animate-[blink_0.5s_infinite]">▌</span>
            LOADING 2026...
          </div>
        </div>
      )}
      
      {/* Mode toggle button - inside viewport (hide superimpose in non-debug) */}
      <button
        onClick={() => handleModeSwitch(renderMode === 'wireframe' ? 'splat-points' : 'wireframe')}
        className="absolute bottom-4 right-4 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all z-10 border-2"
        style={{
          backgroundColor: renderMode === 'splat-points' ? '#00FF00' : 'transparent',
          color: renderMode === 'splat-points' ? '#000000' : '#00FF00',
          borderColor: '#00FF00',
        }}
      >
        {isLoadingSplat ? '[ LOADING... ]' : renderMode === 'wireframe' ? '[ LOAD 2026 ]' : '[ WIREFRAME ]'}
      </button>
    </CADViewport>
  );

  return (
    <div
      className="relative"
      style={{
        backgroundColor: '#000000',
        minHeight: '100vh',
      }}
    >
      {/* Transition Effect */}
      {isTransitioning && (
        <div
          className="fixed inset-0 z-[9999] pointer-events-none bg-black"
          style={{ animation: 'wipeDown 400ms linear' }}
        />
      )}
      <style>{`
        @keyframes wipeDown {
          0% { clip-path: polygon(0 0, 100% 0, 100% 0, 0 0); }
          100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
        }
        @keyframes scanlineReveal {
          0% { clip-path: inset(0 0 100% 0); filter: brightness(1.2); }
          100% { clip-path: inset(0 0 0 0); filter: brightness(1); }
        }
        .cad-redraw { animation: scanlineReveal 100ms linear; }
        
        @media print {
          body * {
            visibility: hidden;
          }
          #cv-section, #cv-section * {
            visibility: visible;
          }
          #cv-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          #cv-section * {
            background: white !important;
            color: black !important;
            border-color: black !important;
          }
          #cv-section a {
            color: black !important;
            text-decoration: underline !important;
          }
        }
      `}</style>

      <CRTEffect />

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div
          className="fixed right-0 top-0 h-screen w-64 bg-[#0000AA] border-l-2 border-[#00FFFF] z-50 flex flex-col font-mono"
        >
          <div className="border-b-2 border-[#00FFFF] p-4 bg-[#0000AA]">
            <div className="text-[#FFFFFF] text-sm font-bold uppercase tracking-widest">ACAD_INTERFACE</div>
            <div className="text-[#00FF00] text-xs mt-1 uppercase tracking-wide">ZERO_FINANCE</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="text-[#00FFFF] text-xs font-bold uppercase tracking-wider mb-2 px-2">[ PROTOCOL ]</div>
            {SECTIONS.map((section, index) => (
              <button
                key={section.id}
                onClick={() => navigateToSection(section.id)}
                className={`w-full text-left px-3 py-3 mb-1 font-mono text-sm uppercase tracking-wide transition-all ${
                  activeSection === section.id
                    ? 'bg-[#00FFFF] text-[#0000AA] font-bold'
                    : 'text-[#FFFFFF] hover:bg-[#FFFFFF]/10'
                }`}
                style={{ borderLeft: activeSection === section.id ? `4px solid ${section.color}` : '4px solid transparent' }}
              >
                {String(index + 1).padStart(2, '0')} {section.label}
              </button>
            ))}
          </div>
          <div className="border-t-2 border-[#00FFFF] p-4 bg-[#0000AA]">
            <div className="text-[#00FF00] text-xs uppercase tracking-wide">Orden: _navigate</div>
            <div className="text-[#FFFFFF]/60 text-xs mt-1">VIEWPORT: {activeSection.toUpperCase()}</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`lg:pr-64 ${isMobile ? 'pb-16' : ''}`}>

        {/* Content Scroll Area */}
        <div className="min-h-screen">
          <div className={!isTransitioning ? 'cad-redraw' : ''}>
            
            {/* SECTION 1: HERO - Immediate Identity */}
            <section id="profile" className="flex flex-col justify-center px-4 lg:px-16 pt-8 lg:pt-12 pb-8 lg:pb-20">
              
              {/* Top Bar - Name + Role - THE FIRST THING YOU SEE */}
              <div className="border-b border-[#00FF00]/30 pb-4 mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-2">
                <div>
                  <div className="text-[#00FF00] font-mono text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#00FF00] rounded-full animate-pulse"></span>
                    {ui.portfolioTag}
                  </div>
                  <h1 className="text-4xl lg:text-6xl font-black uppercase font-mono tracking-tight text-white">
                    BENJAMIN SHAFII
                  </h1>
                </div>
                <div className="flex items-center gap-4 text-[#00FFFF] font-mono text-xs lg:text-sm uppercase tracking-wider">
                  <span className="hidden lg:inline text-white/40">|</span>
                  <span>{content.hero.badge}</span>
                </div>
              </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="flex-1 max-w-3xl overflow-hidden">
                  
                  {/* Tagline - What I Do */}
                  <div className="mb-6 lg:mb-8 border-l-2 border-[#00FFFF] pl-4">
                    <p className="text-xl lg:text-3xl text-white font-mono font-bold leading-tight">
                      {content.hero.headline.prefix} {content.hero.headline.highlight} {content.hero.headline.suffix}
                    </p>
                  </div>

                  {/* Mobile 3D Viewer - Show between tagline and GitHub */}
                  {isMobile && (
                    <div className="mb-6 -mx-4 overflow-hidden">
                      <CADViewport
                        label="3D_VIEW"
                        viewType={renderMode === 'splat-points' ? "2026 PREVIEW" : "WIREFRAME"}
                        className="w-full h-[300px] overflow-hidden"
                      >
                        <Canvas
                          camera={{ position: [0, 0.5, 6], fov: 50 }}
                          dpr={[1, 1.5]}
                          performance={{ min: 0.5 }}
                          style={{ backgroundColor: '#000000' }}
                          gl={{ antialias: true }}
                        >
                          <PerspectiveCamera
                            makeDefault
                            position={[0, 0.5, 6]}
                            fov={50}
                          />
                          <OrbitControls 
                            enablePan={false} 
                            enableZoom={false} 
                            enableRotate={true}
                            autoRotate={true}
                            autoRotateSpeed={0.8}
                            minPolarAngle={Math.PI / 3}
                            maxPolarAngle={Math.PI / 1.8}
                          />
                          <ambientLight intensity={0.5} />
                          <directionalLight position={[5, 5, 5]} intensity={0.8} />
                          <Suspense fallback={null}>
                            {/* Show splat when in splat mode */}
                            {showSplat && (
                              <SparkSplatViewer
                                key="mobile-splat-viewer"
                                scale={splatControl.scale * 0.7}
                                position={{ x: splatControl.position.x, y: splatControl.position.y - 0.5, z: splatControl.position.z }}
                                rotation={splatControl.rotation}
                              />
                            )}
                            {/* Show wireframe when in wireframe mode or during transition */}
                            {showWireframe && (
                              <WireframeRocket
                                scrollProgress={0}
                                rotation={{ x: 0, y: 0.59, z: 0 }}
                                scale={1.0}
                                position={{ x: 0, y: 1.8, z: 0 }}
                                customModels={[BEN_WIREFRAME_MODEL]}
                                appearance={wireframeAppearance}
                                fadeOut={false}
                              />
                            )}
                          </Suspense>
                          <EffectComposer>
                            {!splatRevealed ? (
                              <>
                                <Bloom intensity={0.6} luminanceThreshold={0.7} radius={0.3} />
                                <primitive object={new GlitchEffect()} />
                                <ChromaticAberration 
                                  offset={new THREE.Vector2(0.003, 0.003)}
                                  radialModulation={false}
                                  modulationOffset={0}
                                />
                              </>
                            ) : <></>}
                          </EffectComposer>
                        </Canvas>
                        
                        {/* Loading indicator */}
                        {isLoadingSplat && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div className="font-mono text-[#00FF00] text-xs uppercase tracking-widest animate-pulse">
                              <span className="inline-block animate-[blink_0.5s_infinite]">▌</span>
                              LOADING 2026...
                            </div>
                          </div>
                        )}
                        
                        {/* Mode toggle button */}
                        <button
                          onClick={() => handleModeSwitch(renderMode === 'wireframe' ? 'splat-points' : 'wireframe')}
                          className="absolute bottom-3 right-3 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all z-10 border-2"
                          style={{
                            backgroundColor: renderMode === 'splat-points' ? '#00FFFF' : 'transparent',
                            color: renderMode === 'splat-points' ? '#000000' : '#00FFFF',
                            borderColor: '#00FFFF',
                          }}
                        >
                          {isLoadingSplat ? '[ LOADING... ]' : renderMode === 'wireframe' ? '[ LOAD 2026 ]' : '[ WIREFRAME ]'}
                        </button>
                      </CADViewport>
                    </div>
                  )}

                  {/* GitHub Contributions */}
                  <div className="mb-6 print:hidden overflow-x-auto">
                    <GitHubContributions username="benjaminshafii" />
                  </div>

                  {/* Description */}
                  <div className="mb-6 lg:mb-8">
                    <p className="text-sm lg:text-lg text-white/80 leading-relaxed font-mono break-words">
                      I build for people who bank in <InlineToggle isTechnical={true} onToggle={onToggle} />. {content.hero.description}
                    </p>
                  </div>
                  
                  {/* CTA Buttons */}
                  <div className="flex flex-wrap gap-3">
                    {ui.showCvSection && (
                      <a href="#cv-section" className="px-5 lg:px-8 py-3 lg:py-4 bg-[#00FF00] text-black font-mono font-bold text-sm lg:text-base uppercase tracking-wider hover:bg-[#00FFFF] transition-all">
                        {ui.viewAboutButton}
                      </a>
                    )}
                    <a href="#0finance" className="px-5 lg:px-8 py-3 lg:py-4 border border-[#00FFFF] text-[#00FFFF] font-mono font-bold text-sm lg:text-base uppercase tracking-wider hover:bg-[#00FFFF]/10 transition-all">
                      See Work
                    </a>
                  </div>
                </div>
                {!isMobile && <div className="w-[450px]">{Model3D}</div>}
              </div>
            </section>

            {/* SECTION 2: 0.FINANCE */}
            <section id="0finance" className="flex flex-col justify-center px-4 lg:px-16 py-8 lg:py-20">
              <div className="text-xs uppercase tracking-widest text-[#FF00FF] font-mono font-bold mb-6 lg:mb-8">{`>> SECTION_02: 0.FINANCE`}</div>
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">
                <div className="flex-1 max-w-3xl">
                  <h2 className="text-2xl lg:text-6xl font-black uppercase font-mono tracking-wide mb-4 break-all" style={{ color: '#00FFFF' }}>
                    {content.features.items[0].title}
                  </h2>
                  <div className="bg-black border-2 border-[#00FFFF] p-4 lg:p-8">
                    <p className="text-xs lg:text-sm uppercase tracking-wider text-[#00FFFF] font-bold mb-4 font-mono">[ {content.features.items[0].headline} ]</p>
                    <p className="text-white/90 leading-relaxed text-base lg:text-xl font-mono">
                      {content.features.items[0].desc}
                    </p>
                  </div>
                </div>
                {/* 3D removed - only in hero */}
              </div>
            </section>

            {/* SECTION 3: GNOSIS PAY */}
            <section id="gnosis" className="flex flex-col justify-center px-4 lg:px-16 py-8 lg:py-20">
              <div className="text-xs uppercase tracking-widest text-[#FF00FF] font-mono font-bold mb-6 lg:mb-8">{`>> SECTION_03: GNOSIS_PAY`}</div>
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">
                <div className="flex-1 max-w-3xl">
                  <h2 className="text-2xl lg:text-6xl font-black uppercase font-mono tracking-wide mb-4 break-all" style={{ color: '#FFFF00' }}>
                    {content.features.items[1].title}
                  </h2>
                  <div className="bg-black border-2 border-[#FFFF00] p-4 lg:p-8">
                    <p className="text-xs lg:text-sm uppercase tracking-wider text-[#FFFF00] font-bold mb-4 font-mono">[ {content.features.items[1].headline} ]</p>
                    <p className="text-white/90 leading-relaxed text-base lg:text-xl font-mono">
                      {content.features.items[1].desc}
                    </p>
                  </div>
                </div>
                {/* 3D removed - only in hero */}
              </div>
            </section>

            {/* SECTION 4: REQUEST */}
            <section id="request" className="flex flex-col justify-center px-4 lg:px-16 py-8 lg:py-20">
              <div className="text-xs uppercase tracking-widest text-[#FF00FF] font-mono font-bold mb-6 lg:mb-8">{`>> SECTION_04: REQUEST`}</div>
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">
                <div className="flex-1 max-w-3xl">
                  <h2 className="text-2xl lg:text-6xl font-black uppercase font-mono tracking-wide mb-4 break-all" style={{ color: '#FF00FF' }}>
                    {content.features.items[2].title}
                  </h2>
                  <div className="bg-black border-2 border-[#FF00FF] p-4 lg:p-8">
                    <p className="text-xs lg:text-sm uppercase tracking-wider text-[#FF00FF] font-bold mb-4 font-mono">[ {content.features.items[2].headline} ]</p>
                    <p className="text-white/90 leading-relaxed text-base lg:text-xl font-mono">
                      {content.features.items[2].desc}
                    </p>
                  </div>
                </div>
                {/* 3D removed - only in hero */}
              </div>
            </section>

            {/* SECTION 5: NOTE COMPANION */}
            <section id="notecompanion" className="flex flex-col justify-center px-4 lg:px-16 py-8 lg:py-20">
              <div className="text-xs uppercase tracking-widest text-[#FF00FF] font-mono font-bold mb-6 lg:mb-8">{`>> SECTION_05: NOTE_COMPANION`}</div>
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">
                <div className="flex-1 max-w-3xl">
                  <h2 className="text-2xl lg:text-6xl font-black uppercase font-mono tracking-wide mb-4 break-all" style={{ color: '#00FF00' }}>
                    {content.features.items[3].title}
                  </h2>
                  <div className="bg-black border-2 border-[#00FF00] p-4 lg:p-8">
                    <p className="text-xs lg:text-sm uppercase tracking-wider text-[#00FF00] font-bold mb-4 font-mono">[ {content.features.items[3].headline} ]</p>
                    <p className="text-white/90 leading-relaxed text-base lg:text-xl font-mono">
                      {content.features.items[3].desc}
                    </p>
                  </div>
                </div>
                {/* 3D removed - only in hero */}
              </div>
            </section>

            {/* SECTION 6: CONTACT */}
            <section id="contact" className="flex flex-col justify-center px-4 lg:px-16 py-8 lg:py-20">
              <div className="text-xs uppercase tracking-widest text-[#FF00FF] font-mono font-bold mb-6 lg:mb-8">{`>> SECTION_06: CONTACT`}</div>
              <div className="max-w-4xl space-y-6 lg:space-y-10">
                <h2 className="text-3xl lg:text-8xl font-black text-[#FF00FF] uppercase font-mono tracking-tighter leading-tight break-all">
                  INITIATE_HANDSHAKE
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 lg:gap-5">
                  <a href="mailto:benjamin.shafii@gmail.com" className="flex-1 text-center px-6 lg:px-12 py-4 lg:py-6 bg-[#00FF00] text-black font-bold font-mono uppercase tracking-wider hover:bg-[#00FFFF] transition-all text-base lg:text-lg border-2 border-[#00FF00] hover:border-[#00FFFF]">
                    [ {content.footer.cta} ]
                  </a>
                  <a href="https://www.linkedin.com/in/ben-shafii-450039107/" className="text-center px-6 lg:px-12 py-4 lg:py-6 border-2 border-[#00FFFF] text-[#00FFFF] font-mono font-bold uppercase tracking-wider hover:bg-[#00FFFF]/10 transition-all text-base lg:text-lg">
                    [ LINKEDIN ]
                  </a>
                  <a href="https://blog.benjaminshafii.com" className="text-center px-6 lg:px-12 py-4 lg:py-6 border-2 border-[#FF00FF] text-[#FF00FF] font-mono font-bold uppercase tracking-wider hover:bg-[#FF00FF]/10 transition-all text-base lg:text-lg">
                    [ BLOG ]
                  </a>
                </div>
              </div>
            </section>

            {/* SECTION 7: RESUME/CV - Only shown if showCvSection is true */}
            {ui.showCvSection && (
              <section id="cv-section" className="flex flex-col justify-center px-4 lg:px-16 py-8 lg:py-20 bg-black border-t border-[#00FFFF]/30">
                <div className="text-xs uppercase tracking-widest text-[#FF00FF] font-mono font-bold mb-6 lg:mb-8">{`>> ${ui.sectionPrefix}`}</div>

                <div className="max-w-4xl">
                  <h2 className="text-3xl lg:text-7xl font-black uppercase font-mono tracking-wide mb-6 lg:mb-10 break-all" style={{ color: '#00FFFF' }}>
                    {ui.aboutSectionHeader}
                  </h2>
                </div>
                <CV theme="dark" profile={data.BENJAMIN_PROFILE} ui={data.UI_LABELS} />
              </section>
            )}

          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - matches desktop sidebar style */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0000AA] border-t-2 border-[#00FFFF] z-50 safe-area-inset-bottom">
          <div className="flex">
            {MOBILE_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => navigateToSection(s.id)}
                className={`flex-1 py-3 font-mono text-[11px] font-bold uppercase ${
                  activeSection === s.id || 
                  (s.id === '0finance' && ['0finance', 'gnosis', 'request', 'notecompanion'].includes(activeSection))
                    ? 'bg-[#00FFFF] text-[#0000AA]' 
                    : 'bg-[#0000AA] text-[#FFFFFF]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Model Controls HUD */}
      {showControls && (
        <div className="fixed top-4 left-4 w-96 bg-black/95 border-2 border-[#00FF00] p-4 font-mono text-xs z-[100] max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#00FF00]">
            <h3 className="text-[#00FFFF] font-bold uppercase tracking-wider">3D Model Controls</h3>
            <button onClick={() => setShowControls(false)} className="text-[#FF0000] hover:text-[#FF5555] font-bold">✕</button>
          </div>
          
          {/* Render Mode Toggle */}
          <div className="mb-4 pb-4 border-b border-[#00FF00]/30">
            <div className="text-[#FFFF00] font-bold mb-2">Render Mode</div>
            <div className="flex gap-1">
              <button 
                onClick={() => setRenderMode('wireframe')}
                className={`flex-1 py-2 px-2 font-bold uppercase text-xs ${renderMode === 'wireframe' ? 'bg-[#00FFFF] text-black' : 'bg-[#00FF00]/20 text-[#00FF00] border border-[#00FF00]'}`}
              >
                Wireframe
              </button>
              <button 
                onClick={() => setRenderMode('splat-points')}
                className={`flex-1 py-2 px-2 font-bold uppercase text-xs ${renderMode === 'splat-points' ? 'bg-[#FF00FF] text-black' : 'bg-[#00FF00]/20 text-[#00FF00] border border-[#00FF00]'}`}
              >
                2026 Splat
              </button>
              <button 
                onClick={() => setRenderMode('superimpose')}
                className={`flex-1 py-2 px-2 font-bold uppercase text-xs ${renderMode === 'superimpose' ? 'bg-[#FFFF00] text-black' : 'bg-[#00FF00]/20 text-[#00FF00] border border-[#00FF00]'}`}
              >
                Both
              </button>
            </div>
          </div>
          
          {/* Splat Offsets - to align splat with wireframe */}
          {(renderMode === 'splat-points' || renderMode === 'superimpose') && (
            <div className="mb-4 pb-4 border-b border-[#00FF00]/30">
              <div className="text-[#FFFF00] font-bold mb-2">Splat Offsets</div>
              <div className="text-[#00FF00]/60 text-xs mb-2">Adjusts splat relative to wireframe</div>
              <div className="space-y-2">
                {/* Rotation Offsets */}
                <div className="text-[#FF00FF] text-xs font-bold">Rotation</div>
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Rot X</label>
                  <input type="range" min="-6.28" max="6.28" step="0.01" value={splatRotationOffset.x}
                    onChange={(e) => setSplatRotationOffset({ ...splatRotationOffset, x: parseFloat(e.target.value) })} className="flex-1" />
                  <input type="number" step="0.01" value={splatRotationOffset.x}
                    onChange={(e) => setSplatRotationOffset({ ...splatRotationOffset, x: parseFloat(e.target.value) || 0 })} 
                    className="w-16 bg-black border border-[#FF00FF] text-[#FF00FF] text-xs px-1 py-0.5" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Rot Y</label>
                  <input type="range" min="-6.28" max="6.28" step="0.01" value={splatRotationOffset.y}
                    onChange={(e) => setSplatRotationOffset({ ...splatRotationOffset, y: parseFloat(e.target.value) })} className="flex-1" />
                  <input type="number" step="0.01" value={splatRotationOffset.y}
                    onChange={(e) => setSplatRotationOffset({ ...splatRotationOffset, y: parseFloat(e.target.value) || 0 })} 
                    className="w-16 bg-black border border-[#FF00FF] text-[#FF00FF] text-xs px-1 py-0.5" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Rot Z</label>
                  <input type="range" min="-6.28" max="6.28" step="0.01" value={splatRotationOffset.z}
                    onChange={(e) => setSplatRotationOffset({ ...splatRotationOffset, z: parseFloat(e.target.value) })} className="flex-1" />
                  <input type="number" step="0.01" value={splatRotationOffset.z}
                    onChange={(e) => setSplatRotationOffset({ ...splatRotationOffset, z: parseFloat(e.target.value) || 0 })} 
                    className="w-16 bg-black border border-[#FF00FF] text-[#FF00FF] text-xs px-1 py-0.5" />
                </div>
                
                {/* Position Offsets */}
                <div className="text-[#FF00FF] text-xs font-bold mt-2">Position</div>
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Pos X</label>
                  <input type="range" min="-5" max="5" step="0.1" value={splatPositionOffset.x}
                    onChange={(e) => setSplatPositionOffset({ ...splatPositionOffset, x: parseFloat(e.target.value) })} className="flex-1" />
                  <input type="number" step="0.1" value={splatPositionOffset.x}
                    onChange={(e) => setSplatPositionOffset({ ...splatPositionOffset, x: parseFloat(e.target.value) || 0 })} 
                    className="w-16 bg-black border border-[#FF00FF] text-[#FF00FF] text-xs px-1 py-0.5" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Pos Y</label>
                  <input type="range" min="-5" max="5" step="0.1" value={splatPositionOffset.y}
                    onChange={(e) => setSplatPositionOffset({ ...splatPositionOffset, y: parseFloat(e.target.value) })} className="flex-1" />
                  <input type="number" step="0.1" value={splatPositionOffset.y}
                    onChange={(e) => setSplatPositionOffset({ ...splatPositionOffset, y: parseFloat(e.target.value) || 0 })} 
                    className="w-16 bg-black border border-[#FF00FF] text-[#FF00FF] text-xs px-1 py-0.5" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Pos Z</label>
                  <input type="range" min="-5" max="5" step="0.1" value={splatPositionOffset.z}
                    onChange={(e) => setSplatPositionOffset({ ...splatPositionOffset, z: parseFloat(e.target.value) })} className="flex-1" />
                  <input type="number" step="0.1" value={splatPositionOffset.z}
                    onChange={(e) => setSplatPositionOffset({ ...splatPositionOffset, z: parseFloat(e.target.value) || 0 })} 
                    className="w-16 bg-black border border-[#FF00FF] text-[#FF00FF] text-xs px-1 py-0.5" />
                </div>
                
                {/* Scale Offset */}
                <div className="text-[#FF00FF] text-xs font-bold mt-2">Scale</div>
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Scale</label>
                  <input type="range" min="-2" max="2" step="0.01" value={splatScaleOffset}
                    onChange={(e) => setSplatScaleOffset(parseFloat(e.target.value))} className="flex-1" />
                  <input type="number" step="0.01" value={splatScaleOffset}
                    onChange={(e) => setSplatScaleOffset(parseFloat(e.target.value) || 0)} 
                    className="w-16 bg-black border border-[#FF00FF] text-[#FF00FF] text-xs px-1 py-0.5" />
                </div>
              </div>
              <button 
                onClick={() => {
                  const offsets = { rotation: splatRotationOffset, position: splatPositionOffset, scale: splatScaleOffset };
                  console.log('Splat Offsets:', JSON.stringify(offsets, null, 2));
                  navigator.clipboard.writeText(JSON.stringify(offsets, null, 2));
                }}
                className="mt-2 px-2 py-1 bg-[#FF00FF] text-black text-xs uppercase"
              >
                Copy All Offsets
              </button>
            </div>
          )}

          {/* Wireframe Controls - show in wireframe or superimpose mode */}
          {(renderMode === 'wireframe' || renderMode === 'superimpose') && (
            <div className="mb-4 pb-4 border-b border-[#00FF00]/30">
              <div className="text-[#FFFF00] font-bold mb-2">Wireframe Controls</div>
              <div className="space-y-2">
                {/* Scale */}
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Scale</label>
                  <input type="range" min="0.01" max="5" step="0.01" value={wireframeControl.scale}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, scale: parseFloat(e.target.value) })} className="flex-1" />
                  <input type="number" step="0.01" value={wireframeControl.scale}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, scale: parseFloat(e.target.value) || 0 })} 
                    className="w-16 bg-black border border-[#00FF00] text-[#00FF00] text-xs px-1 py-0.5" />
                </div>
                {/* Rot X */}
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Rot X</label>
                  <input type="range" min="-3.14" max="3.14" step="0.01" value={wireframeControl.rotation.x}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, rotation: { ...wireframeControl.rotation, x: parseFloat(e.target.value) } })} className="flex-1" />
                  <input type="number" step="0.01" value={wireframeControl.rotation.x}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, rotation: { ...wireframeControl.rotation, x: parseFloat(e.target.value) || 0 } })} 
                    className="w-16 bg-black border border-[#00FF00] text-[#00FF00] text-xs px-1 py-0.5" />
                </div>
                {/* Rot Y */}
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Rot Y</label>
                  <input type="range" min="-3.14" max="3.14" step="0.01" value={wireframeControl.rotation.y}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, rotation: { ...wireframeControl.rotation, y: parseFloat(e.target.value) } })} className="flex-1" />
                  <input type="number" step="0.01" value={wireframeControl.rotation.y}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, rotation: { ...wireframeControl.rotation, y: parseFloat(e.target.value) || 0 } })} 
                    className="w-16 bg-black border border-[#00FF00] text-[#00FF00] text-xs px-1 py-0.5" />
                </div>
                {/* Rot Z */}
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Rot Z</label>
                  <input type="range" min="-3.14" max="3.14" step="0.01" value={wireframeControl.rotation.z}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, rotation: { ...wireframeControl.rotation, z: parseFloat(e.target.value) } })} className="flex-1" />
                  <input type="number" step="0.01" value={wireframeControl.rotation.z}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, rotation: { ...wireframeControl.rotation, z: parseFloat(e.target.value) || 0 } })} 
                    className="w-16 bg-black border border-[#00FF00] text-[#00FF00] text-xs px-1 py-0.5" />
                </div>
                {/* Pos X */}
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Pos X</label>
                  <input type="range" min="-10" max="10" step="0.1" value={wireframeControl.position.x}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, position: { ...wireframeControl.position, x: parseFloat(e.target.value) } })} className="flex-1" />
                  <input type="number" step="0.1" value={wireframeControl.position.x}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, position: { ...wireframeControl.position, x: parseFloat(e.target.value) || 0 } })} 
                    className="w-16 bg-black border border-[#00FF00] text-[#00FF00] text-xs px-1 py-0.5" />
                </div>
                {/* Pos Y */}
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Pos Y</label>
                  <input type="range" min="-10" max="10" step="0.1" value={wireframeControl.position.y}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, position: { ...wireframeControl.position, y: parseFloat(e.target.value) } })} className="flex-1" />
                  <input type="number" step="0.1" value={wireframeControl.position.y}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, position: { ...wireframeControl.position, y: parseFloat(e.target.value) || 0 } })} 
                    className="w-16 bg-black border border-[#00FF00] text-[#00FF00] text-xs px-1 py-0.5" />
                </div>
                {/* Pos Z */}
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Pos Z</label>
                  <input type="range" min="-10" max="10" step="0.1" value={wireframeControl.position.z}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, position: { ...wireframeControl.position, z: parseFloat(e.target.value) } })} className="flex-1" />
                  <input type="number" step="0.1" value={wireframeControl.position.z}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, position: { ...wireframeControl.position, z: parseFloat(e.target.value) || 0 } })} 
                    className="w-16 bg-black border border-[#00FF00] text-[#00FF00] text-xs px-1 py-0.5" />
                </div>
                {/* Cam Z */}
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">Cam Z</label>
                  <input type="range" min="1" max="50" step="0.5" value={wireframeControl.cameraPosition[2]}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, cameraPosition: [wireframeControl.cameraPosition[0], wireframeControl.cameraPosition[1], parseFloat(e.target.value)] })} className="flex-1" />
                  <input type="number" step="0.1" value={wireframeControl.cameraPosition[2]}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, cameraPosition: [wireframeControl.cameraPosition[0], wireframeControl.cameraPosition[1], parseFloat(e.target.value) || 1] })} 
                    className="w-16 bg-black border border-[#00FF00] text-[#00FF00] text-xs px-1 py-0.5" />
                </div>
                {/* FOV */}
                <div className="flex items-center gap-2">
                  <label className="text-[#00FFFF] w-16 text-xs">FOV</label>
                  <input type="range" min="20" max="120" step="1" value={wireframeControl.cameraFov}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, cameraFov: parseFloat(e.target.value) })} className="flex-1" />
                  <input type="number" step="1" value={wireframeControl.cameraFov}
                    onChange={(e) => setWireframeControl({ ...wireframeControl, cameraFov: parseFloat(e.target.value) || 45 })} 
                    className="w-16 bg-black border border-[#00FF00] text-[#00FF00] text-xs px-1 py-0.5" />
                </div>
              </div>
              <button 
                onClick={() => {
                  const config = JSON.stringify(wireframeControl, null, 2);
                  console.log('Wireframe Config:', config);
                  navigator.clipboard.writeText(config);
                }}
                className="mt-2 px-2 py-1 bg-[#00FF00] text-black text-xs uppercase"
              >
                Copy Wireframe Config
              </button>
              
              {/* Wireframe Appearance Controls */}
              <div className="mt-4 pt-4 border-t border-[#00FF00]/30">
                <div className="text-[#FF00FF] font-bold mb-2">Wireframe Appearance</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[#00FFFF]">Edge Threshold: {wireframeAppearance.edgeThreshold}°</label>
                  <input type="range" min="0" max="90" step="1" value={wireframeAppearance.edgeThreshold}
                    onChange={(e) => setWireframeAppearance({ ...wireframeAppearance, edgeThreshold: parseFloat(e.target.value) })} className="w-full" />
                  
                  <label className="text-[#00FFFF]">Line Opacity: {wireframeAppearance.lineOpacity.toFixed(2)}</label>
                  <input type="range" min="0.1" max="1" step="0.05" value={wireframeAppearance.lineOpacity}
                    onChange={(e) => setWireframeAppearance({ ...wireframeAppearance, lineOpacity: parseFloat(e.target.value) })} className="w-full" />
                  
                  <label className="text-[#00FFFF]">Show All Edges:</label>
                  <input type="checkbox" checked={wireframeAppearance.showAllEdges}
                    onChange={(e) => setWireframeAppearance({ ...wireframeAppearance, showAllEdges: e.target.checked })} className="w-6 h-6" />
                  
                  <label className="text-[#00FFFF]">Color 1:</label>
                  <input type="color" value={wireframeAppearance.color1}
                    onChange={(e) => setWireframeAppearance({ ...wireframeAppearance, color1: e.target.value })} className="w-full h-8" />
                  
                  <label className="text-[#00FFFF]">Color 2:</label>
                  <input type="color" value={wireframeAppearance.color2}
                    onChange={(e) => setWireframeAppearance({ ...wireframeAppearance, color2: e.target.value })} className="w-full h-8" />
                  
                  <label className="text-[#00FFFF]">Color 3:</label>
                  <input type="color" value={wireframeAppearance.color3}
                    onChange={(e) => setWireframeAppearance({ ...wireframeAppearance, color3: e.target.value })} className="w-full h-8" />
                </div>
                <button 
                  onClick={() => {
                    const config = JSON.stringify(wireframeAppearance, null, 2);
                    console.log('Wireframe Appearance:', config);
                    navigator.clipboard.writeText(config);
                  }}
                  className="mt-2 px-2 py-1 bg-[#FF00FF] text-black text-xs uppercase"
                >
                  Copy Appearance Config
                </button>
              </div>
            </div>
          )}
          
          {/* Copy All Config Button */}
          <div className="mb-4 pb-4 border-b border-[#00FF00]/30">
            <button 
              onClick={() => {
                const allConfig = {
                  splatControl,
                  wireframeControl,
                  wireframeAppearance,
                };
                const config = JSON.stringify(allConfig, null, 2);
                console.log('All Config:', config);
                navigator.clipboard.writeText(config);
              }}
              className="w-full py-2 bg-[#00FFFF] text-black text-xs uppercase font-bold"
            >
              Copy All Config (Splat + Wireframe + Appearance)
            </button>
          </div>
          
          <div className="text-[#00FF00]">Use mouse to orbit when in Edit Mode</div>
        </div>
      )}
    </div>
  );
}

// --- Inline Toggle Component ---

interface InlineToggleProps {
  isTechnical: boolean;
  onToggle: () => void;
}

export function InlineToggle({ isTechnical, onToggle }: InlineToggleProps) {
  return (
    <>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 currentColor; }
          50% { box-shadow: 0 0 8px 2px currentColor; }
        }
        @keyframes shimmer-text {
          0% { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
        .inline-toggle-crypto {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .inline-toggle-crypto span {
          background: linear-gradient(90deg, #00FF00 0%, #00FFFF 50%, #00FF00 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-text 3s linear infinite;
        }
      `}</style>
      <button
        onClick={onToggle}
        className={`inline-flex items-center gap-1 transition-all hover:scale-105 active:scale-95 print:hidden ${
          isTechnical 
            ? 'inline-toggle-crypto bg-[#00FF00]/20 border border-[#00FF00] text-[#00FF00] hover:bg-[#00FF00]/30 px-2 py-0.5 rounded' 
            : 'border-b border-dashed border-[#1A2321]/40 text-[#1A2321] hover:border-[#1A2321] pb-0.5'
        }`}
      >
        <span className={isTechnical ? 'font-bold' : 'font-medium'}>{isTechnical ? 'crypto' : 'dollars'}</span>
        {isTechnical && (
          <svg 
            className="w-3 h-3 transition-transform" 
            style={{ animationDuration: '3s' }}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        )}
      </button>
    </>
  );
}

// --- Wallet Detection Toast ---

function WalletToast({ show, onClose }: { show: boolean; onClose: () => void }) {
  if (!show) return null;
  
  return (
    <div className="fixed bottom-6 left-6 z-[100] animate-[slideUp_0.4s_ease-out] print:hidden">
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="bg-black border border-[#00FF00] p-4 shadow-[0_0_20px_rgba(0,255,0,0.3)] max-w-sm">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 bg-[#00FF00] rounded-full animate-pulse mt-1.5 shrink-0"></div>
          <div className="flex-1">
            <div className="text-[#00FF00] font-mono text-xs font-bold uppercase tracking-wider mb-1">
              Wallet Detected
            </div>
            <div className="text-white/80 font-mono text-sm leading-snug">
              Switched to crypto mode. Click <span className="text-[#00FF00]">crypto</span> in the text above to toggle.
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#00FF00]/60 hover:text-[#00FF00] font-mono text-xs shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// Glitch transition overlay
function GlitchTransition({ isActive, toTechnical }: { isActive: boolean; toTechnical: boolean }) {
  if (!isActive) return null;
  
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      <style>{`
        @keyframes glitchSlice {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes scanline {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes glitchFlicker {
          0%, 100% { opacity: 0; }
          5%, 15%, 25%, 35%, 45% { opacity: 1; }
          10%, 20%, 30%, 40%, 50% { opacity: 0; }
        }
        @keyframes colorShift {
          0% { background: rgba(0, 255, 0, 0.1); }
          25% { background: rgba(255, 0, 255, 0.1); }
          50% { background: rgba(0, 255, 255, 0.1); }
          75% { background: rgba(255, 255, 0, 0.1); }
          100% { background: rgba(0, 255, 0, 0.1); }
        }
        @keyframes noise {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -5%); }
          20% { transform: translate(5%, 5%); }
          30% { transform: translate(-5%, 5%); }
          40% { transform: translate(5%, -5%); }
          50% { transform: translate(-5%, 0); }
          60% { transform: translate(5%, 0); }
          70% { transform: translate(0, 5%); }
          80% { transform: translate(0, -5%); }
          90% { transform: translate(5%, 5%); }
        }
      `}</style>
      
      {/* Main scanline */}
      <div 
        className="absolute left-0 right-0 h-[3px] bg-white mix-blend-difference"
        style={{ 
          animation: 'scanline 0.3s linear forwards',
          boxShadow: '0 0 20px 10px rgba(255,255,255,0.5)'
        }}
      />
      
      {/* Secondary scanlines */}
      {[...Array(5)].map((_, i) => (
        <div 
          key={i}
          className="absolute left-0 right-0 h-[1px] bg-white/50 mix-blend-difference"
          style={{ 
            animation: `scanline ${0.25 + i * 0.05}s linear forwards`,
            animationDelay: `${i * 0.02}s`
          }}
        />
      ))}
      
      {/* Glitch color overlay */}
      <div 
        className="absolute inset-0"
        style={{ animation: 'colorShift 0.3s linear forwards' }}
      />
      
      {/* Horizontal glitch slices */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`slice-${i}`}
          className="absolute left-0 right-0 overflow-hidden"
          style={{
            top: `${i * 12.5}%`,
            height: '12.5%',
            animation: `glitchFlicker 0.3s linear`,
            animationDelay: `${Math.random() * 0.1}s`
          }}
        >
          <div 
            className={`absolute inset-0 ${toTechnical ? 'bg-[#00FF00]/20' : 'bg-[#1A2321]/20'}`}
            style={{
              animation: `glitchSlice ${0.1 + Math.random() * 0.1}s linear`,
              animationDelay: `${Math.random() * 0.05}s`
            }}
          />
        </div>
      ))}
      
      {/* Static noise overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          animation: 'noise 0.1s steps(5) infinite'
        }}
      />
      
      {/* Flash */}
      <div 
        className="absolute inset-0 bg-white"
        style={{ animation: 'glitchFlicker 0.3s linear forwards' }}
      />
    </div>
  );
}

interface ResumeProps {
  data: DataModule;
}

export default function Resume({ data }: ResumeProps) {
  const [isTechnical, setIsTechnical] = useState(false);
  const [showWalletToast, setShowWalletToast] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingMode, setPendingMode] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for crypto wallet
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      console.log("Web3 Wallet Detected: Switching to Technical Mode");
      setIsTechnical(true);
      setShowWalletToast(true);
      
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => setShowWalletToast(false), 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleToggle = () => {
    const newMode = !isTechnical;
    setPendingMode(newMode);
    setIsTransitioning(true);
    
    // Switch content halfway through the animation
    setTimeout(() => {
      setIsTechnical(newMode);
    }, 150);
    
    // End transition
    setTimeout(() => {
      setIsTransitioning(false);
      setPendingMode(null);
    }, 300);
  };

  return (
    <>
      <GlitchTransition isActive={isTransitioning} toTechnical={pendingMode ?? isTechnical} />
      {isTechnical 
        ? <TechnicalResume onToggle={handleToggle} data={data} /> 
        : <EditorialResume onToggle={handleToggle} data={data} />
      }
      <WalletToast show={showWalletToast} onClose={() => setShowWalletToast(false)} />
    </>
  );
}
