// ERROR LAYER — retro "error" windows piled over the screen. It is additive:
// each press of the add button (or `]`) opens one more, each press of the
// remove button (or `[`) closes the newest. Independent of the swarm.
const MESSAGES = [
  ['execute.exe', 'The instruction at 0x00000000 referenced memory at 0x00000000. The memory could not be "read".'],
  ['simulation.dll', 'Unhandled exception: world is not defined.'],
  ['love.exe', 'StackOverflowError: love() calls love() without an exit condition.'],
  ['me.js', "TypeError: Cannot read properties of undefined (reading 'me')."],
  ['reality.sys', 'Segmentation fault (core dumped). The simulation was terminated.'],
  ['god.bin', 'Permission denied: you are not the owner of this process.'],
  ['signal.tv', 'No signal. Check the cable or press any key.'],
  ['loop.cpp', 'Infinite loop detected. Press OK to continue it.'],
  ['heart.db', 'Fatal error: cannot open the file "heart.db". It is bleeding.'],
  ['arguments.py', 'IllegalArgumentException: argument is not legal.'],
  ['fragments.zip', 'The archive is corrupt. 54 pointless fragments could not be extracted.'],
  ['vision.exe', 'Warning: vision is blurred. Retry, Abort or Ignore?'],
  ['memory.log', 'Out of memory. Deleting the pointless fragments...'],
  ['trance.exe', 'The program is not responding. Wait or close it.']
];
const MAX = 40;

export function createErrorLayer(parent) {
  const layer = document.createElement('div');
  layer.className = 'error-layer';
  parent.append(layer);
  const open = [];
  let counter = 0;

  const close = (dialog) => {
    const at = open.indexOf(dialog);
    if (at < 0) return;
    open.splice(at, 1);
    dialog.classList.add('leaving');
    setTimeout(() => dialog.remove(), 140);
  };

  return {
    add() {
      if (open.length >= MAX) return;
      const [title, text] = MESSAGES[counter % MESSAGES.length];
      counter++;
      const dialog = document.createElement('div');
      dialog.className = 'error-dialog';
      dialog.innerHTML = `
        <div class="error-title"><span>${title}</span><button class="error-x" tabindex="-1" aria-label="close">×</button></div>
        <div class="error-body"><div class="error-icon">✕</div><p>${text}</p></div>
        <div class="error-actions"><button class="error-ok" tabindex="-1">OK</button></div>`;
      // scattered over the screen, but never fully off it
      const x = 4 + Math.random() * 62;
      const y = 6 + Math.random() * 58;
      dialog.style.left = `${x}%`;
      dialog.style.top = `${y}%`;
      dialog.style.zIndex = String(10 + counter);
      dialog.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => close(dialog)));
      layer.append(dialog);
      open.push(dialog);
    },
    removeLast() {
      const dialog = open[open.length - 1];
      if (dialog) close(dialog);
    },
    get count() {
      return open.length;
    }
  };
}
