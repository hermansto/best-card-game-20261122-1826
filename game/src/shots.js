// Screenshot scenes behind ?shot=title|table|win|loss. Each one builds a real
// game state from a seeded deck — the same code path the live game uses —
// and freezes it mid-moment, so every screenshot is a render of the game's
// own code, and the same seed always gives the same frame.

import { START_LIFE, START_ENERGY, HAND_SIZE, mulberry32 } from './config.js';
import { shuffledDeck, drawCards } from './deck.js';
import { chooseTelegraph } from './ai.js';

function freshSide(rng) {
  const deck = shuffledDeck(rng);
  const hand = drawCards(deck, [], HAND_SIZE, rng);
  return { life: START_LIFE, maxLife: START_LIFE, energy: START_ENERGY, hand, deck, discard: [] };
}

function baseState(seed) {
  const rng = mulberry32(seed);
  const state = {
    seed, rng,
    player: freshSide(rng),
    enemy: freshSide(rng),
    turn: 1,
    phase: 'play',
    telegraph: 'ember',
    chain: null,
    log: [],
    bestTurns: 0,
  };
  state.telegraph = chooseTelegraph(state.enemy.hand, rng);
  return state;
}

/**
 * Build the named scene and return { state, screen, lastPlay }.
 * screen is 'title' | 'play' | 'win' | 'loss'; any other name is the title.
 */
export function stageShot(name, seed) {
  if (name === 'table') {
    const state = baseState(seed);
    state.turn = 4;
    state.phase = 'play';
    state.player.life = 22;
    state.enemy.life = 17;
    state.player.energy = 2;
    state.enemy.energy = 1;
    state.telegraph = 'tide';
    state.chain = { element: 'ember', count: 2 };
    state.log = [
      'Turn 3: You play Flame Lash: 7 damage (combo +3).',
      'Turn 3: Marrow plays Rockfall: 5 damage to you.',
      'Turn 4: You draw 2. Marrow telegraphs ● Tide.',
      'Combo live: play ▲ Ember again for +3 & draw 1.',
    ];
    return { state, screen: 'play', lastPlay: 'Flame Lash — 7 damage' };
  }
  if (name === 'win') {
    const state = baseState(seed);
    state.turn = 6;
    state.phase = 'win';
    state.player.life = 14;
    state.enemy.life = 0;
    state.player.energy = 1;
    state.telegraph = 'ember';
    state.chain = { element: 'tide', count: 2 };
    state.log = [
      'Turn 5: You play Tidal Surge: 9 damage (combo +3, counter +2).',
      'Turn 6: You play Monsoon: 6 damage. Marrow falls!',
      'Victory — the Tidecaller takes the table.',
    ];
    return { state, screen: 'win', lastPlay: 'Monsoon — 6 damage' };
  }
  if (name === 'loss') {
    const state = baseState(seed);
    state.turn = 7;
    state.phase = 'loss';
    state.player.life = 0;
    state.enemy.life = 9;
    state.player.energy = 0;
    state.telegraph = 'ember';
    state.chain = null;
    state.log = [
      'Turn 6: Marrow plays Wildfire: 7 damage to you.',
      'Turn 7: Marrow plays Flame Lash: 5 damage to you.',
      'Defeat — your life hit 0 on turn 7.',
    ];
    return { state, screen: 'loss', lastPlay: 'Marrow: Flame Lash — 5 damage' };
  }
  // Title: a fresh dealt table behind the title panel.
  const state = baseState(seed);
  state.phase = 'title';
  state.log = ['Welcome to the table. Marrow shuffles the deck…'];
  return { state, screen: 'title', lastPlay: 'Play a card' };
}
