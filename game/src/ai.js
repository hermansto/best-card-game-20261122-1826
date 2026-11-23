// Marrow, the AI opponent: readable, counterable, and a little greedy.
// Every turn Marrow telegraphs the element it will favour NEXT turn, so the
// player can answer it with the element that beats it. Marrow plays the
// biggest damage it can afford, heals when it is hurting, and draws when it
// has nothing good to play.

import { ELEMENT_KEYS, beats } from './config.js';
import { elementCounts } from './deck.js';

/** Pick the element Marrow will favour next turn: its most common hand element. */
export function chooseTelegraph(hand, rng) {
  const counts = elementCounts(hand);
  let best = ELEMENT_KEYS[0];
  let bestCount = -1;
  for (const key of ELEMENT_KEYS) {
    const n = counts[key] + rng() * 0.4; // a little jitter, never a secret
    if (n > bestCount) { bestCount = n; best = key; }
  }
  return best;
}

/**
 * Choose Marrow's plays for this turn: a list of card indexes into its hand,
 * in play order, spending at most `energy`. Heals first when badly hurt,
 * otherwise the biggest affordable strikes, preferring the telegraphed
 * element so its own combos land.
 */
export function choosePlays(hand, energy, life, maxLife, telegraph, rng) {
  const plays = [];
  let left = energy;
  const used = new Set();
  const affordable = () => hand.map((c, i) => ({ c, i }))
    .filter(({ c, i }) => !used.has(i) && c.cost <= left);

  // Hurt? Mend first if it can.
  if (life <= 12) {
    const mend = affordable().filter(({ c }) => c.kind === 'mend')
      .sort((a, b) => b.c.power - a.c.power)[0];
    if (mend) { plays.push(mend.i); used.add(mend.i); left -= mend.c.cost; }
  }
  // Then strikes, biggest first, telegraphed element first.
  const strikes = affordable().filter(({ c }) => c.kind === 'strike')
    .sort((a, b) => {
      const ta = a.c.element === telegraph ? 1 : 0;
      const tb = b.c.element === telegraph ? 1 : 0;
      return (tb - ta) || (b.c.power - a.c.power);
    });
  for (const { c, i } of strikes) {
    if (c.cost > left) continue;
    // Marrow keeps one cheap card back sometimes, so it is not all-in.
    if (left - c.cost === 0 && rng() < 0.25 && plays.length > 0) continue;
    plays.push(i); used.add(i); left -= c.cost;
    if (left <= 0) break;
  }
  // Nothing worth playing? Draw instead.
  if (plays.length === 0) {
    const surge = affordable().filter(({ c }) => c.kind === 'surge')[0];
    if (surge) plays.push(surge.i);
  }
  return plays;
}

/** Score a strike against a telegraphed element, the same rule the player uses. */
export function counterDelta(cardElement, telegraphElement) {
  if (beats(cardElement, telegraphElement)) return 2;
  if (beats(telegraphElement, cardElement)) return -1;
  return 0;
}
