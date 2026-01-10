import { aabbToOBB, getOBBCorners3, obbFromPose, obbIntersectsOBB } from "../geom/collision3d";
import { buildObstacles, type RoomConfig3D } from "./environment3d";

export interface Pose3D {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
}

export interface PlanResult3D {
  path: Pose3D[];
  success: boolean;
  reason?: string;
}

class MinHeap<T> {
  private readonly heap: { key: number; value: T }[] = [];

  push(key: number, value: T) {
    this.heap.push({ key, value });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top.value;
  }

  get size() {
    return this.heap.length;
  }

  private bubbleUp(index: number) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent]!.key <= this.heap[index]!.key) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index]!, this.heap[parent]!];
      index = parent;
    }
  }

  private bubbleDown(index: number) {
    const length = this.heap.length;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (left < length && this.heap[left]!.key < this.heap[smallest]!.key) smallest = left;
      if (right < length && this.heap[right]!.key < this.heap[smallest]!.key) smallest = right;

      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index]!, this.heap[smallest]!];
      index = smallest;
    }
  }
}

function quantize(v: number, step: number): number {
  return Math.round(v / step) * step;
}

function wrapAngleRad(a: number): number {
  const twoPi = Math.PI * 2;
  let out = a % twoPi;
  if (out < 0) out += twoPi;
  return out;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function poseKey(p: Pose3D): string {
  // Quantize into a stable hash key
  const qx = quantize(p.x, 0.25).toFixed(2);
  const qy = quantize(p.y, 0.15).toFixed(2);
  const qz = quantize(p.z, 0.15).toFixed(2);
  const qa = quantize(p.yaw, Math.PI / 12).toFixed(3);
  const qp = quantize(p.pitch, Math.PI / 18).toFixed(3);
  const qr = quantize(p.roll, Math.PI / 18).toFixed(3);
  return `${qx},${qy},${qz},${qa},${qp},${qr}`;
}

function heuristic(a: Pose3D, goal: Pose3D): number {
  const dx = a.x - goal.x;
  const dy = a.y - goal.y;
  const dz = a.z - goal.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const yawDiff = Math.min(Math.abs(a.yaw - goal.yaw), Math.PI * 2 - Math.abs(a.yaw - goal.yaw));
  return dist + 0.3 * yawDiff;
}

function isCollisionFree(config: RoomConfig3D, pose: Pose3D, obstacleOBBs: ReturnType<typeof buildObstacleOBBs>): boolean {
  const couchHalf = {
    x: config.couchLength / 2,
    y: config.couchWidth / 2,
    z: config.couchHeight / 2,
  };

  const couch = obbFromPose(
    { x: pose.x, y: pose.y, z: pose.z },
    couchHalf,
    pose.yaw,
    pose.pitch,
    pose.roll
  );

  // Must stay above floor (z >= 0)
  const corners = getOBBCorners3(couch);
  for (const c of corners) {
    if (c.z < -1e-3) return false;
  }

  for (const o of obstacleOBBs) {
    if (obbIntersectsOBB(couch, o)) return false;
  }

  return true;
}

function buildObstacleOBBs(config: RoomConfig3D) {
  return buildObstacles(config).map(aabbToOBB);
}

export function findPath3D(config: RoomConfig3D): PlanResult3D {
  const obstacleOBBs = buildObstacleOBBs(config);

  const start: Pose3D = {
    x: -config.hallwayLength + config.couchLength / 2 + 0.6,
    y: 0,
    z: config.couchHeight / 2,
    yaw: 0,
    pitch: 0,
    roll: 0,
  };

  const goal: Pose3D = {
    x: config.roomDepth - config.couchLength / 2 - 0.6,
    y: 0,
    z: config.couchHeight / 2,
    yaw: Math.PI / 2,
    pitch: 0,
    roll: 0,
  };

  // Bounds
  const yBound = Math.max(config.hallwayWidth / 2, config.roomWidth / 2) + config.wallThickness;
  const zMin = config.couchHeight / 2;
  const zMax = Math.min(config.hallwayHeight, config.roomHeight) - config.couchHeight / 2;

  const pitchMax = Math.PI / 4;
  const rollMax = Math.PI / 4;

  if (zMax < zMin) {
    return { path: [], success: false, reason: "Couch is taller than the hallway/room height" };
  }

  if (!isCollisionFree(config, start, obstacleOBBs)) {
    return { path: [], success: false, reason: "Start pose collides with walls" };
  }

  const open = new MinHeap<Pose3D>();
  const cameFrom = new Map<string, string>();
  const poseByKey = new Map<string, Pose3D>();
  const gScore = new Map<string, number>();

  const startKey = poseKey(start);
  poseByKey.set(startKey, start);
  gScore.set(startKey, 0);
  open.push(heuristic(start, goal), start);

  const maxIterations = 35000;
  let iterations = 0;

  while (open.size > 0 && iterations < maxIterations) {
    iterations++;

    const current = open.pop();
    if (!current) break;

    const currentKey = poseKey(current);
    const currentG = gScore.get(currentKey);
    if (currentG === undefined) continue;

    // Goal check (coarse)
    const dx = current.x - goal.x;
    const dy = current.y - goal.y;
    const dz = current.z - goal.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const yawDiff = Math.min(Math.abs(current.yaw - goal.yaw), Math.PI * 2 - Math.abs(current.yaw - goal.yaw));
    if (dist < 0.5 && yawDiff < Math.PI / 12) {
      const path: Pose3D[] = [];
      let k: string | undefined = currentKey;
      while (k) {
        const p = poseByKey.get(k);
        if (p) path.unshift(p);
        const prev = cameFrom.get(k);
        k = prev;
      }
      return { path, success: true };
    }

    const neighbors = generateNeighbors(current, yBound, zMin, zMax, pitchMax, rollMax);

    for (const n of neighbors) {
      if (!isCollisionFree(config, n, obstacleOBBs)) continue;

      const nKey = poseKey(n);
      const tentativeG = currentG + stepCost(current, n);

      const best = gScore.get(nKey);
      if (best === undefined || tentativeG < best) {
        cameFrom.set(nKey, currentKey);
        poseByKey.set(nKey, n);
        gScore.set(nKey, tentativeG);
        open.push(tentativeG + heuristic(n, goal), n);
      }
    }
  }

  return {
    path: [],
    success: false,
    reason: "No collision-free 3D path found (try increasing door size or reducing couch size)"
  };
}

function stepCost(a: Pose3D, b: Pose3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const dang = Math.abs(a.yaw - b.yaw) + Math.abs(a.pitch - b.pitch) + Math.abs(a.roll - b.roll);
  return dist + 0.2 * dang;
}

function generateNeighbors(
  p: Pose3D,
  yBound: number,
  zMin: number,
  zMax: number,
  pitchMax: number,
  rollMax: number
): Pose3D[] {
  const out: Pose3D[] = [];

  const dx = 0.25;
  const dy = 0.15;
  const dz = 0.15;

  const dyaw = Math.PI / 12; // 15deg
  const dp = Math.PI / 18; // 10deg
  const dr = Math.PI / 18;

  const base: Pose3D = {
    x: quantize(p.x, dx),
    y: quantize(p.y, dy),
    z: quantize(p.z, dz),
    yaw: wrapAngleRad(quantize(p.yaw, dyaw)),
    pitch: clamp(quantize(p.pitch, dp), -pitchMax, pitchMax),
    roll: clamp(quantize(p.roll, dr), -rollMax, rollMax),
  };

  const moves: Array<Partial<Pose3D>> = [
    { x: base.x + dx },
    { x: base.x - dx },
    { y: base.y + dy },
    { y: base.y - dy },
    { z: base.z + dz },
    { z: base.z - dz },
    { yaw: wrapAngleRad(base.yaw + dyaw) },
    { yaw: wrapAngleRad(base.yaw - dyaw) },
    { pitch: clamp(base.pitch + dp, -pitchMax, pitchMax) },
    { pitch: clamp(base.pitch - dp, -pitchMax, pitchMax) },
    { roll: clamp(base.roll + dr, -rollMax, rollMax) },
    { roll: clamp(base.roll - dr, -rollMax, rollMax) },
  ];

  for (const m of moves) {
    const n: Pose3D = {
      x: m.x ?? base.x,
      y: m.y ?? base.y,
      z: m.z ?? base.z,
      yaw: m.yaw ?? base.yaw,
      pitch: m.pitch ?? base.pitch,
      roll: m.roll ?? base.roll,
    };

    // keep inside coarse bounds
    n.y = clamp(n.y, -yBound, yBound);
    n.z = clamp(n.z, zMin, zMax);

    out.push(n);
  }

  return out;
}
