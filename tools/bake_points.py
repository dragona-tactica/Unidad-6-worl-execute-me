#!/usr/bin/env python3
"""Bakes heavy .obj sculpts into a compact point cloud (.bin) the page can load fast.

    python3 tools/bake_points.py birbo ~/Downloads/happy-birbo/happy/archive 240000

Writes public/models/<name>.bin:
    uint32  count
    float32 halfExtent     (positions are int16, fraction of this, centered on the bbox)
    int16   x y z * count
    uint8   part index * count   (one part per SubTool, in file-name order)
Needs numpy.
"""
import glob, os, struct, sys
import numpy as np

name, folder, total = sys.argv[1], os.path.expanduser(sys.argv[2]), int(sys.argv[3])
files = sorted(glob.glob(os.path.join(folder, 'SubTool-*.obj')) or glob.glob(os.path.join(folder, '*.obj')))
rng = np.random.default_rng(3)

meshes = []
for f in files:
    verts, tris = [], []
    with open(f, 'r', errors='ignore') as fh:
        for line in fh:
            if line.startswith('v '):
                verts.append(line.split()[1:4])
            elif line.startswith('f '):
                idx = [int(t.split('/')[0]) for t in line.split()[1:]]
                for a in range(1, len(idx) - 1):
                    tris.append((idx[0], idx[a], idx[a + 1]))
    v = np.array(verts, dtype=np.float32)
    t = np.array(tris, dtype=np.int64) - 1
    a, b, c = v[t[:, 0]], v[t[:, 1]], v[t[:, 2]]
    area = np.linalg.norm(np.cross(b - a, c - a), axis=1) / 2
    meshes.append((v, t, area))
    print(os.path.basename(f), len(v), 'verts', len(t), 'tris')

area_all = sum(m[2].sum() for m in meshes)
pts, parts = [], []
for k, (v, t, area) in enumerate(meshes):
    n = max(40, int(total * area.sum() / area_all))   # even tiny parts (eyes) keep some points
    pick = rng.choice(len(t), size=n, p=area / area.sum())
    r1, r2 = rng.random(n), rng.random(n)
    flip = r1 + r2 > 1
    r1[flip], r2[flip] = 1 - r1[flip], 1 - r2[flip]
    a, b, c = v[t[pick, 0]], v[t[pick, 1]], v[t[pick, 2]]
    pts.append(a + (b - a) * r1[:, None] + (c - a) * r2[:, None])
    parts.append(np.full(n, k, np.uint8))
pts, parts = np.concatenate(pts), np.concatenate(parts)
center = (pts.min(0) + pts.max(0)) / 2
half = float((pts.max(0) - pts.min(0)).max() / 2)
q = np.round((pts - center) / half * 32767).astype(np.int16)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'models', name + '.bin')
with open(out, 'wb') as fh:
    fh.write(struct.pack('<If', len(q), half))
    fh.write(q.tobytes())
    fh.write(parts.tobytes())
print(name, len(q), 'points', os.path.getsize(out) // 1024, 'KB', 'half extent', half)
