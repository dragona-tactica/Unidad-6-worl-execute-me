// CODE LAYER — a screen-capture of someone programming the song. Each time the
// performer fires a card, its verse is typed into the editor as a line of code.
// Nothing types by itself: the typing is the echo of a key press. It is plain
// DOM above the canvas, so it does not depend on what the swarm is doing.
const MAX_LINES = 9;
const CPS = 34; // characters per second

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function createCodeLayer(parent) {
  const root = document.createElement('div');
  root.className = 'code-layer';
  root.innerHTML = `
    <div class="code-bar"><i></i><i></i><i></i><span>world.execute(me).js</span></div>
    <div class="code-lines"></div>`;
  parent.append(root);
  const box = root.querySelector('.code-lines');

  let lineNo = 0;
  let current = null; // { el, number, text, shown, done }
  const lines = [];

  // syntax colors for `call("text");`
  const paint = (prefix, typed, suffix) =>
    `<span class="fn">${escapeHtml(prefix)}</span><span class="str">${escapeHtml(typed)}</span><span class="fn">${escapeHtml(suffix)}</span>`;

  const render = (line) => {
    const number = String(line.number).padStart(2, '0');
    const shown = Math.floor(line.shown);
    const a = line.prefix.length;
    const b = a + line.text.length;
    const typedPrefix = line.full.slice(0, Math.min(shown, a));
    const typedText = line.full.slice(a, Math.max(a, Math.min(shown, b)));
    const typedSuffix = line.full.slice(b, shown);
    const caret = line.live ? '<b class="caret"></b>' : '';
    line.el.innerHTML = `<em>${number}</em>${paint(typedPrefix, typedText, typedSuffix)}${caret}`;
  };

  const finish = (line) => {
    line.shown = line.full.length;
    line.live = false;
    render(line);
  };

  const addLine = (prefix, text, suffix) => {
    if (current) finish(current);
    const el = document.createElement('div');
    el.className = 'code-line';
    box.append(el);
    const line = { el, number: ++lineNo, prefix, text, suffix, full: prefix + text + suffix, shown: 0, live: true };
    lines.push(line);
    current = line;
    while (lines.length > MAX_LINES) lines.shift().el.remove();
    lines.forEach((l, i) => l.el.style.opacity = String(0.35 + 0.65 * ((i + 1) / lines.length)));
    render(line);
  };

  let last = performance.now();
  const tick = (now) => {
    const dt = (now - last) / 1000;
    last = now;
    if (current && current.shown < current.full.length) {
      current.shown = Math.min(current.full.length, current.shown + dt * CPS);
      render(current);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  return {
    // a card was fired: its verse is typed as `execute("…");`
    type(verse) {
      if (verse) addLine('execute("', verse, '");');
    },
    // space: the figure is let go
    release() {
      addLine('signal.', 'release', '();');
    }
  };
}
