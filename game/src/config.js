// Every tuning number, colour and element in one place. The table is a fixed
// 1280x720 logical stage; the renderer scales it to the window, so no rule
// below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

export const START_LIFE = 30;
export const START_ENERGY = 3;
export const HAND_SIZE = 5;
export const DRAW_PER_TURN = 2;
export const COMBO_BONUS = 3;
export const COUNTER_BONUS = 2;
export const COUNTER_PENALTY = 1;

// The four elements. Each is told apart by colour AND shape AND name, never
// by text alone: Ember is a red triangle, Tide a blue circle, Thorn a green
// diamond, Stone an amber square.
export const ELEMENTS = {
  ember: { key: 'ember', name: 'Ember', shape: '▲', colour: '#ff5a3c', dark: '#a32e16', beats: 'thorn' },
  tide: { key: 'tide', name: 'Tide', shape: '●', colour: '#38a1ff', dark: '#155a9e', beats: 'ember' },
  thorn: { key: 'thorn', name: 'Thorn', shape: '◆', colour: '#3ecf6a', dark: '#177a38', beats: 'stone' },
  stone: { key: 'stone', name: 'Stone', shape: '■', colour: '#ffb02e', dark: '#9a6206', beats: 'tide' },
};
export const ELEMENT_KEYS = ['ember', 'tide', 'thorn', 'stone'];

/** The element `a` beats, or null. */
export function beats(a, b) {
  return ELEMENTS[a] && ELEMENTS[a].beats === b;
}

/** The element that beats `a` — the counter the player should play. */
export function counters(a) {
  for (const key of ELEMENT_KEYS) if (ELEMENTS[key].beats === a) return key;
  return null;
}

export const PALETTE = {
  felt: '#14532d',
  feltDark: '#0d3a1f',
  feltLight: '#1d6b3a',
  wood: '#5b3a1e',
  woodDark: '#3d2712',
  gold: '#f2c94c',
  panel: '#1c2433',
  panelLight: '#28344a',
  text: '#f4efe4',
  muted: '#b8c0cc',
  player: '#38a1ff',
  enemy: '#ff5a3c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** mulberry32: a tiny seeded RNG so screenshot scenes are reproducible. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
