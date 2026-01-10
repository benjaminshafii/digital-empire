import type { AABB3 } from "../geom/collision3d";

export interface RoomConfig3D {
  couchLength: number;
  couchWidth: number;
  couchHeight: number;

  hallwayWidth: number;
  hallwayHeight: number;
  hallwayLength: number;

  doorWidth: number;
  doorHeight: number;
  wallThickness: number;

  roomWidth: number;
  roomHeight: number;
  roomDepth: number;
}

export function buildObstacles(config: RoomConfig3D): AABB3[] {
  const t = config.wallThickness;

  const hallHalf = config.hallwayWidth / 2;
  const roomHalf = config.roomWidth / 2;

  const hl = config.hallwayLength;
  const hallH = config.hallwayHeight;

  const rd = config.roomDepth;
  const roomH = config.roomHeight;

  const doorHalf = config.doorWidth / 2;

  const obstacles: AABB3[] = [];

  // Hallway side walls (along x from -hl..0)
  obstacles.push({
    min: { x: -hl, y: hallHalf, z: 0 },
    max: { x: 0, y: hallHalf + t, z: hallH },
  });
  obstacles.push({
    min: { x: -hl, y: -hallHalf - t, z: 0 },
    max: { x: 0, y: -hallHalf, z: hallH },
  });

  // Hallway back wall
  obstacles.push({
    min: { x: -hl - t, y: -hallHalf - t, z: 0 },
    max: { x: -hl, y: hallHalf + t, z: hallH },
  });

  // Door frame wall (at x = 0..t) with opening
  // Left jamb
  obstacles.push({
    min: { x: 0, y: doorHalf, z: 0 },
    max: { x: t, y: hallHalf + t, z: config.doorHeight },
  });
  // Right jamb
  obstacles.push({
    min: { x: 0, y: -hallHalf - t, z: 0 },
    max: { x: t, y: -doorHalf, z: config.doorHeight },
  });
  // Header
  obstacles.push({
    min: { x: 0, y: -hallHalf - t, z: config.doorHeight },
    max: { x: t, y: hallHalf + t, z: hallH },
  });

  // Room side walls (x from 0..rd)
  obstacles.push({
    min: { x: 0, y: roomHalf, z: 0 },
    max: { x: rd, y: roomHalf + t, z: roomH },
  });
  obstacles.push({
    min: { x: 0, y: -roomHalf - t, z: 0 },
    max: { x: rd, y: -roomHalf, z: roomH },
  });

  // Room back wall
  obstacles.push({
    min: { x: rd, y: -roomHalf - t, z: 0 },
    max: { x: rd + t, y: roomHalf + t, z: roomH },
  });

  return obstacles;
}
