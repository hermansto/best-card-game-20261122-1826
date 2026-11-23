// Main: the game state machine. Title → play → (AI turn) → play … → win/loss.
// Every rule lives here: energy, combos, counters, drawing, and the turn
// handoff to Marrow. The AI itself lives in ai.js, the cards in deck.js.

import { START_LIFE, START_ENERGY, HAND_SIZE, DRAW_PER_TURN, COMBO_BONUS, beats, mulberry32 } from './config.js';
import { shuffledDeck, drawCards } from './deck.js';
import { choosePlays, chooseTelegraph, counterDelta } from './ai.js';
import { buildTable, render, showOverlay, hideOverlay, floatText, shake, setLastPlay } from './render.js';
import { bindKeyboard } from './input.js';
import { sfx } from './sound.js';
import { stageShot } from './shots.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

function freshSide(rng) {
  const deck = shuffledDeck(rng);
  const hand = drawCards(deck, [], HAND_SIZE, rng);
  return { life: START_LIFE, maxLife: START_LIFE, energy: START_ENERGY, hand, deck, discard: [] };
}

function newState(seed) {
  const rng = mulberry32(seed);
  const state = {
    seed,
    rng,
    player: freshSide(rng),
    enemy: freshSide(rng),
    turn: 1,
    phase: 'title',
    telegraph: 'ember',
    chain: null,
    log: ['Welcome to the table. Marrow shuffles the deck…'],
    bestTurns: 0,
  };
  state.telegraph = chooseTelegraph(state.enemy.hand, rng);
  return state;
}

let state = newState((Date.now() % 100000) + 7);
let shotMode = null;

function log(line) {
  state.log.push(line);
  if (state.log.length > 30) state.log.shift();
}

function checkEnd() {
  if (state.enemy.life <= 0) {
    state.enemy.life = 0;
    state.phase = 'win';
    render(state);
    sfx.win();
    showOverlay('win', { turns: state.turn, playerLife: state.player.life });
    return true;
  }
  if (state.player.life <= 0) {
    state.player.life = 0;
    state.phase = 'loss';
    render(state);
    sfx.lose();
    showOverlay('loss', { turns: state.turn, enemyLife: state.enemy.life });
    return true;
  }
  return false;
}

/** Damage one side, with a floater and a shake on big hits. */
function dealDamage(target, amount, label) {
  target.life = Math.max(0, target.life - amount);
  floatText(`${label} −${amount}`, amount >= 6 ? 'big-hit' : 'hit');
  if (amount >= 6) shake();
  sfx.hit();
}

function startPlayerTurn() {
  state.phase = 'play';
  state.player.energy = START_ENERGY;
  state.chain = null;
  const drawn = drawCards(state.player.deck, state.player.discard, DRAW_PER_TURN, state.rng);
  state.player.hand.push(...drawn);
  if (drawn.length) log(`You draw ${drawn.length}.`);
  render(state);
  sfx.turn();
}

function playCard(index) {
  if (state.phase !== 'play') return;
  const card = state.player.hand[index];
  if (!card) return;
  if (card.cost > state.player.energy) {
    log(`Not enough energy for ${card.name} (${card.cost}).`);
    render(state);
    return;
  }
  state.player.energy -= card.cost;
  state.player.hand.splice(index, 1);
  state.player.discard.push(card);
  const combo = state.chain && state.chain.element === card.element;
  const counter = counterDelta(card.element, state.telegraph);
  if (card.kind === 'strike') {
    let dmg = card.power + (combo ? COMBO_BONUS : 0) + counter;
    if (dmg < 1) dmg = 1;
    const bits = [];
    if (combo) bits.push(`combo +${COMBO_BONUS}`);
    if (counter > 0) bits.push(`counter +${counter}`);
    if (counter < 0) bits.push('resisted −1');
    dealDamage(state.enemy, dmg, `${card.name}`);
    log(`You play ${card.name}: ${dmg} damage${bits.length ? ` (${bits.join(', ')})` : ''}.`);
    setLastPlay(`${card.name} — ${dmg} damage`);
    if (combo) { sfx.combo(); } else if (counter > 0) { sfx.counter(); } else { sfx.play(); }
  } else if (card.kind === 'mend') {
    const healed = Math.min(card.power, state.player.maxLife - state.player.life);
    state.player.life += healed;
    floatText(`♥ +${healed}`, 'heal');
    log(`You play ${card.name}: heal ${healed}.`);
    setLastPlay(`${card.name} — heal ${healed}`);
    sfx.heal();
  } else {
    const drawn = drawCards(state.player.deck, state.player.discard, card.power, state.rng);
    state.player.hand.push(...drawn);
    log(`You play ${card.name}: draw ${drawn.length}.`);
    setLastPlay(`${card.name} — draw ${drawn.length}`);
    sfx.draw();
  }
  if (combo) {
    const drawn = drawCards(state.player.deck, state.player.discard, 1, state.rng);
    state.player.hand.push(...drawn);
    if (drawn.length) log('Combo! You draw 1.');
  }
  state.chain = { element: card.element, count: (state.chain && state.chain.element === card.element ? state.chain.count : 0) + 1 };
  render(state);
  checkEnd();
}

