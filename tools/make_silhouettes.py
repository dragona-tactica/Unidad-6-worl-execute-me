#!/usr/bin/env python3
"""Turns the reference images into particle silhouettes.

Each entry of tools/silhouettes.json describes how to cut one subject out of
its reference image (a mask) and writes public/silhouettes/<id>.png: RGB keeps
the original colors, alpha is the mask. The page samples particles from that
mask (see src/figures/silhouette.js).

    python3 tools/make_silhouettes.py            # all entries
    python3 tools/make_silhouettes.py trex robot # only these ids
    python3 tools/make_silhouettes.py --sheet out.png trex robot   # contact sheet

Needs numpy, scipy and Pillow. The source images are not in the repo:
SRC_DIR points at the folder with the reference images.
"""
import json
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC_DIR = os.path.expanduser(os.environ.get('SILHOUETTE_SRC', '~/Downloads/execute me'))
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, '..', 'public', 'silhouettes')


def disk(radius):
    r = int(radius)
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def rgb_to_hsv(rgb):
    return np.array(Image.fromarray(rgb.astype(np.uint8)).convert('HSV')).astype(float)


def first_mask(img, cfg):
    arr = np.array(img.convert('RGBA')).astype(float)
    rgb, alpha = arr[..., :3], arr[..., 3]
    luma = rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114
    mode = cfg.get('mode', 'bg')
    thr = cfg.get('thr', 40)
    if mode == 'alpha':
        return alpha > thr
    if mode == 'dark':
        return luma < thr
    if mode == 'light':
        return luma > thr
    if mode == 'bg':
        border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
        bg = np.median(border, axis=0)
        return np.linalg.norm(rgb - bg, axis=-1) > thr
    if mode == 'expr':
        hsv = rgb_to_hsv(rgb)
        border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
        bgc = np.median(border, axis=0)
        env = {
            'bgd': np.linalg.norm(rgb - bgc, axis=-1),
            'r': rgb[..., 0], 'g': rgb[..., 1], 'b': rgb[..., 2], 'luma': luma, 'alpha': alpha,
            'h': hsv[..., 0] * 360 / 255, 's': hsv[..., 1] / 255, 'v': hsv[..., 2] / 255, 'np': np
        }
        return eval(cfg['expr'], {'__builtins__': {}}, env)
    raise ValueError(mode)


def refine(mask, cfg):
    if cfg.get('line'):  # line art: close the contours, then fill them in
        mask = ndi.binary_dilation(mask, disk(cfg['line']))
        mask = ndi.binary_fill_holes(mask)
        mask = ndi.binary_erosion(mask, disk(max(1, cfg['line'] - 1)))
    if cfg.get('close'):
        mask = ndi.binary_closing(mask, disk(cfg['close']))
    if cfg.get('fill_max'):  # fill only small holes (balls of a molecule), not the big gaps between them
        labels, n = ndi.label(~mask)
        edge = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
        sizes = ndi.sum(~mask, labels, range(1, n + 1))
        for i, size in enumerate(sizes, start=1):
            if i not in edge and size < cfg['fill_max']:
                mask[labels == i] = True
    elif cfg.get('fill', True):
        mask = ndi.binary_fill_holes(mask)
    if cfg.get('open'):
        mask = ndi.binary_opening(mask, disk(cfg['open']))
    if cfg.get('grow'):
        mask = ndi.binary_dilation(mask, disk(cfg['grow']))
    keep = cfg.get('largest')
    if keep:
        labels, n = ndi.label(mask)
        if n > keep:
            sizes = ndi.sum(mask, labels, range(1, n + 1))
            top = np.argsort(sizes)[::-1][:keep] + 1
            mask = np.isin(labels, top)
    min_area = cfg.get('min_area')
    if min_area:
        labels, n = ndi.label(mask)
        sizes = ndi.sum(mask, labels, range(1, n + 1))
        mask = np.isin(labels, [i + 1 for i, s in enumerate(sizes) if s >= min_area])
    return mask


