// On-screen diagnostics: if something fails on a machine I can't see, the
// page itself says what happened. Errors always show up; the full status
// line (GPU, size, frames, fps) appears with ?debug in the URL.
export function createDiagnostics({ count }) {
  let canvas = null;
  const verbose = new URLSearchParams(location.search).has('debug');
  const box = document.createElement('pre');
  box.className = 'diag';
  document.body.append(box);

  const errors = [];
  let gpuLabel = 'GPU ?';
  let frames = 0;
  let fps = 0;
  let windowStart = performance.now();
  let windowFrames = 0;

  const paint = () => {
    const lines = [];
    if (verbose) {
      lines.push(
        `${gpuLabel} · ${canvas ? `${canvas.width}×${canvas.height}` : 'sin canvas'} · ${count} agentes · cuadros ${frames} · ${fps} fps`
      );
      lines.push(navigator.userAgent.replace(/^Mozilla\/5.0 /, '').slice(0, 110));
    }
    // Errors stay on screen for a few seconds (all the time with ?debug), so a
    // one-off hiccup like the pane being resized doesn't cover the picture.
    const now = performance.now();
    const recent = errors.filter((e) => verbose || now - e.at < 6000);
    if (recent.length) lines.push(...recent.map((e) => `⚠ ${e.text}`));
    box.textContent = lines.join('\n');
    box.style.display = lines.length ? 'block' : 'none';
  };

  const remember = (text) => {
    errors.push({ text: String(text).replace(/\s+/g, ' ').slice(0, 200), at: performance.now() });
    while (errors.length > 4) errors.shift();
    paint();
    setTimeout(paint, 6100);
  };

  const nativeError = console.error;
  console.error = (...args) => {
    nativeError(...args);
    remember(args.map((a) => a?.message ?? a).join(' '));
  };
  addEventListener('error', (e) => remember(e.message));
  addEventListener('unhandledrejection', (e) => remember(e.reason?.message ?? e.reason));

  navigator.gpu?.requestAdapter?.().then((adapter) => {
    const info = adapter?.info;
    gpuLabel = adapter ? `WebGPU ✓ ${[info?.vendor, info?.architecture].filter(Boolean).join(' ')}` : 'WebGPU sin adaptador';
    paint();
  });

  paint();
  return {
    attach(renderer) {
      canvas = renderer.domElement;
      paint();
    },
    tick() {
      frames++;
      windowFrames++;
      const now = performance.now();
      if (now - windowStart >= 1000) {
        fps = Math.round((windowFrames * 1000) / (now - windowStart));
        windowFrames = 0;
        windowStart = now;
        if (verbose) paint();
      }
    }
  };
}
