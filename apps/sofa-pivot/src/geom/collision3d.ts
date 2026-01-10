export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface OBB3 {
  center: Vec3;
  half: Vec3;
  // Orthonormal basis vectors (local x,y,z in world space)
  axis: [Vec3, Vec3, Vec3];
}

export interface AABB3 {
  min: Vec3;
  max: Vec3;
}

const EPS = 1e-6;

export const Vec3 = {
  add: (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  dot: (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z,
  cross: (a: Vec3, b: Vec3): Vec3 => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  mul: (v: Vec3, s: number): Vec3 => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
  length: (v: Vec3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  normalize: (v: Vec3): Vec3 => {
    const len = Vec3.length(v);
    return len > 0 ? Vec3.mul(v, 1 / len) : { x: 0, y: 0, z: 0 };
  },
};

export function aabbToOBB(aabb: AABB3): OBB3 {
  const center = {
    x: (aabb.min.x + aabb.max.x) / 2,
    y: (aabb.min.y + aabb.max.y) / 2,
    z: (aabb.min.z + aabb.max.z) / 2,
  };
  const half = {
    x: (aabb.max.x - aabb.min.x) / 2,
    y: (aabb.max.y - aabb.min.y) / 2,
    z: (aabb.max.z - aabb.min.z) / 2,
  };
  return {
    center,
    half,
    axis: [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ],
  };
}

/**
 * Build an OBB from yaw/pitch/roll where:
 * - yaw rotates around Z
 * - pitch rotates around Y
 * - roll rotates around X
 */
export function obbFromPose(
  center: Vec3,
  half: Vec3,
  yaw: number,
  pitch: number,
  roll: number
): OBB3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);

  // Rotation matrix R = Rz(yaw) * Ry(pitch) * Rx(roll)
  // Columns are the rotated basis vectors.
  const m00 = cy * cp;
  const m01 = cy * sp * sr - sy * cr;
  const m02 = cy * sp * cr + sy * sr;

  const m10 = sy * cp;
  const m11 = sy * sp * sr + cy * cr;
  const m12 = sy * sp * cr - cy * sr;

  const m20 = -sp;
  const m21 = cp * sr;
  const m22 = cp * cr;

  const ax0 = Vec3.normalize({ x: m00, y: m10, z: m20 });
  const ax1 = Vec3.normalize({ x: m01, y: m11, z: m21 });
  const ax2 = Vec3.normalize({ x: m02, y: m12, z: m22 });

  return {
    center,
    half,
    axis: [ax0, ax1, ax2],
  };
}

/**
 * OBB vs OBB intersection using SAT (Real-Time Collision Detection).
 */
export function obbIntersectsOBB(a: OBB3, b: OBB3): boolean {
  // Compute rotation matrix expressing B in A's coordinate frame.
  const R: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const AbsR: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = Vec3.dot(a.axis[i], b.axis[j]);
      R[i][j] = r;
      AbsR[i][j] = Math.abs(r) + EPS;
    }
  }

  // Compute translation vector t = b.c - a.c in A's frame.
  const tWorld = Vec3.sub(b.center, a.center);
  const t = [
    Vec3.dot(tWorld, a.axis[0]),
    Vec3.dot(tWorld, a.axis[1]),
    Vec3.dot(tWorld, a.axis[2]),
  ];

  const aExt = [a.half.x, a.half.y, a.half.z];
  const bExt = [b.half.x, b.half.y, b.half.z];

  // Test axes L = A0, A1, A2
  for (let i = 0; i < 3; i++) {
    const ra = aExt[i];
    const rb = bExt[0] * AbsR[i][0] + bExt[1] * AbsR[i][1] + bExt[2] * AbsR[i][2];
    if (Math.abs(t[i]) > ra + rb) return false;
  }

  // Test axes L = B0, B1, B2
  for (let j = 0; j < 3; j++) {
    const ra = aExt[0] * AbsR[0][j] + aExt[1] * AbsR[1][j] + aExt[2] * AbsR[2][j];
    const rb = bExt[j];
    const tj = Math.abs(t[0] * R[0][j] + t[1] * R[1][j] + t[2] * R[2][j]);
    if (tj > ra + rb) return false;
  }

  // Test axis L = A0 x B0 ... A2 x B2
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const ra = aExt[(i + 1) % 3] * AbsR[(i + 2) % 3][j] + aExt[(i + 2) % 3] * AbsR[(i + 1) % 3][j];
      const rb = bExt[(j + 1) % 3] * AbsR[i][(j + 2) % 3] + bExt[(j + 2) % 3] * AbsR[i][(j + 1) % 3];

      const tij = Math.abs(
        t[(i + 2) % 3] * R[(i + 1) % 3][j] - t[(i + 1) % 3] * R[(i + 2) % 3][j]
      );

      if (tij > ra + rb) return false;
    }
  }

  return true;
}

export function getOBBCorners3(obb: OBB3): Vec3[] {
  const corners: Vec3[] = [];
  const signs = [-1, 1];
  for (const sx of signs) {
    for (const sy of signs) {
      for (const sz of signs) {
        const offset = Vec3.add(
          Vec3.add(Vec3.mul(obb.axis[0], sx * obb.half.x), Vec3.mul(obb.axis[1], sy * obb.half.y)),
          Vec3.mul(obb.axis[2], sz * obb.half.z)
        );
        corners.push(Vec3.add(obb.center, offset));
      }
    }
  }
  return corners;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