function endTurn() {
  if (state.phase !== 'play') return;
  state.phase = 'ai';
  log('Marrow takes the table…');
  render(state);
  // Marrow plays one card at a time so the player can watch the damage land.
  const plays = choosePlays(state.enemy.hand, state.enemy.energy, state.enemy.life, state.enemy.maxLife, state.telegraph, state.rng);
  let step = 0;
  let aiChain = null; // Marrow chains combos like the player: same element twice, +3.
  const aiStep = () => {
    if (state.phase !== 'ai') return;
    if (step >= plays.length) {
      finishAiTurn();
      return;
    }
    const idx = plays[step++];
    const card = state.enemy.hand[idx];
    if (!card || card.cost > state.enemy.energy) { aiStep(); return; }
    state.enemy.energy -= card.cost;
    state.enemy.hand.splice(state.enemy.hand.indexOf(card), 1);
    state.enemy.discard.push(card);
    if (card.kind === 'strike') {
      // Marrow's strikes chain like the player's (+3 same element twice) and
      // its telegraphed element hits +2 (focus) — the telegraph warns you.
      const combo = aiChain === card.element;
      const focus = card.element === state.telegraph;
      const dmg = card.power + (combo ? COMBO_BONUS : 0) + (focus ? 2 : 0);
      const bits = [];
      if (combo) bits.push('combo +3');
      if (focus) bits.push('focus +2');
      dealDamage(state.player, dmg, `${card.name}`);
      log(`Marrow plays ${card.name}: ${dmg} damage to you${bits.length ? ` (${bits.join(', ')})` : ''}.`);
      setLastPlay(`Marrow: ${card.name} — ${dmg} damage`);
    } else if (card.kind === 'mend') {
      const healed = Math.min(card.power, state.enemy.maxLife - state.enemy.life);
      state.enemy.life += healed;
      floatText(`♥ +${healed}`, 'heal');
      log(`Marrow plays ${card.name}: heals ${healed}.`);
      sfx.heal();
    } else {
      const drawn = drawCards(state.enemy.deck, state.enemy.discard, card.power, state.rng);
      state.enemy.hand.push(...drawn);
      log(`Marrow plays ${card.name}: draws ${drawn.length}.`);
      sfx.draw();
    }
    aiChain = card.element;
    render(state);
    if (checkEnd()) return;
    setTimeout(aiStep, 650);
  };
  setTimeout(aiStep, 500);
}

function finishAiTurn() {
  state.enemy.energy = START_ENERGY;
  const drawn = drawCards(state.enemy.deck, state.enemy.discard, DRAW_PER_TURN, state.rng);
  state.enemy.hand.push(...drawn);
  if (drawn.length) log(`Marrow draws ${drawn.length}.`);
  state.telegraph = chooseTelegraph(state.enemy.hand, state.rng);
  state.turn += 1;
  startPlayerTurn();
}

function startGame() {
  state = newState((Date.now() % 100000) + 7);
  state.phase = 'play';
  hideOverlay();
  log('The duel begins. Your move — play a card.');
  setLastPlay('Play a card');
  render(state);
  sfx.deal();
}

function toTitle() {
  state = newState((Date.now() % 100000) + 7);
  render(state);
  showOverlay('title', { best: state.bestTurns });
}

function boot() {
  buildTable({
    onCardClick: (i) => playCard(i),
    onEndTurn: () => endTurn(),
    onStart: () => startGame(),
    onRestart: () => startGame(),
  });
  bindKeyboard({
    playCard: (i) => playCard(i),
    confirm: () => {
      if (state.phase === 'title' || state.phase === 'win' || state.phase === 'loss') startGame();
      else endTurn();
    },
    restart: () => startGame(),
    toTitle: () => { if (state.phase === 'play' || state.phase === 'ai') toTitle(); },
    noteMute: (m) => log(m ? 'Sound muted (M).' : 'Sound on (M).'),
  });
  const params = new URLSearchParams(window.location.search);
  shotMode = params.get('shot');
  // Fit the 1280x720 stage into the window (scale 1 at 1280x720).
  const fit = () => {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    document.getElementById('stage').style.transform = `translate(-50%, -50%) scale(${s})`;
  };
  window.addEventListener('resize', fit);
  fit();
  if (shotMode) {
    const seed = Number(params.get('seed') || '1');
    const staged = stageShot(shotMode, seed);
    state = staged.state;
    render(state);
    if (staged.lastPlay) setLastPlay(staged.lastPlay);
    if (staged.screen === 'title') showOverlay('title', { best: 4 });
    if (staged.screen === 'win') showOverlay('win', { turns: state.turn, playerLife: state.player.life });
    if (staged.screen === 'loss') showOverlay('loss', { turns: state.turn, enemyLife: state.enemy.life });
    document.getElementById('stage').classList.add('shot');
    return;
  }
  render(state);
  showOverlay('title', { best: 0 });
}

document.addEventListener('DOMContentLoaded', boot);
