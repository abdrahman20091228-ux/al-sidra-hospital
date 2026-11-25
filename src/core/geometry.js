import * as THREE from 'three';

/**
 * High-performance static geometry batcher.
 * Merges hundreds of boxes/cylinders/planes sharing the same material into a single draw call,
 * with automatic world-space UV scaling on boxes so seamless textures NEVER look stretched!
 */
export class GeometryBatcher {
  constructor() {
    this.buckets = new Map();
    this.meshes = [];
  }

  _bucket(material, castShadow = true, receiveShadow = true) {
    const key = `${material.uuid}_${castShadow ? 1 : 0}_${receiveShadow ? 1 : 0}`;
    let b = this.buckets.get(key);
    if (!b) {
      b = {
        material,
        castShadow,
        receiveShadow,
        pos: [],
        nor: [],
        uv: [],
        idx: [],
        vc: 0,
      };
      this.buckets.set(key, b);
    }
    return b;
  }

  addGeometry(material, geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, castShadow = true, receiveShadow = true) {
    const b = this._bucket(material, castShadow, receiveShadow);
    const posAttr = geo.attributes.position;
    const norAttr = geo.attributes.normal;
    const uvAttr = geo.attributes.uv;
    const index = geo.index;

    const mat = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')),
      new THREE.Vector3(sx, sy, sz)
    );
    const normMat = new THREE.Matrix3().getNormalMatrix(mat);
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();

    const base = b.vc;
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i).applyMatrix4(mat);
      b.pos.push(v.x, v.y, v.z);
      if (norAttr) {
        n.fromBufferAttribute(norAttr, i).applyMatrix3(normMat).normalize();
        b.nor.push(n.x, n.y, n.z);
      } else {
        b.nor.push(0, 1, 0);
      }
      if (uvAttr) {
        b.uv.push(uvAttr.getX(i), uvAttr.getY(i));
      } else {
        b.uv.push(0, 0);
      }
    }
    b.vc += posAttr.count;

    if (index) {
      for (let i = 0; i < index.count; i++) {
        b.idx.push(index.getX(i) + base);
      }
    } else {
      for (let i = 0; i < posAttr.count; i++) {
        b.idx.push(base + i);
      }
    }
  }

  /**
   * Add a box with crisp world-scaled UVs (tileScale = meters per texture repeat).
   * Prevents stretched wall/floor textures on arbitrary architectural dimensions!
   */
  addBox(material, w, h, d, x, y, z, ry = 0, tileScale = 2.4, castShadow = true, receiveShadow = true, rx = 0, rz = 0) {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (tileScale > 0) {
      const uv = geo.attributes.uv;
      const nor = geo.attributes.normal;
      for (let i = 0; i < uv.count; i++) {
        const nx = Math.abs(nor.getX(i));
        const ny = Math.abs(nor.getY(i));
        let u = uv.getX(i);
        let v = uv.getY(i);
        if (nx > 0.5) {
          // +X / -X face: width = d, height = h
          u *= d / tileScale;
          v *= h / tileScale;
        } else if (ny > 0.5) {
          // +Y / -Y face: width = w, height = d
          u *= w / tileScale;
          v *= d / tileScale;
        } else {
          // +Z / -Z face: width = w, height = h
          u *= w / tileScale;
          v *= h / tileScale;
        }
        uv.setXY(i, u, v);
      }
    }
    this.addGeometry(material, geo, x, y, z, rx, ry, rz, 1, 1, 1, castShadow, receiveShadow);
    geo.dispose();
  }

  addCylinder(material, rt, rb, h, segs, x, y, z, rx = 0, ry = 0, rz = 0, castShadow = true, receiveShadow = true) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, segs);
    this.addGeometry(material, geo, x, y, z, rx, ry, rz, 1, 1, 1, castShadow, receiveShadow);
    geo.dispose();
  }

  addPlane(material, w, h, x, y, z, rx = 0, ry = 0, rz = 0, tileScale = 0, castShadow = false, receiveShadow = true) {
    const geo = new THREE.PlaneGeometry(w, h);
    if (tileScale > 0) {
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) * (w / tileScale), uv.getY(i) * (h / tileScale));
      }
    }
    this.addGeometry(material, geo, x, y, z, rx, ry, rz, 1, 1, 1, castShadow, receiveShadow);
    geo.dispose();
  }

  flush(parent) {
    for (const b of this.buckets.values()) {
      if (b.vc === 0) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      geo.setIndex(b.idx);
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, b.material);
      mesh.castShadow = b.castShadow;
      mesh.receiveShadow = b.receiveShadow;
      parent.add(mesh);
      this.meshes.push(mesh);
    }
    this.buckets.clear();
  }

  dispose() {
    for (const m of this.meshes) {
      m.geometry.dispose();
    }
    this.meshes.length = 0;
    this.buckets.clear();
  }
}

/**
 * Helper to create a clean InstancedMesh from a list of transforms { x, y, z, rx, ry, rz, sx, sy, sz, color }
 */
export function buildInstancedMesh(geometry, material, transforms, castShadow = true, receiveShadow = true) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let hasColors = false;
  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0);
    dummy.scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (t.color !== undefined) {
      hasColors = true;
      col.setHex(t.color);
      mesh.setColorAt(i, col);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (hasColors && mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.frustumCulled = true;
  return mesh;
}