def build(entry):
    src = Image.open(os.path.join(SRC_DIR, entry['src']))
    if getattr(src, 'n_frames', 1) > 1:
        src.seek(0)
    img = src.convert('RGBA')
    if entry.get('crop'):
        img = img.crop(tuple(entry['crop']))
    arr = np.array(img)
    for x0, y0, x1, y1 in entry.get('erase', []):  # paint over frames, captions, pens...
        border = np.median(np.concatenate([arr[0, :, :3], arr[-1, :, :3]]), axis=0)
        arr[y0:y1, x0:x1, :3] = border
        arr[y0:y1, x0:x1, 3] = 255 if entry.get('mode') != 'alpha' else 0
    img = Image.fromarray(arr)
    if entry.get('half'):  # a split portrait: keep one side and mirror it into a whole figure
        w = img.width
        left = entry['half'] == 'left'
        trim = entry.get('half_trim', 0)
        half = img.crop((0, 0, w // 2 - trim, img.height)) if left else img.crop((w // 2 + trim, 0, w, img.height))
        mirror = half.transpose(Image.FLIP_LEFT_RIGHT)
        whole = Image.new('RGBA', (half.width * 2, half.height))
        whole.paste(half if left else mirror, (0, 0))
        whole.paste(mirror if left else half, (half.width, 0))
        img = whole
    mask = refine(first_mask(img, entry), entry)
    if entry.get('trim', True):
        ys, xs = np.where(mask)
        pad = 3
        box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(mask.shape[1], xs.max() + pad + 1), min(mask.shape[0], ys.max() + pad + 1))
        img = img.crop(box)
        mask = mask[box[1]:box[3], box[0]:box[2]]
    size = entry.get('size', 256)
    scale = size / max(img.size)
    new = (max(2, round(img.width * scale)), max(2, round(img.height * scale)))
    img = img.resize(new, Image.LANCZOS)
    m = Image.fromarray((mask * 255).astype(np.uint8)).resize(new, Image.LANCZOS)
    rgba = np.array(img.convert('RGBA'))
    rgba[..., 3] = np.array(m)
    if entry.get('flip'):
        rgba = rgba[:, ::-1]
    return Image.fromarray(rgba)


def main(argv):
    sheet = None
    if '--sheet' in argv:
        i = argv.index('--sheet')
        sheet = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    with open(os.path.join(HERE, 'silhouettes.json')) as f:
        entries = json.load(f)
    wanted = set(argv) or set(entries)
    os.makedirs(OUT_DIR, exist_ok=True)
    made = []
    for sid, entry in entries.items():
        if sid.startswith('_') or sid not in wanted:
            continue
        out = build(entry)
        out.save(os.path.join(OUT_DIR, f'{sid}.png'), optimize=True)
        made.append((sid, out))
        print(f'{sid}: {out.size[0]}x{out.size[1]}  {os.path.getsize(os.path.join(OUT_DIR, sid + ".png")) // 1024} KB')
    if sheet and made:
        cell = 300
        cols = min(4, len(made))
        rows = (len(made) + cols - 1) // cols
        canvas = Image.new('RGB', (cols * cell, rows * cell), (10, 1, 24))
        for k, (sid, im) in enumerate(made):
            a = np.array(im)
            vis = np.zeros(a.shape[:2] + (3,), np.uint8)
            vis[...] = (10, 1, 24)
            m = a[..., 3:4] / 255.0
            vis = (a[..., :3] * m + vis * (1 - m)).astype(np.uint8)
            t = Image.fromarray(vis)
            t.thumbnail((cell - 8, cell - 8))
            canvas.paste(t, ((k % cols) * cell + 4, (k // cols) * cell + 4))
        canvas.save(sheet)


if __name__ == '__main__':
    main(sys.argv[1:])
