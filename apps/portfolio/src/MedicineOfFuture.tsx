import React, { useRef, useMemo, Suspense, useState, useEffect } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { useGLTF, PerspectiveCamera, OrbitControls, TransformControls } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration, Noise, Scanline } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { DitherWaveEffect } from "./effects/DitherWaveEffect";
import { GlitchEffect } from "./effects/GlitchEffect";
import { HologramEffect } from "./effects/HologramEffect";
import { DitheringOverlayEffect } from "./effects/DitheringOverlayEffect";
import { BlueNoiseHalftoneEffect } from "./effects/BlueNoiseHalftoneEffect";

// Extend R3F with custom effects
extend({ DitherWaveEffect, GlitchEffect, HologramEffect, DitheringOverlayEffect, BlueNoiseHalftoneEffect });

function CameraLogger({ onPositionChange }: { onPositionChange: (pos: [number, number, number]) => void }) {
  const { camera } = useThree();

  useFrame(() => {
    onPositionChange([
      Math.round(camera.position.x * 100) / 100,
      Math.round(camera.position.y * 100) / 100,
      Math.round(camera.position.z * 100) / 100
    ]);
  });

  return null;
}

function SpaceShuttle({
  meshRef,
  onTransformChange
}: {
  meshRef: React.RefObject<THREE.Group>;
  onTransformChange: (pos: [number, number, number], rot: [number, number, number], scale: number) => void;
}) {
  const { scene } = useGLTF("/GL Transmission Format - Binary.glb");

  // Risograph-inspired limited color palette (2-color for authentic print aesthetic)
  const colorPalette = useMemo(() => [
    0x1B29FF, // primary vibrant blue #1B29FF
    0xFF3D5B, // risograph red accent #FF3D5B
  ], []);

  // Create edge-only geometries with clean silhouette and panel lines
  const edgeLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    let colorIndex = 0;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // Use EdgesGeometry for clean silhouette and major seams
        const edges = new THREE.EdgesGeometry(child.geometry, 20); // threshold angle 20°

        // Pick color from palette - alternate for visual interest
        const color = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;

        lines.push(
          <lineSegments key={child.uuid} geometry={edges}>
            <lineBasicMaterial
              color={color}
              transparent
              opacity={1.0}
              linewidth={1.5}
            />
          </lineSegments>
        );
      }
    });

    return lines;
  }, [scene, colorPalette]);

  // Track transform changes
  useFrame(() => {
    if (meshRef.current) {
      onTransformChange(
        [
          Math.round(meshRef.current.position.x * 100) / 100,
          Math.round(meshRef.current.position.y * 100) / 100,
          Math.round(meshRef.current.position.z * 100) / 100
        ],
        [
          Math.round(meshRef.current.rotation.x * 100) / 100,
          Math.round(meshRef.current.rotation.y * 100) / 100,
          Math.round(meshRef.current.rotation.z * 100) / 100
        ],
        Math.round(meshRef.current.scale.x * 100) / 100
      );
    }
  });

  return (
    <group ref={meshRef} position={[0, 0, 0]} rotation={[-1.68, 0.16, -0.97]} scale={0.5}>
      <primitive object={scene} visible={false} />
      {edgeLines}
    </group>
  );
}

