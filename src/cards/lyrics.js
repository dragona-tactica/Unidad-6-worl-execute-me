// Where the code layer gets its lines. The song's text is NOT part of this
// repository: put it in public/letra.txt (one blank line between stanzas, the
// way the song is split) and every card types the stanza it belongs to.
// Without that file the layer falls back to each card's short `verse`.
//
// REF says which stanza (0-based, counted by blank lines) a card shows;
// `from`/`to` pick lines inside a stanza that two cards share, `blocks` is an
// inclusive range of stanzas.
const REF = {
  plug: { b: 0 }, protection: { b: 1 }, sandwich: { b: 2 }, creation: { b: 3 },
  parameters: { b: 4, from: 0, to: 1 }, initialization: { b: 4, from: 1, to: 2 },
  world: { b: 5 }, simulation: { b: 6 }, point: { b: 7 }, circle: { b: 8 }, sine: { b: 9 },
  rocket: { b: 10 }, current: { b: 11 }, blur: { b: 12 }, travel: { b: 13 }, deep: { b: 14 },
  simulations: { b: 15 }, vr: { b: 16 }, fox: { blocks: [17, 18] }, trap: { b: 19 },
  eggplant: { b: 20 }, tomato: { b: 21 }, cat: { b: 22 }, lamb: { b: 23 }, gender: { b: 24 },
  radio: { b: 25 }, amtopm: { b: 25 }, mouse: { b: 26 }, hole: { b: 27 }, vibrations: { b: 28 },
  puzzle: { b: 29 }, leave: { b: 30 }, isolation: { b: 31 }, fragments: { b: 32 },
  heart: { b: 33, from: 0, to: 2 }, warden: { b: 33, from: 2, to: 3 },
  gavel: { b: 34, from: 0, to: 2 }, guillotine: { b: 34, from: 2 },
  count: { b: 35 }, finale_a: { b: 36 }, finale_b: { b: 37 }
};

export async function loadLyrics() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}letra.txt`);
    if (!response.ok) return null;
    const text = await response.text();
    if (/^\s*</.test(text)) return null; // the dev server answers unknown files with the page itself
    const blocks = [[]];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line.startsWith('#')) continue;
      if (!line) {
        if (blocks[blocks.length - 1].length) blocks.push([]);
      } else blocks[blocks.length - 1].push(line);
    }
    if (!blocks[blocks.length - 1].length) blocks.pop();
    return blocks.length ? blocks : null;
  } catch {
    return null;
  }
}

// Lines to type for a card; '' marks the gap between two stanzas.
export function lyricLines(blocks, card) {
  const ref = REF[card.id];
  if (!blocks || !ref) return card.verse ? [card.verse] : [];
  const [first, last] = ref.blocks ?? [ref.b, ref.b];
  const out = [];
  for (let b = first; b <= last; b++) {
    const lines = blocks[b];
    if (!lines) continue;
    if (out.length) out.push('');
    out.push(...lines.slice(ref.from ?? 0, ref.to ?? lines.length));
  }
  return out.length ? out : card.verse ? [card.verse] : [];
}
