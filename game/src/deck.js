// The deck: every card in Ember & Tide, and the draw / discard piles.
// A card is { id, name, element, kind, cost, power, text }.
// kind: 'strike' deals power damage, 'mend' heals power life, 'surge' draws
// power cards. Power is always the big number on the card face.

import { ELEMENT_KEYS, mulberry32 } from './config.js';

let nextId = 1;
function card(name, element, kind, cost, power, text) {
  return { id: nextId++, name, element, kind, cost, power, text };
}

/** The full 30-card deck, in a fixed order before shuffling. */
export function buildDeckList() {
  nextId = 1;
  const list = [
    // Ember strikes — fast, hot, cheap.
    card('Cinder Jab', 'ember', 'strike', 1, 3, 'Deal 3.'),
    card('Flame Lash', 'ember', 'strike', 2, 5, 'Deal 5.'),
    card('Wildfire', 'ember', 'strike', 3, 7, 'Deal 7.'),
    card('Spark', 'ember', 'strike', 0, 2, 'Deal 2. Free.'),
    card('Ember Fan', 'ember', 'strike', 2, 4, 'Deal 4.'),
    card('Kindle', 'ember', 'surge', 1, 2, 'Draw 2 cards.'),
    // Tide strikes — steady, and the healer.
    card('Wave Cut', 'tide', 'strike', 1, 3, 'Deal 3.'),
    card('Riptide', 'tide', 'strike', 2, 5, 'Deal 5.'),
    card('Tidal Surge', 'tide', 'strike', 3, 7, 'Deal 7.'),
    card('Drizzle', 'tide', 'strike', 0, 2, 'Deal 2. Free.'),
    card('Undertow', 'tide', 'strike', 2, 4, 'Deal 4.'),
    card('Springwater', 'tide', 'mend', 2, 5, 'Heal 5 life.'),
    card('Deep Current', 'tide', 'surge', 1, 2, 'Draw 2 cards.'),
    // Thorn strikes — sharp, and a second healer.
    card('Thorn Prick', 'thorn', 'strike', 1, 3, 'Deal 3.'),
    card('Briar Whip', 'thorn', 'strike', 2, 5, 'Deal 5.'),
    card('Thornstorm', 'thorn', 'strike', 3, 7, 'Deal 7.'),
    card('Seed Shot', 'thorn', 'strike', 0, 2, 'Deal 2. Free.'),
    card('Vine Snare', 'thorn', 'strike', 2, 4, 'Deal 4.'),
    card('Root Draught', 'thorn', 'mend', 2, 5, 'Heal 5 life.'),
    // Stone strikes — heavy, and a draw engine.
    card('Pebble Toss', 'stone', 'strike', 1, 3, 'Deal 3.'),
    card('Rockfall', 'stone', 'strike', 2, 5, 'Deal 5.'),
    card('Avalanche', 'stone', 'strike', 3, 7, 'Deal 7.'),
    card('Gravel', 'stone', 'strike', 0, 2, 'Deal 2. Free.'),
    card('Boulder Roll', 'stone', 'strike', 2, 4, 'Deal 4.'),
    card('Quarry Call', 'stone', 'surge', 1, 2, 'Draw 2 cards.'),
    card('Stone Soup', 'stone', 'mend', 2, 5, 'Heal 5 life.'),
    // Wildcards — the swing turns.
    card('Ember Nova', 'ember', 'strike', 3, 6, 'Deal 6.'),
    card('Monsoon', 'tide', 'strike', 3, 6, 'Deal 6.'),
    card('Bramble Maze', 'thorn', 'strike', 3, 6, 'Deal 6.'),
    card('Mountain Fall', 'stone', 'strike', 3, 6, 'Deal 6.'),
  ];
  return list;
}

/** A shuffled copy of the deck, using `rng` (seeded for screenshots). */
export function shuffledDeck(rng) {
  const deck = buildDeckList();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Draw `n` cards from `pile`, refilling it from `discard` when it runs dry. */
export function drawCards(pile, discard, n, rng) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (pile.length === 0) {
      if (discard.length === 0) break;
      pile.push(...discard.splice(0));
      for (let k = pile.length - 1; k > 0; k--) {
        const j = Math.floor(rng() * (k + 1));
        [pile[k], pile[j]] = [pile[j], pile[k]];
      }
    }
    drawn.push(pile.pop());
  }
  return drawn;
}

/** Count cards of each element in a hand — used by the AI's telegraph. */
export function elementCounts(hand) {
  const counts = { ember: 0, tide: 0, thorn: 0, stone: 0 };
  for (const c of hand) counts[c.element] = (counts[c.element] || 0) + 1;
  return counts;
}

export { ELEMENT_KEYS, mulberry32 };
