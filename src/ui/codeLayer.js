// CODE LAYER — a screen-capture of someone programming the song. Each time the
// performer moves to a card, its stanza is typed into the editor as lines of
// code. Nothing types by itself: the typing is the echo of a key press. It is
// plain DOM above the canvas, so it does not depend on what the swarm is doing.
const MAX_LINES = 12;
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
  let current = null;
  const lines = [];
  const pending = []; // [prefix, text, suffix] waiting to be typed

  const render = (line) => {
    const number = line.gap ? '' : String(line.number).padStart(2, '0');
    const shown = Math.floor(line.shown);
    const a = line.prefix.length;
    const b = a + line.text.length;
    const typed = (from, to) => escapeHtml(line.full.slice(from, to));
    const caret = line.live ? '<b class="caret"></b>' : '';
    line.el.innerHTML = `<em>${number}</em><span class="fn">${typed(0, Math.min(shown, a))}</span><span class="str">${typed(a, Math.max(a, Math.min(shown, b)))}</span><span class="fn">${typed(b, shown)}</span>${caret}`;
  };

  const finish = (line) => {
    line.shown = line.full.length;
    line.live = false;
    render(line);
  };

  const start = ([prefix, text, suffix]) => {
    if (current) finish(current);
    const el = document.createElement('div');
    el.className = 'code-line';
    box.append(el);
    const gap = !text && !prefix;
    const line = { el, gap, number: gap ? 0 : ++lineNo, prefix, text, suffix, full: prefix + text + suffix, shown: 0, live: !gap };
    lines.push(line);
    current = line;
    while (lines.length > MAX_LINES) lines.shift().el.remove();
    lines.forEach((l, i) => (l.el.style.opacity = String(0.35 + 0.65 * ((i + 1) / lines.length))));
    render(line);
  };

  let last = performance.now();
  const tick = (now) => {
    const dt = (now - last) / 1000;
    last = now;
    // a long stanza types faster so it is done before the next card
    const speed = CPS * (1 + Math.min(pending.length, 8) * 0.5);
    if (current && current.shown < current.full.length) {
      current.shown = Math.min(current.full.length, current.shown + dt * speed);
      render(current);
    } else if (pending.length) start(pending.shift());
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const queue = (items) => {
    const list = items.filter((t) => t !== undefined);
    if (!list.length) return;
    // a blank line separates this stanza from the previous one
    if (lines.length || pending.length) pending.push(['', '', '']);
    for (const text of list) pending.push(text === '' ? ['', '', ''] : ['execute("', text, '");']);
  };

  return {
    // the card's stanza (an array of lines, '' = gap) or a single verse
    type(text) {
      queue(Array.isArray(text) ? text : text ? [text] : []);
    },
    release() {
      if (lines.length || pending.length) pending.push(['', '', '']);
      pending.push(['signal.', 'release', '();']);
    }
  };
}