export default function MedicineOfFuture() {
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([848.96, 452.32, 521.8]);
  const [shuttlePosition, setShuttlePosition] = useState<[number, number, number]>([0, 0, 0]);
  const [shuttleRotation, setShuttleRotation] = useState<[number, number, number]>([-1.68, 0.16, -0.97]);
  const [shuttleScale, setShuttleScale] = useState<number>(0.5);
  const [transformMode, setTransformMode] = useState<"translate" | "rotate" | "scale">("translate");
  const [showControls, setShowControls] = useState<boolean>(true);
  const [activeEffect, setActiveEffect] = useState<number>(5); // Start with risograph effect
  const shuttleRef = useRef<THREE.Group>(null);
  const orbitControlsRef = useRef<any>(null);

  // Background color configuration
  const [bgColor, setBgColor] = useState<string>("#FAFAF4");

  // Dither wave configuration
  const [ditherDuration, setDitherDuration] = useState<number>(3.0);
  const [ditherPause, setDitherPause] = useState<number>(0.5);
  const [ditherAutoplay, setDitherAutoplay] = useState<boolean>(true);
  const [ditherManualProgress, setDitherManualProgress] = useState<number | undefined>(undefined);
  const [ditherScale, setDitherScale] = useState<number>(8.0);
  const [ditherWaveWidth, setDitherWaveWidth] = useState<number>(0.25);
  const [ditherBrightness, setDitherBrightness] = useState<number>(2.5);
  const [ditherWaveColor, setDitherWaveColor] = useState<string>("#00FFD9");
  const [ditherPatternColor, setDitherPatternColor] = useState<string>("#80B2B2");

  // Glitch effect configuration
  const [glitchIntensity, setGlitchIntensity] = useState<number>(0.8);
  const [glitchFrequency, setGlitchFrequency] = useState<number>(3.0);
  const [glitchBlockSize, setGlitchBlockSize] = useState<number>(40.0);
  const [glitchColor, setGlitchColor] = useState<string>("#FFFFFF");
  const [glitchRgbSeparation, setGlitchRgbSeparation] = useState<number>(0.006);

  // Hologram effect configuration
  const [hologramScanSpeed, setHologramScanSpeed] = useState<number>(0.15);
  const [hologramScanIntensity, setHologramScanIntensity] = useState<number>(0.8);
  const [hologramLineIntensity, setHologramLineIntensity] = useState<number>(0.1);
  const [hologramLineDensity, setHologramLineDensity] = useState<number>(300.0);
  const [hologramEdgeGlow, setHologramEdgeGlow] = useState<number>(0.3);
  const [hologramFlickerAmount, setHologramFlickerAmount] = useState<number>(0.02);
  const [hologramFlickerSpeed, setHologramFlickerSpeed] = useState<number>(10.0);
  const [hologramScanColor, setHologramScanColor] = useState<string>("#00FFCC");
  const [hologramEdgeColor, setHologramEdgeColor] = useState<string>("#00FFB2");

  // Dithering overlay effect configuration
  const [ditherOverlaySpeed, setDitherOverlaySpeed] = useState<number>(1.0);
  const [ditherOverlaySize, setDitherOverlaySize] = useState<number>(2.0);
  const [ditherOverlayScale, setDitherOverlayScale] = useState<number>(0.6);
  const [ditherOverlayColor, setDitherOverlayColor] = useState<string>("#2A6183");
  const [ditherOverlayBlendMode, setDitherOverlayBlendMode] = useState<number>(0); // 0: exclusion
  const [ditherOverlayBlendStrength, setDitherOverlayBlendStrength] = useState<number>(1.0);
  const [ditherOverlayOffsetX, setDitherOverlayOffsetX] = useState<number>(0.0);
  const [ditherOverlayOffsetY, setDitherOverlayOffsetY] = useState<number>(0.0);
  const [ditherOverlayRotation, setDitherOverlayRotation] = useState<number>(0);
  const [ditherOverlayDebugMode, setDitherOverlayDebugMode] = useState<number>(0); // 0: normal
  const [showPositionMarker, setShowPositionMarker] = useState<boolean>(false);

  // Risograph halftone effect configuration
  const [halftoneBlueColor, setHalftoneBlueColor] = useState<string>("#1B29FF");
  const [halftonePaperColor, setHalftonePaperColor] = useState<string>("#FAFAF4");
  const [halftoneDotSize, setHalftoneDotSize] = useState<number>(0.08);
  const [halftoneDotSharpness, setHalftoneDotSharpness] = useState<number>(0.8);
  const [halftoneContrast, setHalftoneContrast] = useState<number>(2.5);
  const [halftoneBrightness, setHalftoneBrightness] = useState<number>(1.5);
  const [halftoneGrainIntensity, setHalftoneGrainIntensity] = useState<number>(0.3);
  const [halftoneInkSpread, setHalftoneInkSpread] = useState<number>(0.15);
  const [halftoneDotRotation, setHalftoneDotRotation] = useState<number>(15);
  const [halftoneToneLevels, setHalftoneToneLevels] = useState<number>(5);

  // Create effect instances once using useMemo to maintain state across renders
  const ditherWaveEffect = useMemo(() => new DitherWaveEffect(), []);
  const glitchEffect = useMemo(() => new GlitchEffect(), []);
  const hologramEffect = useMemo(() => new HologramEffect(), []);
  const ditheringOverlayEffect = useMemo(() => new DitheringOverlayEffect(), []);
  const blueNoiseHalftoneEffect = useMemo(() => new BlueNoiseHalftoneEffect(), []);

  // Helper function to convert hex color to RGB array (0-1 range)
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16) / 255,
          parseInt(result[2], 16) / 255,
          parseInt(result[3], 16) / 255
        ]
      : [1, 1, 1];
  };

  // Update dither effect config when settings change
  useEffect(() => {
    ditherWaveEffect.config.duration = ditherDuration;
    ditherWaveEffect.config.pauseDuration = ditherPause;
    ditherWaveEffect.config.enabled = ditherAutoplay;
    ditherWaveEffect.config.manualProgress = ditherManualProgress;
    ditherWaveEffect.config.ditherScale = ditherScale;
    ditherWaveEffect.config.waveWidth = ditherWaveWidth;
    ditherWaveEffect.config.brightness = ditherBrightness;
    ditherWaveEffect.config.waveColor = hexToRgb(ditherWaveColor);
    ditherWaveEffect.config.patternColor = hexToRgb(ditherPatternColor);
  }, [ditherDuration, ditherPause, ditherAutoplay, ditherManualProgress, ditherScale, ditherWaveWidth, ditherBrightness, ditherWaveColor, ditherPatternColor, ditherWaveEffect]);

  // Update glitch effect config when settings change
  useEffect(() => {
    glitchEffect.config.intensity = glitchIntensity;
    glitchEffect.config.frequency = glitchFrequency;
    glitchEffect.config.blockSize = glitchBlockSize;
    glitchEffect.config.glitchColor = hexToRgb(glitchColor);
    glitchEffect.config.rgbSeparation = glitchRgbSeparation;
  }, [glitchIntensity, glitchFrequency, glitchBlockSize, glitchColor, glitchRgbSeparation, glitchEffect]);

  // Update hologram effect config when settings change
  useEffect(() => {
    hologramEffect.config.scanSpeed = hologramScanSpeed;
    hologramEffect.config.scanIntensity = hologramScanIntensity;
    hologramEffect.config.lineIntensity = hologramLineIntensity;
    hologramEffect.config.lineDensity = hologramLineDensity;
    hologramEffect.config.edgeGlow = hologramEdgeGlow;
    hologramEffect.config.flickerAmount = hologramFlickerAmount;
    hologramEffect.config.flickerSpeed = hologramFlickerSpeed;
    hologramEffect.config.scanColor = hexToRgb(hologramScanColor);
    hologramEffect.config.edgeColor = hexToRgb(hologramEdgeColor);
  }, [hologramScanSpeed, hologramScanIntensity, hologramLineIntensity, hologramLineDensity, hologramEdgeGlow, hologramFlickerAmount, hologramFlickerSpeed, hologramScanColor, hologramEdgeColor, hologramEffect]);

  // Update dithering overlay effect config when settings change
  useEffect(() => {
    ditheringOverlayEffect.config.speed = ditherOverlaySpeed;
    ditheringOverlayEffect.config.size = ditherOverlaySize;
    ditheringOverlayEffect.config.scale = ditherOverlayScale;
    ditheringOverlayEffect.config.ditherColor = hexToRgb(ditherOverlayColor);
    ditheringOverlayEffect.config.blendMode = ditherOverlayBlendMode;
    ditheringOverlayEffect.config.blendStrength = ditherOverlayBlendStrength;
    ditheringOverlayEffect.config.offsetX = ditherOverlayOffsetX;
    ditheringOverlayEffect.config.offsetY = ditherOverlayOffsetY;
    ditheringOverlayEffect.config.rotation = ditherOverlayRotation;
    ditheringOverlayEffect.config.debugMode = ditherOverlayDebugMode;
  }, [ditherOverlaySpeed, ditherOverlaySize, ditherOverlayScale, ditherOverlayColor, ditherOverlayBlendMode, ditherOverlayBlendStrength, ditherOverlayOffsetX, ditherOverlayOffsetY, ditherOverlayRotation, ditherOverlayDebugMode, ditheringOverlayEffect]);

  // Update risograph halftone effect config when settings change
  useEffect(() => {
    blueNoiseHalftoneEffect.config.blueColor = hexToRgb(halftoneBlueColor);
    blueNoiseHalftoneEffect.config.paperColor = hexToRgb(halftonePaperColor);
    blueNoiseHalftoneEffect.config.dotSize = halftoneDotSize;
    blueNoiseHalftoneEffect.config.dotSharpness = halftoneDotSharpness;
    blueNoiseHalftoneEffect.config.contrast = halftoneContrast;
    blueNoiseHalftoneEffect.config.brightness = halftoneBrightness;
    blueNoiseHalftoneEffect.config.grainIntensity = halftoneGrainIntensity;
    blueNoiseHalftoneEffect.config.inkSpread = halftoneInkSpread;
    blueNoiseHalftoneEffect.config.dotRotation = halftoneDotRotation;
    blueNoiseHalftoneEffect.config.toneLevels = halftoneToneLevels;
  }, [halftoneBlueColor, halftonePaperColor, halftoneDotSize, halftoneDotSharpness, halftoneContrast, halftoneBrightness, halftoneGrainIntensity, halftoneInkSpread, halftoneDotRotation, halftoneToneLevels, blueNoiseHalftoneEffect]);

  // Reset dither effect when switching to it
  useEffect(() => {
    if (activeEffect === 1) {
      ditherWaveEffect.resetTime();
    }
  }, [activeEffect, ditherWaveEffect]);

  const handleTransformChange = (pos: [number, number, number], rot: [number, number, number], scale: number) => {
    setShuttlePosition(pos);
    setShuttleRotation(rot);
    setShuttleScale(scale);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') setTransformMode("translate");
      if (e.key === 'e' || e.key === 'E') setTransformMode("rotate");
      if (e.key === 'r' || e.key === 'R') setTransformMode("scale");
      if (e.key === 'h' || e.key === 'H') setShowControls(prev => !prev);
      if (e.key === '0') setActiveEffect(0);
      if (e.key === '1') setActiveEffect(1);
      if (e.key === '2') setActiveEffect(2);
      if (e.key === '3') setActiveEffect(3);
      if (e.key === '4') setActiveEffect(4);
      if (e.key === '5') setActiveEffect(5);
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="w-full min-h-screen text-gray-900 flex flex-col items-center overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="text-6xl md:text-7xl font-black tracking-tighter mt-16 mb-6 uppercase" style={{
        color: halftoneBlueColor,
        textShadow: '2px 2px 0px rgba(255, 61, 91, 0.3)'
      }}>
        <div className="text-center leading-tight">
          <div>The Medicine</div>
          <div>of the Future</div>
        </div>
      </div>

      {/* Controls Display - Toggle with H key */}
      {showControls && (
        <div className="absolute top-4 left-4 bg-black/80 p-4 rounded-lg border border-cyan-500 font-mono text-sm z-10 max-w-md">
          <div className="text-cyan-400 font-bold mb-2">Camera Position:</div>
          <div className="text-green-400 mb-3 text-xs">position={`[${cameraPosition[0]}, ${cameraPosition[1]}, ${cameraPosition[2]}]`}</div>

          <div className="text-magenta-400 font-bold mb-2">Shuttle Transform:</div>
          <div className="text-yellow-400 text-xs">position={`[${shuttlePosition[0]}, ${shuttlePosition[1]}, ${shuttlePosition[2]}]`}</div>
          <div className="text-yellow-400 text-xs">rotation={`[${shuttleRotation[0]}, ${shuttleRotation[1]}, ${shuttleRotation[2]}]`}</div>
          <div className="text-yellow-400 text-xs mb-3">scale={shuttleScale}</div>

          <div className="text-gray-400 text-xs mt-3 space-y-1">
            <div>Mouse: Orbit camera</div>
            <div>Scroll: Zoom</div>
            <div>Click shuttle: Transform it</div>
            <div>H: Hide/show this panel</div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setTransformMode("translate")}
              className={`px-2 py-1 text-xs rounded ${transformMode === "translate" ? "bg-cyan-600" : "bg-gray-700"}`}
            >
              Move (W)
            </button>
            <button
              onClick={() => setTransformMode("rotate")}
              className={`px-2 py-1 text-xs rounded ${transformMode === "rotate" ? "bg-cyan-600" : "bg-gray-700"}`}
            >
              Rotate (E)
            </button>
            <button
              onClick={() => setTransformMode("scale")}
              className={`px-2 py-1 text-xs rounded ${transformMode === "scale" ? "bg-cyan-600" : "bg-gray-700"}`}
            >
              Scale (R)
            </button>
          </div>

          <div className="mt-4 border-t border-cyan-700 pt-3">
            <div className="text-yellow-400 font-bold mb-2 text-xs">Visual Effects:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveEffect(0)}
                className={`px-2 py-1 text-xs rounded ${activeEffect === 0 ? "bg-yellow-600" : "bg-gray-700"}`}
              >
                Default (0)
              </button>
              <button
                onClick={() => setActiveEffect(1)}
                className={`px-2 py-1 text-xs rounded ${activeEffect === 1 ? "bg-yellow-600" : "bg-gray-700"}`}
              >
                Dither Wave (1)
              </button>
              <button
                onClick={() => setActiveEffect(2)}
                className={`px-2 py-1 text-xs rounded ${activeEffect === 2 ? "bg-yellow-600" : "bg-gray-700"}`}
              >
                Glitch (2)
              </button>
              <button
                onClick={() => setActiveEffect(3)}
                className={`px-2 py-1 text-xs rounded ${activeEffect === 3 ? "bg-yellow-600" : "bg-gray-700"}`}
              >
                Hologram (3)
              </button>
              <button
                onClick={() => setActiveEffect(4)}
                className={`px-2 py-1 text-xs rounded ${activeEffect === 4 ? "bg-yellow-600" : "bg-gray-700"}`}
              >
                Dither Overlay (4)
              </button>
              <button
                onClick={() => setActiveEffect(5)}
                className={`px-2 py-1 text-xs rounded ${activeEffect === 5 ? "bg-yellow-600" : "bg-gray-700"}`}
              >
                Risograph Print (5)
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-cyan-700 pt-3">
            <div className="text-purple-400 font-bold mb-2 text-xs">Background Color:</div>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Dither Wave Configuration Panel - Shows when dither effect is active */}
      {showControls && activeEffect === 1 && (
        <div className="absolute top-4 right-4 bg-black/90 p-4 rounded-lg border border-yellow-500 font-mono text-sm z-10 w-80 max-h-[90vh] overflow-y-auto">
          <div className="text-yellow-400 font-bold mb-3">Dither Wave Config:</div>

          <div className="space-y-3">
            {/* Auto/Manual Toggle */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ditherAutoplay}
                  onChange={(e) => {
                    setDitherAutoplay(e.target.checked);
                    if (e.target.checked) {
                      setDitherManualProgress(undefined);
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-cyan-400">Autoplay</span>
              </label>
            </div>

            {/* Duration slider - only show when autoplay is on */}
            {ditherAutoplay && (
              <>
                <div>
                  <label className="text-green-400 text-xs">
                    Duration: {ditherDuration.toFixed(1)}s
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.1"
                    value={ditherDuration}
                    onChange={(e) => setDitherDuration(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-green-400 text-xs">
                    Pause: {ditherPause.toFixed(1)}s
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={ditherPause}
                    onChange={(e) => setDitherPause(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <button
                  onClick={() => ditherWaveEffect.resetTime()}
                  className="w-full px-3 py-2 bg-green-700 hover:bg-green-600 rounded text-xs"
                >
                  Reset Wave
                </button>
              </>
            )}

            {/* Manual progress slider - only show when autoplay is off */}
            {!ditherAutoplay && (
              <div>
                <label className="text-magenta-400 text-xs">
                  Manual Progress: {((ditherManualProgress ?? 0) * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={ditherManualProgress ?? 0}
                  onChange={(e) => setDitherManualProgress(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            <div className="border-t border-yellow-600 pt-3">
              <label className="text-cyan-400 text-xs block mb-1">
                Dither Scale: {ditherScale.toFixed(1)}
              </label>
              <input
                type="range"
                min="2"
                max="20"
                step="0.5"
                value={ditherScale}
                onChange={(e) => setDitherScale(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                Wave Width: {ditherWaveWidth.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.01"
                value={ditherWaveWidth}
                onChange={(e) => setDitherWaveWidth(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                Brightness: {ditherBrightness.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={ditherBrightness}
                onChange={(e) => setDitherBrightness(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="border-t border-yellow-600 pt-3">
              <label className="text-purple-400 text-xs block mb-1">Wave Color:</label>
              <input
                type="color"
                value={ditherWaveColor}
                onChange={(e) => setDitherWaveColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="text-purple-400 text-xs block mb-1">Pattern Color:</label>
              <input
                type="color"
                value={ditherPatternColor}
                onChange={(e) => setDitherPatternColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Glitch Configuration Panel - Shows when glitch effect is active */}
      {showControls && activeEffect === 2 && (
        <div className="absolute top-4 right-4 bg-black/90 p-4 rounded-lg border border-red-500 font-mono text-sm z-10 w-80 max-h-[90vh] overflow-y-auto">
          <div className="text-red-400 font-bold mb-3">Glitch Config:</div>

          <div className="space-y-3">
            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                Intensity: {glitchIntensity.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={glitchIntensity}
                onChange={(e) => setGlitchIntensity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                Frequency: {glitchFrequency.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.1"
                value={glitchFrequency}
                onChange={(e) => setGlitchFrequency(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                Block Size: {glitchBlockSize.toFixed(0)}
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={glitchBlockSize}
                onChange={(e) => setGlitchBlockSize(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                RGB Separation: {glitchRgbSeparation.toFixed(4)}
              </label>
              <input
                type="range"
                min="0"
                max="0.02"
                step="0.0001"
                value={glitchRgbSeparation}
                onChange={(e) => setGlitchRgbSeparation(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="border-t border-red-600 pt-3">
              <label className="text-purple-400 text-xs block mb-1">Glitch Color:</label>
              <input
                type="color"
                value={glitchColor}
                onChange={(e) => setGlitchColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Hologram Configuration Panel - Shows when hologram effect is active */}
      {showControls && activeEffect === 3 && (
        <div className="absolute top-4 right-4 bg-black/90 p-4 rounded-lg border border-cyan-500 font-mono text-sm z-10 w-80 max-h-[90vh] overflow-y-auto">
          <div className="text-cyan-400 font-bold mb-3">Hologram Config:</div>

          <div className="space-y-3">
            <div>
              <label className="text-green-400 text-xs block mb-1">
                Scan Speed: {hologramScanSpeed.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={hologramScanSpeed}
                onChange={(e) => setHologramScanSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-green-400 text-xs block mb-1">
                Scan Intensity: {hologramScanIntensity.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={hologramScanIntensity}
                onChange={(e) => setHologramScanIntensity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-green-400 text-xs block mb-1">
                Line Intensity: {hologramLineIntensity.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={hologramLineIntensity}
                onChange={(e) => setHologramLineIntensity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-green-400 text-xs block mb-1">
                Line Density: {hologramLineDensity.toFixed(0)}
              </label>
              <input
                type="range"
                min="50"
                max="800"
                step="10"
                value={hologramLineDensity}
                onChange={(e) => setHologramLineDensity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-green-400 text-xs block mb-1">
                Edge Glow: {hologramEdgeGlow.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={hologramEdgeGlow}
                onChange={(e) => setHologramEdgeGlow(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-green-400 text-xs block mb-1">
                Flicker Amount: {hologramFlickerAmount.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="0.2"
                step="0.01"
                value={hologramFlickerAmount}
                onChange={(e) => setHologramFlickerAmount(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-green-400 text-xs block mb-1">
                Flicker Speed: {hologramFlickerSpeed.toFixed(1)}
              </label>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={hologramFlickerSpeed}
                onChange={(e) => setHologramFlickerSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="border-t border-cyan-600 pt-3">
              <label className="text-purple-400 text-xs block mb-1">Scan Color:</label>
              <input
                type="color"
                value={hologramScanColor}
                onChange={(e) => setHologramScanColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="text-purple-400 text-xs block mb-1">Edge Color:</label>
              <input
                type="color"
                value={hologramEdgeColor}
                onChange={(e) => setHologramEdgeColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Dithering Overlay Configuration Panel - Shows when dithering overlay effect is active */}
      {showControls && activeEffect === 4 && (
        <div className="absolute top-4 right-4 bg-black/90 p-4 rounded-lg border border-blue-500 font-mono text-sm z-10 w-80 max-h-[90vh] overflow-y-auto">
          <div className="text-blue-400 font-bold mb-3">Dithering Overlay Config:</div>

          <div className="space-y-3">
            {/* Debug Mode Selector */}
            <div className="border border-red-600 p-3 rounded bg-red-900/20">
              <label className="text-red-400 text-xs block mb-2 font-bold">Debug Mode:</label>
              <select
                value={ditherOverlayDebugMode}
                onChange={(e) => setDitherOverlayDebugMode(parseInt(e.target.value))}
                className="w-full px-2 py-1 rounded bg-gray-800 text-white text-xs"
              >
                <option value={0}>Normal (Final Result)</option>
                <option value={1}>Show Pattern Only</option>
                <option value={2}>Show Mask (Intersection)</option>
                <option value={3}>Show Shuttle Detection</option>
              </select>
              <div className="text-gray-400 text-xs mt-1">
                Use debug modes to see what's happening
              </div>
            </div>

            {/* Position Controls Section */}
            <div className="border border-yellow-600 p-3 rounded">
              <div className="text-yellow-400 text-xs font-bold mb-2">Position & Transform:</div>

              <div className="mb-2">
                <label className="text-cyan-400 text-xs block mb-1">
                  Offset X: {ditherOverlayOffsetX.toFixed(3)}
                </label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.001"
                  value={ditherOverlayOffsetX}
                  onChange={(e) => setDitherOverlayOffsetX(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="mb-2">
                <label className="text-cyan-400 text-xs block mb-1">
                  Offset Y: {ditherOverlayOffsetY.toFixed(3)}
                </label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.001"
                  value={ditherOverlayOffsetY}
                  onChange={(e) => setDitherOverlayOffsetY(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="mb-2">
                <label className="text-cyan-400 text-xs block mb-1">
                  Rotation: {ditherOverlayRotation.toFixed(0)}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={ditherOverlayRotation}
                  onChange={(e) => setDitherOverlayRotation(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setDitherOverlayOffsetX(0);
                    setDitherOverlayOffsetY(0);
                    setDitherOverlayRotation(0);
                  }}
                  className="flex-1 px-2 py-1 bg-yellow-700 hover:bg-yellow-600 rounded text-xs"
                >
                  Reset Position
                </button>
                <button
                  onClick={() => setShowPositionMarker(!showPositionMarker)}
                  className={`flex-1 px-2 py-1 rounded text-xs ${showPositionMarker ? "bg-green-700" : "bg-gray-700"}`}
                >
                  {showPositionMarker ? "Hide" : "Show"} Marker
                </button>
              </div>
            </div>

            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                Animation Speed: {ditherOverlaySpeed.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={ditherOverlaySpeed}
                onChange={(e) => setDitherOverlaySpeed(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                Pattern Size: {ditherOverlaySize.toFixed(1)}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={ditherOverlaySize}
                onChange={(e) => setDitherOverlaySize(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                Pattern Scale: {ditherOverlayScale.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.05"
                value={ditherOverlayScale}
                onChange={(e) => setDitherOverlayScale(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                Blend Strength: {ditherOverlayBlendStrength.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={ditherOverlayBlendStrength}
                onChange={(e) => setDitherOverlayBlendStrength(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="border-t border-blue-600 pt-3">
              <label className="text-green-400 text-xs block mb-2">Blend Mode:</label>
              <select
                value={ditherOverlayBlendMode}
                onChange={(e) => setDitherOverlayBlendMode(parseInt(e.target.value))}
                className="w-full px-2 py-1 rounded bg-gray-800 text-white text-xs"
              >
                <option value={0}>Exclusion (Reveals)</option>
                <option value={1}>Difference</option>
                <option value={2}>Overlay</option>
                <option value={3}>Screen</option>
              </select>
            </div>

            <div className="border-t border-blue-600 pt-3">
              <label className="text-purple-400 text-xs block mb-1">Dither Color:</label>
              <input
                type="color"
                value={ditherOverlayColor}
                onChange={(e) => setDitherOverlayColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Risograph Halftone Configuration Panel - Shows when halftone effect is active */}
      {showControls && activeEffect === 5 && (
        <div className="absolute top-4 right-4 bg-black/90 p-4 rounded-lg border border-indigo-500 font-mono text-sm z-10 w-80 max-h-[90vh] overflow-y-auto">
          <div className="text-indigo-400 font-bold mb-3">Risograph Halftone Config:</div>

          <div className="space-y-3">
            {/* Color Controls */}
            <div className="border-t border-indigo-600 pt-3">
              <label className="text-purple-400 text-xs block mb-1">Blue Ink Color:</label>
              <input
                type="color"
                value={halftoneBlueColor}
                onChange={(e) => setHalftoneBlueColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="text-purple-400 text-xs block mb-1">Paper Color:</label>
              <input
                type="color"
                value={halftonePaperColor}
                onChange={(e) => setHalftonePaperColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>

            {/* Dot Pattern Controls */}
            <div className="border-t border-indigo-600 pt-3">
              <label className="text-cyan-400 text-xs block mb-1">
                Dot Size: {halftoneDotSize.toFixed(3)}
              </label>
              <input
                type="range"
                min="0.05"
                max="0.25"
                step="0.005"
                value={halftoneDotSize}
                onChange={(e) => setHalftoneDotSize(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-gray-400 text-xs">Size of halftone dots</div>
            </div>

            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                Dot Sharpness: {halftoneDotSharpness.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={halftoneDotSharpness}
                onChange={(e) => setHalftoneDotSharpness(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-gray-400 text-xs">Edge sharpness of dots</div>
            </div>

            <div>
              <label className="text-cyan-400 text-xs block mb-1">
                Dot Rotation: {halftoneDotRotation.toFixed(0)}°
              </label>
              <input
                type="range"
                min="0"
                max="45"
                step="1"
                value={halftoneDotRotation}
                onChange={(e) => setHalftoneDotRotation(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-gray-400 text-xs">Screen angle rotation</div>
            </div>

            {/* Tone Controls */}
            <div className="border-t border-indigo-600 pt-3">
              <label className="text-green-400 text-xs block mb-1">
                Tone Levels: {halftoneToneLevels}
              </label>
              <input
                type="range"
                min="3"
                max="6"
                step="1"
                value={halftoneToneLevels}
                onChange={(e) => setHalftoneToneLevels(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-gray-400 text-xs">Number of posterized tone levels</div>
            </div>

            <div>
              <label className="text-green-400 text-xs block mb-1">
                Contrast: {halftoneContrast.toFixed(2)}
              </label>
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.1"
                value={halftoneContrast}
                onChange={(e) => setHalftoneContrast(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-gray-400 text-xs">Overall contrast boost</div>
            </div>

            <div>
              <label className="text-green-400 text-xs block mb-1">
                Brightness: {halftoneBrightness.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={halftoneBrightness}
                onChange={(e) => setHalftoneBrightness(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-gray-400 text-xs">Brightness adjustment</div>
            </div>

            {/* Texture Controls */}
            <div className="border-t border-indigo-600 pt-3">
              <label className="text-yellow-400 text-xs block mb-1">
                Grain Intensity: {halftoneGrainIntensity.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={halftoneGrainIntensity}
                onChange={(e) => setHalftoneGrainIntensity(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-gray-400 text-xs">Paper texture grain strength</div>
            </div>

            <div>
              <label className="text-yellow-400 text-xs block mb-1">
                Ink Spread: {halftoneInkSpread.toFixed(3)}
              </label>
              <input
                type="range"
                min="0"
                max="0.3"
                step="0.01"
                value={halftoneInkSpread}
                onChange={(e) => setHalftoneInkSpread(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-gray-400 text-xs">Simulates ink bleeding on paper</div>
            </div>
          </div>
        </div>
      )}

      {/* Position Marker - Shows center crosshair when enabled */}
      {showControls && activeEffect === 4 && showPositionMarker && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
          <div className="relative">
            {/* Horizontal line */}
            <div className="absolute left-1/2 top-1/2 w-screen h-px bg-yellow-400 opacity-50 -translate-x-1/2 -translate-y-1/2"></div>
            {/* Vertical line */}
            <div className="absolute left-1/2 top-1/2 w-px h-screen bg-yellow-400 opacity-50 -translate-x-1/2 -translate-y-1/2"></div>
            {/* Center dot */}
            <div className="absolute left-1/2 top-1/2 w-3 h-3 bg-yellow-400 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          </div>
        </div>
      )}

      <div className="relative w-full" style={{ height: '80vh' }}>
        <Canvas>
          {/* Camera with your saved position */}
          <PerspectiveCamera makeDefault position={[848.96, 452.32, 521.8]} fov={35} />

          {/* Orbit Controls for manual camera control */}
          <OrbitControls ref={orbitControlsRef} enabled={showControls} enableDamping dampingFactor={0.05} target={[0, 0, 0]} />

          {/* Camera Logger to track position */}
          <CameraLogger onPositionChange={setCameraPosition} />

          {/* Bright lighting for clean risograph aesthetic */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={0.3} />

          {/* Space Shuttle with Transform Controls */}
          <Suspense fallback={null}>
            <SpaceShuttle
              meshRef={shuttleRef}
              onTransformChange={handleTransformChange}
            />
            {showControls && (
              <TransformControls
                object={shuttleRef}
                mode={transformMode}
                onMouseDown={() => orbitControlsRef.current && (orbitControlsRef.current.enabled = false)}
                onMouseUp={() => orbitControlsRef.current && (orbitControlsRef.current.enabled = true)}
              />
            )}
          </Suspense>

          {/* Post-processing effects - changes based on activeEffect */}
          <EffectComposer>
            {/* Effect 0: Default - Clean Risograph Wireframe */}
            {activeEffect === 0 && (
              <>
                <Bloom
                  intensity={0.4}
                  luminanceThreshold={0.85}
                  luminanceSmoothing={0.3}
                  radius={0.2}
                  mipmapBlur
                />
                <ChromaticAberration
                  offset={[0.0002, 0.0002]}
                  radialModulation={false}
                  modulationOffset={0.0}
                />
                <Noise
                  opacity={0.015}
                  premultiply
                  blendFunction={BlendFunction.OVERLAY}
                />
              </>
            )}

            {/* Effect 1: Dither Wave Reveal */}
            {activeEffect === 1 && (
              <>
                <Bloom intensity={0.5} luminanceThreshold={0.8} radius={0.2} />
                <primitive object={ditherWaveEffect} />
                <Scanline density={1.5} opacity={0.15} blendFunction={BlendFunction.MULTIPLY} />
                <Noise opacity={0.03} />
              </>
            )}

            {/* Effect 2: Glitch / Data Corruption */}
            {activeEffect === 2 && (
              <>
                <Bloom intensity={0.6} luminanceThreshold={0.7} radius={0.3} />
                <primitive object={glitchEffect} />
                <ChromaticAberration offset={[0.005, 0.005]} />
                <Noise opacity={0.05} />
              </>
            )}

            {/* Effect 3: Holographic Scan */}
            {activeEffect === 3 && (
              <>
                <Bloom intensity={0.8} luminanceThreshold={0.6} radius={0.4} />
                <primitive object={hologramEffect} />
                <Scanline density={2.5} opacity={0.2} blendFunction={BlendFunction.OVERLAY} />
                <ChromaticAberration offset={[0.001, 0.001]} />
              </>
            )}

            {/* Effect 4: Dithering Overlay with Exclusion Blending */}
            {activeEffect === 4 && (
              <>
                <Bloom intensity={0.4} luminanceThreshold={0.85} radius={0.25} />
                <primitive object={ditheringOverlayEffect} />
                <Scanline density={2.0} opacity={0.1} blendFunction={BlendFunction.MULTIPLY} />
                <Noise opacity={0.02} />
              </>
            )}

            {/* Effect 5: Risograph Halftone Print */}
            {activeEffect === 5 && (
              <>
                <Bloom intensity={0.8} luminanceThreshold={0.5} radius={0.3} />
                <primitive object={blueNoiseHalftoneEffect} />
                <Noise opacity={0.02} premultiply blendFunction={BlendFunction.OVERLAY} />
              </>
            )}
          </EffectComposer>
        </Canvas>
      </div>

      <p className="mt-4 text-sm font-medium uppercase tracking-wide" style={{ color: 'rgba(27, 41, 255, 0.6)' }}>
        Two-Color Risograph Print — Limited Edition
      </p>
    </div>
  );
}
