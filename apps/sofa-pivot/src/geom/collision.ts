/**
 * 2D geometry utilities for collision detection and planning.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Segment {
  p1: Vec2;
  p2: Vec2;
}

export interface OBB {
  center: Vec2;
  halfExtents: Vec2;
  rotation: number; // radians
}

export interface Wall {
  segment: Segment;
  isDoor?: boolean;
}

export interface Couch {
  center: Vec2;
  length: number;
  width: number;
  rotation: number; // radians
}

/**
 * Vector operations.
 */
export const Vec2 = {
  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s }),
  dot: (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y,
  cross: (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x,
  length: (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vec2): Vec2 => {
    const len = Vec2.length(v);
    return len > 0 ? Vec2.mul(v, 1 / len) : { x: 0, y: 0 };
  },
  rotate: (v: Vec2, angle: number): Vec2 => ({
    x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
    y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
  }),
};

/**
 * Distance from point to line segment.
 */
export function pointToSegmentDistance(p: Vec2, seg: Segment): number {
  const v = Vec2.sub(seg.p2, seg.p1);
  const w = Vec2.sub(p, seg.p1);

  const c1 = Vec2.dot(w, v);
  if (c1 <= 0) return Vec2.length(Vec2.sub(p, seg.p1));

  const c2 = Vec2.dot(v, v);
  if (c2 <= c1) return Vec2.length(Vec2.sub(p, seg.p2));

  const b = c1 / c2;
  const pb = Vec2.add(seg.p1, Vec2.mul(v, b));
  return Vec2.length(Vec2.sub(p, pb));
}

/**
 * Get the four corners of an oriented bounding box.
 */
export function getOBBCorners(obb: OBB): Vec2[] {
  const corners: Vec2[] = [];
  const cos = Math.cos(obb.rotation);
  const sin = Math.sin(obb.rotation);

  for (let i = -1; i <= 1; i += 2) {
    for (let j = -1; j <= 1; j += 2) {
      const local = { x: i * obb.halfExtents.x, y: j * obb.halfExtents.y };
      const rotated = {
        x: local.x * cos - local.y * sin,
        y: local.x * sin + local.y * cos,
      };
      corners.push(Vec2.add(obb.center, rotated));
    }
  }

  return corners;
}

/**
 * Convert couch to OBB.
 */
export function couchToOBB(couch: Couch): OBB {
  return {
    center: couch.center,
    halfExtents: { x: couch.length / 2, y: couch.width / 2 },
    rotation: couch.rotation,
  };
}

/**
 * Check if an OBB intersects a wall segment.
 */
export function obbIntersectsWall(obb: OBB, wall: Wall): boolean {
  const corners = getOBBCorners(obb);

  // Check each corner against the wall segment
  for (const corner of corners) {
    const dist = pointToSegmentDistance(corner, wall.segment);
    if (dist < 0.01) return true; // small epsilon for numerical stability
  }

  // Check wall endpoints against OBB
  for (const pt of [wall.segment.p1, wall.segment.p2]) {
    if (pointInsideOBB(pt, obb)) return true;
  }

  return false;
}

/**
 * Check if a point is inside an OBB.
 */
export function pointInsideOBB(p: Vec2, obb: OBB): boolean {
  // Transform point to local OBB space
  const diff = Vec2.sub(p, obb.center);
  const cos = Math.cos(-obb.rotation);
  const sin = Math.sin(-obb.rotation);
  const local = {
    x: diff.x * cos - diff.y * sin,
    y: diff.x * sin + diff.y * cos,
  };

  return (
    Math.abs(local.x) <= obb.halfExtents.x + 0.01 &&
    Math.abs(local.y) <= obb.halfExtents.y + 0.01
  );
}

/**
 * Check if a couch collides with any walls.
 */
export function checkCollision(couch: Couch, walls: Wall[]): boolean {
  const obb = couchToOBB(couch);

  for (const wall of walls) {
    if (obbIntersectsWall(obb, wall)) {
      return true;
    }
  }

  return false;
}
