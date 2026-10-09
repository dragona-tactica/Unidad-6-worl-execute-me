#!/usr/bin/env python3
"""Bakes the FDTD bumblebee (obj + heat-map texture) into public/models/bee.bin.

    python3 tools/bake_bee.py ~/Downloads/bumblebee-fdtd-simulation 280000

Only the bee object is kept (the color bar and the field arrows are dropped).
Each point's color comes from the heat-map texture at its uv; its brightness,
stretched between the 2nd and 98th percentile, is stored as one byte. Same
layout as tools/bake_points.py (the byte is the "part"). Needs numpy + Pillow.
"""
import os, struct, sys
import numpy as np
from PIL import Image

root, total = os.path.expanduser(sys.argv[1]), int(sys.argv[2])
obj = os.path.join(root, 'source', 'simulation', 'Bumblebee_simulation_sketchfab_test.obj')
tex = np.array(Image.open(os.path.join(root, 'textures', 'Bumble001.png')).convert('RGB'))
th, tw = tex.shape[:2]

V, VT, F = [], [], []
inside = False
with open(obj, 'r', errors='ignore') as fh:
    for line in fh:
        if line.startswith('o '):
            inside = line.split()[1] == 'ExportedModel_with_Heatmap'
        elif line.startswith('v '):
            V.append(line.split()[1:4])
        elif line.startswith('vt '):
            VT.append(line.split()[1:3])
        elif inside and line.startswith('f '):
            idx = [t.split('/') for t in line.split()[1:]]
            vi = [int(t[0]) for t in idx]
            ti = [int(t[1]) for t in idx]
            for a in range(1, len(vi) - 1):
                F.append((vi[0], vi[a], vi[a + 1], ti[0], ti[a], ti[a + 1]))
V = np.array(V, dtype=np.float32)
VT = np.array(VT, dtype=np.float32)
F = np.array(F, dtype=np.int64)
F[:, :3] -= 1
F[:, 3:] -= 1
print(len(V), 'verts', len(F), 'tris')

A, B, C = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
area = np.linalg.norm(np.cross(B - A, C - A), axis=1) / 2
rng = np.random.default_rng(5)
pick = rng.choice(len(F), size=total, p=area / area.sum())
r1, r2 = rng.random(total), rng.random(total)
flip = r1 + r2 > 1
r1[flip], r2[flip] = 1 - r1[flip], 1 - r2[flip]
w0 = (1 - r1 - r2)[:, None]
f = F[pick]
pts = V[f[:, 0]] * w0 + V[f[:, 1]] * r1[:, None] + V[f[:, 2]] * r2[:, None]
uv = VT[f[:, 3]] * w0 + VT[f[:, 4]] * r1[:, None] + VT[f[:, 5]] * r2[:, None]
px = np.clip((uv[:, 0] % 1.0) * tw, 0, tw - 1).astype(int)
py = np.clip((1 - (uv[:, 1] % 1.0)) * th, 0, th - 1).astype(int)
rgb = tex[py, px].astype(np.float32)
luma = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
lo, hi = np.percentile(luma, [2, 98])
byte = np.clip((luma - lo) / max(hi - lo, 1) * 255, 0, 255).astype(np.uint8)

center = (pts.min(0) + pts.max(0)) / 2
half = float((pts.max(0) - pts.min(0)).max() / 2)
q = np.round((pts - center) / half * 32767).astype(np.int16)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'models', 'bee.bin')
with open(out, 'wb') as fh:
    fh.write(struct.pack('<If', len(q), half))
    fh.write(q.tobytes())
    fh.write(byte.tobytes())
print('bee', len(q), 'points', os.path.getsize(out) // 1024, 'KB; bbox', pts.min(0).round(2), pts.max(0).round(2))
