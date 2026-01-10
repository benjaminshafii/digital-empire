import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { PathNode, RoomConfig } from "../sim/planner";
import { generateWalls } from "../sim/planner";

interface SofaSceneProps {
  config: RoomConfig;
  path: PathNode[];
  currentIndex: number;
}

export const SofaScene: React.FC<SofaSceneProps> = ({
  config,
  path,
  currentIndex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const couchMeshRef = useRef<THREE.Group | null>(null);
  const pathLineRef = useRef<THREE.Line | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Top-down orthographic camera
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const frustumSize = 10;
    const camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    camera.position.set(0, 0, 5);
    camera.zoom = 1.0;
    camera.updateProjectionMatrix();
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Create environment
    createEnvironment(scene, config);

    // Animation loop
    let animationId: number;
    function animate() {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;

      const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.left = (-frustumSize * aspect) / 2;
      camera.right = (frustumSize * aspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();

      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update environment when config changes
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove old environment
    const oldEnv = sceneRef.current.getObjectByName("environment");
    if (oldEnv) {
      sceneRef.current.remove(oldEnv);
    }

    createEnvironment(sceneRef.current, config);
  }, [config]);

  // Create couch mesh
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove old couch
    const oldCouch = sceneRef.current.getObjectByName("couch");
    if (oldCouch) {
      sceneRef.current.remove(oldCouch);
    }

    const couchGroup = new THREE.Group();
    couchGroup.name = "couch";

    // Couch body
    const bodyGeometry = new THREE.BoxGeometry(
      config.couchLength,
      0.3,
      config.couchWidth
    );
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.8,
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 0.15;
    couchGroup.add(bodyMesh);

    // Add edges
    const edgesGeometry = new THREE.EdgesGeometry(bodyGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.position.y = 0.15;
    couchGroup.add(edges);

    sceneRef.current.add(couchGroup);
    couchMeshRef.current = couchGroup;
  }, [config]);

  // Update path visualization
  useEffect(() => {
    if (!sceneRef.current || !path.length) return;

    // Remove old path
    const oldPath = sceneRef.current.getObjectByName("path");
    if (oldPath) {
      sceneRef.current.remove(oldPath);
    }

    const points: THREE.Vector3[] = path.map((node) => {
      return new THREE.Vector3(node.x, 0.01, node.y);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2 });
    const line = new THREE.Line(geometry, material);
    line.name = "path";

    sceneRef.current.add(line);
    pathLineRef.current = line;
  }, [path]);

  // Update couch position and rotation
  useEffect(() => {
    if (!couchMeshRef.current || currentIndex < 0 || currentIndex >= path.length)
      return;

    const node = path[currentIndex];

    couchMeshRef.current.position.set(node.x, 0, node.y);
    couchMeshRef.current.rotation.y = -node.rotation;
  }, [currentIndex, path]);

  return <div ref={containerRef} className="canvas-container" id="scene" />;
};

function createEnvironment(scene: THREE.Scene, config: RoomConfig) {
  const environment = new THREE.Group();
  environment.name = "environment";

  const walls = generateWalls(config);

  const wallMaterial = new THREE.MeshPhongMaterial({ color: 0xff6b6b });
  const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x2d2d2d });

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(10, 10);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  environment.add(floor);

  // Walls
  for (const wall of walls) {
    const dx = wall.segment.p2.x - wall.segment.p1.x;
    const dy = wall.segment.p2.y - wall.segment.p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    const wallGeometry = new THREE.BoxGeometry(length, 0.4, 0.1);
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

    const centerX = (wall.segment.p1.x + wall.segment.p2.x) / 2;
    const centerY = (wall.segment.p1.y + wall.segment.p2.y) / 2;

    wallMesh.position.set(centerX, 0.2, centerY);
    wallMesh.rotation.y = Math.atan2(dy, dx);

    environment.add(wallMesh);
  }

  // Room floor (green tint)
  const roomGeometry = new THREE.PlaneGeometry(config.roomDepth, config.roomWidth);
  const roomMaterial = new THREE.MeshPhongMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.1,
  });
  const roomFloor = new THREE.Mesh(roomGeometry, roomMaterial);
  roomFloor.rotation.x = -Math.PI / 2;
  roomFloor.position.set(
    config.roomDepth / 2 + 0.2,
    0,
    0
  );
  environment.add(roomFloor);

  scene.add(environment);
}
