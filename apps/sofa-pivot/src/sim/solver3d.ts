import { AABB3, Vec3, obbFromPose, collidesWithAny } from "../geom/collision3d";

export interface Pose3D {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
}

export interface RoomConfig3D {
  // Couch (meters)
  couchLength: number;
  couchDepth: number;
  couchHeight: number;

  // Hallway (meters)
  hallwayLength: number;
  hallwayWidth: number;
  hallwayHeight: number;

  // Door (meters)
  doorWidth: number;
  doorHeight: number;
  wallThickness: number;

  // Room (meters)
  roomDepth: number;
  roomWidth: number;
  roomHeight: number;

  // Solver tuning
  positionStep: number;
  angleStepDeg: number;
  maxIterations: number;
}

export interface SolveResult {
  success: boolean;
  reason?: string;
  path: Pose3D[];
  obstacles: AABB3[];
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function keyOf(p: Pose3D, posStep: number, angStep: number): string {
  const q = (v: number, step: number) => Math.round(v / step);
  return [
    q(p.x, posStep),
    q(p.y, posStep),
    q(p.z, posStep),
    q(p.yaw, angStep),
    q(p.pitch, angStep),
    q(p.roll, angStep),
  ].join(",");
}

function heuristic(a: Pose3D, goal: Pose3D): number {
  const dx = a.x - goal.x;
  const dy = a.y - goal.y;
  const dz = a.z - goal.z;
  const da = Math.abs(a.yaw - goal.yaw) + Math.abs(a.pitch - goal.pitch) + Math.abs(a.roll - goal.roll);
  return Math.sqrt(dx * dx + dy * dy + dz * dz) + da * 0.2;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function buildObstacles(config: RoomConfig3D): AABB3[] {
  const t = config.wallThickness;
  const big = 50;

  const hallHalfW = config.hallwayWidth / 2;
  const roomHalfW = config.roomWidth / 2;

  const hallX0 = -config.hallwayLength;
  const doorX0 = 0;
  const doorX1 = config.wallThickness;
  const roomX1 = config.wallThickness + config.roomDepth;

  const obstacles: AABB3[] = [];

  // Floor and ceiling (continuous)
  obstacles.push({
    center: { x: 0, y: -t / 2, z: 0 },
    halfExtents: { x: big, y: t / 2, z: big },
  });

  // Hallway ceiling
  obstacles.push({
    center: { x: (hallX0 + doorX0) / 2, y: config.hallwayHeight + t / 2, z: 0 },
    halfExtents: { x: (doorX0 - hallX0) / 2, y: t / 2, z: hallHalfW + t },
  });

  // Room ceiling
  obstacles.push({
    center: { x: (doorX1 + roomX1) / 2, y: config.roomHeight + t / 2, z: 0 },
    halfExtents: { x: (roomX1 - doorX1) / 2, y: t / 2, z: roomHalfW + t },
  });

  // Hallway side walls
  obstacles.push({
    center: { x: (hallX0 + doorX0) / 2, y: config.hallwayHeight / 2, z: hallHalfW + t / 2 },
    halfExtents: { x: (doorX0 - hallX0) / 2, y: config.hallwayHeight / 2, z: t / 2 },
  });
  obstacles.push({
    center: { x: (hallX0 + doorX0) / 2, y: config.hallwayHeight / 2, z: -hallHalfW - t / 2 },
    halfExtents: { x: (doorX0 - hallX0) / 2, y: config.hallwayHeight / 2, z: t / 2 },
  });

  // Room side walls
  obstacles.push({
    center: { x: (doorX1 + roomX1) / 2, y: config.roomHeight / 2, z: roomHalfW + t / 2 },
    halfExtents: { x: (roomX1 - doorX1) / 2, y: config.roomHeight / 2, z: t / 2 },
  });
  obstacles.push({
    center: { x: (doorX1 + roomX1) / 2, y: config.roomHeight / 2, z: -roomHalfW - t / 2 },
    halfExtents: { x: (roomX1 - doorX1) / 2, y: config.roomHeight / 2, z: t / 2 },
  });

  // Back walls
  obstacles.push({
    center: { x: hallX0 - t / 2, y: config.hallwayHeight / 2, z: 0 },
    halfExtents: { x: t / 2, y: config.hallwayHeight / 2, z: hallHalfW + t },
  });
  obstacles.push({
    center: { x: roomX1 + t / 2, y: config.roomHeight / 2, z: 0 },
    halfExtents: { x: t / 2, y: config.roomHeight / 2, z: roomHalfW + t },
  });

  // Door frame at x in [0, t]
  const halfDoorW = config.doorWidth / 2;
  const halfDoorH = config.doorHeight / 2;

  // Left jamb (positive z side)
  obstacles.push({
    center: { x: (doorX0 + doorX1) / 2, y: halfDoorH, z: (halfDoorW + hallHalfW) / 2 },
    halfExtents: { x: (doorX1 - doorX0) / 2, y: halfDoorH, z: (hallHalfW - halfDoorW) / 2 },
  });
  // Right jamb (negative z side)
  obstacles.push({
    center: { x: (doorX0 + doorX1) / 2, y: halfDoorH, z: (-halfDoorW - hallHalfW) / 2 },
    halfExtents: { x: (doorX1 - doorX0) / 2, y: halfDoorH, z: (hallHalfW - halfDoorW) / 2 },
  });
  // Lintel (top)
  obstacles.push({
    center: { x: (doorX0 + doorX1) / 2, y: (config.doorHeight + config.hallwayHeight) / 2, z: 0 },
    halfExtents: { x: (doorX1 - doorX0) / 2, y: (config.hallwayHeight - config.doorHeight) / 2, z: hallHalfW + t },
  });

  // Wall slab between hallway and room outside door width (to avoid sideways bypass)
  // We place a short "cap" just beyond door thickness to prevent leaving the corridor by clipping around the frame.
  obstacles.push({
    center: { x: doorX1 + t / 2, y: config.hallwayHeight / 2, z: hallHalfW + t },
    halfExtents: { x: t / 2, y: config.hallwayHeight / 2, z: t },
  });
  obstacles.push({
    center: { x: doorX1 + t / 2, y: config.hallwayHeight / 2, z: -hallHalfW - t },
    halfExtents: { x: t / 2, y: config.hallwayHeight / 2, z: t },
  });

  return obstacles;
}

function isPoseValid(p: Pose3D, config: RoomConfig3D, obstacles: AABB3[]): boolean {
  const half = {
    x: config.couchLength / 2,
    y: config.couchHeight / 2,
    z: config.couchDepth / 2,
  };

  // Keep couch above floor
  if (p.y < half.y) return false;

  // Clamp to a reasonable search volume
  const xMin = -config.hallwayLength + half.x;
  const xMax = config.wallThickness + config.roomDepth - half.x;
  if (p.x < xMin - 0.5 || p.x > xMax + 0.5) return false;

  const maxHalfW = Math.max(config.hallwayWidth, config.roomWidth) / 2;
  if (Math.abs(p.z) > maxHalfW + 0.5) return false;

  const maxH = Math.max(config.hallwayHeight, config.roomHeight);
  if (p.y > maxH + 0.5) return false;

  const obb = obbFromPose({ x: p.x, y: p.y, z: p.z }, half, p.yaw, p.pitch, p.roll);
  if (collidesWithAny(obb, obstacles)) return false;

  return true;
}

function neighbors(p: Pose3D, config: RoomConfig3D): Pose3D[] {
  const s = config.positionStep;
  const a = degToRad(config.angleStepDeg);

  // We prioritize forward movement and small rotations.
  const candidates: Pose3D[] = [];

  const move = [
    { dx: s, dy: 0, dz: 0 },
    { dx: -s, dy: 0, dz: 0 },
    { dx: 0, dy: 0, dz: s },
    { dx: 0, dy: 0, dz: -s },
    { dx: 0, dy: s, dz: 0 },
    { dx: 0, dy: -s, dz: 0 },
  ];

  for (const m of move) {
    candidates.push({ ...p, x: p.x + m.dx, y: p.y + m.dy, z: p.z + m.dz });
  }

  const rot = [
    { dyaw: a, dpitch: 0, droll: 0 },
    { dyaw: -a, dpitch: 0, droll: 0 },
    { dyaw: 0, dpitch: a, droll: 0 },
    { dyaw: 0, dpitch: -a, droll: 0 },
    { dyaw: 0, dpitch: 0, droll: a },
    { dyaw: 0, dpitch: 0, droll: -a },
  ];

  for (const r of rot) {
    candidates.push({
      ...p,
      yaw: p.yaw + r.dyaw,
      pitch: p.pitch + r.dpitch,
      roll: p.roll + r.droll,
    });
  }

  // Clamp angles to keep search bounded
  for (const c of candidates) {
    c.yaw = clamp(c.yaw, -Math.PI / 2, Math.PI / 2);
    c.pitch = clamp(c.pitch, -Math.PI / 2, Math.PI / 2);
    c.roll = clamp(c.roll, -Math.PI / 2, Math.PI / 2);
  }

  return candidates;
}

export function solveCouchPath3D(config: RoomConfig3D): SolveResult {
  const obstacles = buildObstacles(config);

  const half = {
    x: config.couchLength / 2,
    y: config.couchHeight / 2,
    z: config.couchDepth / 2,
  };

  const start: Pose3D = {
    x: -config.hallwayLength + half.x + 0.4,
    y: half.y,
    z: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
  };

  const goal: Pose3D = {
    x: config.wallThickness + config.roomDepth - half.x - 0.4,
    y: half.y,
    z: 0,
    yaw: Math.PI / 2,
    pitch: 0,
    roll: 0,
  };

  if (!isPoseValid(start, config, obstacles)) {
    return {
      success: false,
      reason: "Start pose collides (check couch vs hallway dimensions)",
      path: [],
      obstacles,
    };
  }

  const posStep = config.positionStep;
  const angStep = degToRad(config.angleStepDeg);

  const open: { key: string; pose: Pose3D; f: number; g: number }[] = [];
  const cameFrom = new Map<string, string>();
  const poseByKey = new Map<string, Pose3D>();
  const gScore = new Map<string, number>();

  const startKey = keyOf(start, posStep, angStep);
  poseByKey.set(startKey, start);
  gScore.set(startKey, 0);
  open.push({ key: startKey, pose: start, f: heuristic(start, goal), g: 0 });

  const closed = new Set<string>();

  let iterations = 0;

  while (open.length > 0 && iterations < config.maxIterations) {
    iterations++;

    // Pop min f
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;

    if (closed.has(current.key)) continue;
    closed.add(current.key);

    // Check goal region
    const cur = current.pose;
    const nearGoalPos =
      Math.abs(cur.x - goal.x) < posStep * 2 &&
      Math.abs(cur.z - goal.z) < posStep * 2;
    const nearGoalYaw = Math.abs(cur.yaw - goal.yaw) < angStep * 2;

    if (nearGoalPos && nearGoalYaw && cur.x > config.wallThickness + 0.2) {
      // Reconstruct
      const path: Pose3D[] = [];
      let k: string | undefined = current.key;
      while (k) {
        const p = poseByKey.get(k);
        if (p) path.unshift(p);
        k = cameFrom.get(k);
      }
      return { success: true, path, obstacles };
    }

    for (const n of neighbors(cur, config)) {
      if (!isPoseValid(n, config, obstacles)) continue;

      const nk = keyOf(n, posStep, angStep);
      if (closed.has(nk)) continue;

      const tentativeG = (gScore.get(current.key) ?? Infinity) +
        Math.abs(n.x - cur.x) +
        Math.abs(n.y - cur.y) +
        Math.abs(n.z - cur.z) +
        0.2 * (Math.abs(n.yaw - cur.yaw) + Math.abs(n.pitch - cur.pitch) + Math.abs(n.roll - cur.roll));

      const existingG = gScore.get(nk);
      if (existingG === undefined || tentativeG < existingG) {
        cameFrom.set(nk, current.key);
        poseByKey.set(nk, n);
        gScore.set(nk, tentativeG);
        open.push({ key: nk, pose: n, g: tentativeG, f: tentativeG + heuristic(n, goal) });
      }
    }
  }

  return {
    success: false,
    reason: "No collision-free path found (try smaller step size or more iterations)",
    path: [],
    obstacles,
  };
}
