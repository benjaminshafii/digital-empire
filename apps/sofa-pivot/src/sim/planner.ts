/**
 * Path planning for moving a couch through a hallway.
 */

import { Couch, Wall, checkCollision } from "../geom/collision";

export interface PathNode {
  x: number;
  y: number;
  rotation: number;
}

export interface PlanResult {
  path: PathNode[];
  success: boolean;
  reason?: string;
}

export interface RoomConfig {
  couchLength: number;
  couchWidth: number;
  hallwayWidth: number;
  doorWidth: number;
  hallwayLength: number;
  roomWidth: number;
  roomDepth: number;
}

/**
 * Generate walls for the hallway + door + room layout.
 */
export function generateWalls(config: RoomConfig): Wall[] {
  const walls: Wall[] = [];
  const hw = config.hallwayWidth;
  const dw = config.doorWidth;
  const hl = config.hallwayLength;
  const rw = config.roomWidth;
  const rd = config.roomDepth;

  // Hallway walls
  const halfHall = hw / 2;

  // Left wall (hallway)
  walls.push({
    segment: {
      p1: { x: -hl, y: halfHall },
      p2: { x: 0, y: halfHall },
    },
  });

  // Right wall (hallway)
  walls.push({
    segment: {
      p1: { x: -hl, y: -halfHall },
      p2: { x: 0, y: -halfHall },
    },
  });

  // Back wall (end of hallway)
  walls.push({
    segment: {
      p1: { x: -hl, y: -halfHall },
      p2: { x: -hl, y: halfHall },
    },
  });

  // Door walls (at x = 0)
  const halfDoor = dw / 2;
  walls.push({
    segment: {
      p1: { x: 0, y: halfHall },
      p2: { x: 0, y: halfDoor },
    },
    isDoor: true,
  });
  walls.push({
    segment: {
      p1: { x: 0, y: -halfHall },
      p2: { x: 0, y: -halfDoor },
    },
    isDoor: true,
  });

  // Room walls
  const halfRoom = rw / 2;
  const roomStartX = 0.2; // Slight offset from door

  // Left wall (room)
  walls.push({
    segment: {
      p1: { x: roomStartX, y: halfRoom },
      p2: { x: roomStartX + rd, y: halfRoom },
    },
  });

  // Right wall (room)
  walls.push({
    segment: {
      p1: { x: roomStartX, y: -halfRoom },
      p2: { x: roomStartX + rd, y: -halfRoom },
    },
  });

  // Back wall (room)
  walls.push({
    segment: {
      p1: { x: roomStartX + rd, y: -halfRoom },
      p2: { x: roomStartX + rd, y: halfRoom },
    },
  });

  return walls;
}

/**
 * Sample a set of poses to explore.
 */
function samplePoses(config: RoomConfig): PathNode[] {
  const poses: PathNode[] = [];
  const hw = config.hallwayWidth;
  const hl = config.hallwayLength;
  const rd = config.roomDepth;
  const cl = config.couchLength;

  // Hallway positions - approach the door
  for (let x = -hl + cl / 2; x <= -0.5; x += 0.2) {
    poses.push({ x, y: 0, rotation: 0 }); // Aligned with hallway
    poses.push({ x, y: 0, rotation: Math.PI / 4 }); // Slight angle
  }

  // Door positions - critical pivot point
  const doorX = -0.2;
  for (let y = -hw / 2 + 0.1; y <= hw / 2 - 0.1; y += 0.15) {
    for (let rot = 0; rot <= Math.PI / 2; rot += Math.PI / 12) {
      poses.push({ x: doorX, y, rotation: rot });
    }
  }

  // Room positions - after entering
  for (let x = 0.3; x <= rd - cl / 2; x += 0.3) {
    poses.push({ x, y: 0, rotation: Math.PI / 2 }); // Aligned with room
    poses.push({ x, y: 0.5, rotation: Math.PI / 2 });
    poses.push({ x, y: -0.5, rotation: Math.PI / 2 });
  }

  return poses;
}

/**
 * Simple A* search for a collision-free path.
 */
export function findPath(
  config: RoomConfig,
  walls: Wall[]
): PlanResult {
  const start: PathNode = {
    x: -config.hallwayLength + config.couchLength / 2 + 0.5,
    y: 0,
    rotation: 0,
  };

  const goal: PathNode = {
    x: config.roomDepth - config.couchLength / 2 - 0.5,
    y: 0,
    rotation: Math.PI / 2,
  };

  // Sample the state space
  const poses = samplePoses(config);

  // Build a graph: connect poses that are reachable without collision
  const graph = new Map<number, Set<number>>();

  for (let i = 0; i < poses.length; i++) {
    graph.set(i, new Set());
  }

  // Add start and goal to poses
  const allPoses = [start, ...poses, goal];
  const startIdx = 0;
  const goalIdx = allPoses.length - 1;

  // Add edges
  for (let i = 0; i < allPoses.length; i++) {
    for (let j = i + 1; j < allPoses.length; j++) {
      const from = allPoses[i];
      const to = allPoses[j];

      // Distance check
      const dist = Math.sqrt(
        Math.pow(from.x - to.x, 2) +
        Math.pow(from.y - to.y, 2)
      );

      if (dist > 0.8) continue; // Too far

      // Rotation change check
      const rotDiff = Math.abs(from.rotation - to.rotation);
      if (rotDiff > Math.PI / 4) continue; // Too much rotation

      // Interpolate and check collision
      const steps = 5;
      let collisionFree = true;

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const couch: Couch = {
          center: {
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
          },
          length: config.couchLength,
          width: config.couchWidth,
          rotation: from.rotation + (to.rotation - from.rotation) * t,
        };

        if (checkCollision(couch, walls)) {
          collisionFree = false;
          break;
        }
      }

      if (collisionFree) {
        graph.get(i)!.add(j);
        graph.get(j)!.add(i);
      }
    }
  }

  // A* search
  const openSet = new Set([startIdx]);
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();

  gScore.set(startIdx, 0);
  fScore.set(startIdx, heuristic(start, goal));

  while (openSet.size > 0) {
    // Find node with lowest fScore
    let current: number | null = null;
    let lowestF = Infinity;

    for (const idx of openSet) {
      const f = fScore.get(idx) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = idx;
      }
    }

    if (current === goalIdx) {
      // Reconstruct path
      const path: PathNode[] = [];
      let node = goalIdx;

      while (node !== startIdx) {
        path.unshift(allPoses[node]);
        node = cameFrom.get(node)!;
      }

      path.unshift(start);

      return {
        path,
        success: true,
      };
    }

    if (current === null) break;

    openSet.delete(current);

    const neighbors = graph.get(current) ?? [];

    for (const neighbor of neighbors) {
      const tentativeG = (gScore.get(current) ?? 0) +
        distance(allPoses[current], allPoses[neighbor]);

      if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentativeG);
        fScore.set(neighbor, tentativeG + heuristic(allPoses[neighbor], goal));
        openSet.add(neighbor);
      }
    }
  }

  return {
    path: [],
    success: false,
    reason: "Could not find a collision-free path",
  };
}

function heuristic(a: PathNode, b: PathNode): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  );
}

function distance(a: PathNode, b: PathNode): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2)
  );
}
