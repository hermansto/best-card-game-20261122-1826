// Render: the whole table as DOM, so every card stays sharp and legible.
// Cards slide, flip and snap with CSS transitions; damage floats up, the
// table shakes on a big hit, and the win screen lands with confetti.

import { ELEMENTS, PALETTE, counters } from './config.js';

let els = {};
let onCardClick = null;
let onEndTurn = null;
let onStart = null;
let onRestart = null;

/** Build the table DOM once inside #stage. Callbacks come from main.js. */
export function buildTable(callbacks) {
  onCardClick = callbacks.onCardClick;
  onEndTurn = callbacks.onEndTurn;
  onStart = callbacks.onStart;
  onRestart = callbacks.onRestart;
  const stage = document.getElementById('stage');
  stage.innerHTML = `
    <div id="table">
      <header id="topbar">
        <div class="brand">EMBER <span>&amp;</span> TIDE</div>
        <div id="turnLabel">Turn 1 — your move</div>
        <div id="deckInfo"></div>
      </header>
      <section id="enemyRow" class="side-row">
        <div class="portrait enemy-portrait" title="Marrow, the Ember Warden">M</div>
        <div class="side-info">
          <div class="side-name">MARROW <span class="side-tag">the Ember Warden</span></div>
          <div class="lifebar"><div id="enemyLifeFill" class="lifefill enemy"></div><span id="enemyLifeText" class="lifetext"></span></div>
          <div id="enemyEnergy" class="energy"></div>
        </div>
        <div id="telegraph" class="telegraph"></div>
        <div id="enemyHand" class="hand enemy-hand"></div>
      </section>
      <section id="middle">
        <div id="chainBox">
          <div id="chainLabel">CHAIN</div>
          <div id="chainValue">—</div>
          <div id="chainHint">Match the last element: +3 &amp; draw 1</div>
        </div>
        <div id="versus"><div id="lastPlay">Play a card</div><div id="floatLayer"></div></div>
        <div id="middleRight">
          <button id="endTurnBtn" class="big-btn">END TURN ⏎</button>
          <div id="counterHint"></div>
        </div>
      </section>
      <section id="playerRow" class="side-row">
        <div class="portrait player-portrait" title="You, the Tidecaller">Y</div>
        <div class="side-info">
          <div class="side-name">YOU <span class="side-tag">the Tidecaller</span></div>
          <div class="lifebar"><div id="playerLifeFill" class="lifefill player"></div><span id="playerLifeText" class="lifetext"></span></div>
          <div id="playerEnergy" class="energy"></div>
        </div>
        <div id="playerHand" class="hand player-hand"></div>
      </section>
      <div id="log"></div>
    </div>
    <div id="overlay" class="overlay hidden"></div>`;
  els = {
    table: document.getElementById('table'),
    turnLabel: document.getElementById('turnLabel'),
    deckInfo: document.getElementById('deckInfo'),
    enemyLifeFill: document.getElementById('enemyLifeFill'),
    enemyLifeText: document.getElementById('enemyLifeText'),
    enemyEnergy: document.getElementById('enemyEnergy'),
    playerLifeFill: document.getElementById('playerLifeFill'),
    playerLifeText: document.getElementById('playerLifeText'),
    playerEnergy: document.getElementById('playerEnergy'),
    telegraph: document.getElementById('telegraph'),
    enemyHand: document.getElementById('enemyHand'),
    playerHand: document.getElementById('playerHand'),
    chainValue: document.getElementById('chainValue'),
    lastPlay: document.getElementById('lastPlay'),
    floatLayer: document.getElementById('floatLayer'),
    counterHint: document.getElementById('counterHint'),
    endTurnBtn: document.getElementById('endTurnBtn'),
    log: document.getElementById('log'),
    overlay: document.getElementById('overlay'),
  };
  els.endTurnBtn.addEventListener('click', () => onEndTurn && onEndTurn());
}

/** One card face. `playable` dims cards the player cannot afford. */
export function cardElement(card, opts = {}) {
  const el = ELEMENTS[card.element];
  const div = document.createElement('div');
  div.className = `card el-${card.element}${opts.playable === false ? ' unaffordable' : ''}${opts.selected ? ' selected' : ''}`;
  div.dataset.cardId = card.id;
  const kindLabel = card.kind === 'strike' ? 'STRIKE' : card.kind === 'mend' ? 'MEND ♥' : 'SURGE ↻';
  div.innerHTML = `
    <div class="cost">${card.cost}</div>
    <div class="shape" style="color:${el.colour}">${el.shape}</div>
    <div class="elname" style="color:${el.colour}">${el.name.toUpperCase()}</div>
    <div class="power">${card.kind === 'strike' ? '⚔' : card.kind === 'mend' ? '♥' : '↻'} ${card.power}</div>
    <div class="cardname">${card.name}</div>
    <div class="cardtext">${card.text}</div>
    <div class="kind">${kindLabel}</div>`;
  if (opts.onClick) div.addEventListener('click', () => opts.onClick(card));
  return div;
}

function cardBack() {
  const div = document.createElement('div');
  div.className = 'card back';
  div.innerHTML = '<div class="back-shape">▲●◆■</div><div class="back-word">EMBER &amp; TIDE</div>';
  return div;
}

function energyPips(el, energy, max) {
  el.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const pip = document.createElement('span');
    pip.className = 'pip' + (i < energy ? ' on' : '');
    pip.textContent = '⬢';
    el.appendChild(pip);
  }
  const label = document.createElement('span');
  label.className = 'energy-label';
  label.textContent = ` ${energy} energy`;
  el.appendChild(label);
}

function lifeBar(fill, text, life, max) {
  fill.style.width = `${Math.max(0, (life / max) * 100)}%`;
  text.textContent = `♥ ${life} / ${max}`;
}

/** Repaint the whole table from the game state. */
export function render(state) {
  const { player, enemy, turn, phase, telegraph, chain, log } = state;
  els.turnLabel.textContent = phase === 'win' ? 'Victory!' : phase === 'loss' ? 'Defeat' :
    phase === 'ai' ? `Turn ${turn} — Marrow plays…` : `Turn ${turn} — your move`;
  els.deckInfo.textContent = `Deck ${player.deck.length} · Discard ${player.discard.length}`;
  lifeBar(els.enemyLifeFill, els.enemyLifeText, enemy.life, enemy.maxLife);
  lifeBar(els.playerLifeFill, els.playerLifeText, player.life, player.maxLife);
  energyPips(els.enemyEnergy, enemy.energy, 3);
  energyPips(els.playerEnergy, player.energy, 3);

  const tel = ELEMENTS[telegraph];
  const counterEl = telegraph ? ELEMENTS[counters(telegraph)] : null;
  els.telegraph.innerHTML = telegraph ? `
    <div class="tel-label">MARROW'S NEXT MOVE</div>
    <div class="tel-el" style="color:${tel.colour}">${tel.shape} ${tel.name.toUpperCase()}</div>
    <div class="tel-hint">Beat it with ${counterEl.shape} ${counterEl.name} (+2)</div>` : '';

  els.enemyHand.innerHTML = '';
  enemy.hand.forEach(() => els.enemyHand.appendChild(cardBack()));
  els.playerHand.innerHTML = '';
  player.hand.forEach((c, i) => {
    const node = cardElement(c, {
      playable: phase === 'play' && c.cost <= player.energy,
      onClick: (card) => onCardClick && onCardClick(i, card),
    });
    node.style.setProperty('--i', i);
    els.playerHand.appendChild(node);
  });

  if (chain && chain.element) {
    const cel = ELEMENTS[chain.element];
    els.chainValue.innerHTML = `<span style="color:${cel.colour}">${cel.shape} ${cel.name} ×${chain.count}</span>`;
  } else {
    els.chainValue.textContent = '—';
  }
  const beatEl = telegraph ? ELEMENTS[counters(telegraph)] : null;
  els.counterHint.textContent = beatEl ? `Counter: ${beatEl.shape} ${beatEl.name} beats ${ELEMENTS[telegraph].name}` : '';
  els.endTurnBtn.disabled = phase !== 'play';
  els.log.innerHTML = log.slice(-4).map((l) => `<div>${l}</div>`).join('');
}

/** A floating damage / heal number over the middle of the table. */
export function floatText(text, kind) {
  const div = document.createElement('div');
  div.className = `floater ${kind}`;
  div.textContent = text;
  els.floatLayer.appendChild(div);
  setTimeout(() => div.remove(), 1400);
}

/** Shake the table on a heavy hit. */
export function shake() {
  els.table.classList.remove('shake');
  void els.table.offsetWidth;
  els.table.classList.add('shake');
}

export function setLastPlay(text) { els.lastPlay.textContent = text; }

/** Title / win / loss overlays. `kind` is 'title' | 'win' | 'loss'. */
export function showOverlay(kind, data = {}) {
  const o = els.overlay;
  o.classList.remove('hidden');
  if (kind === 'title') {
    o.innerHTML = `
      <div class="panel title-panel">
        <div class="title-shapes"><span style="color:#ff5a3c">▲</span><span style="color:#38a1ff">●</span><span style="color:#3ecf6a">◆</span><span style="color:#ffb02e">■</span></div>
        <h1>EMBER <span class="amp">&amp;</span> TIDE</h1>
        <p class="tagline">A duel of four elements. Outplay Marrow, the Ember Warden.</p>
        <div class="rules">
          <div><b>▲ Ember</b> beats <b>◆ Thorn</b> · <b>◆ Thorn</b> beats <b>■ Stone</b> · <b>■ Stone</b> beats <b>● Tide</b> · <b>● Tide</b> beats <b>▲ Ember</b></div>
          <div>Play cards with <b>energy</b> (3 a turn). Match the last element for a <b>combo +3</b> and a free draw.</div>
          <div>Beat Marrow's telegraphed element for <b>+2</b>. Marrow's telegraphed element hits <b>+2</b> too, and its combos chain like yours. First to 0 life loses.</div>
          <div class="keys">Click a card or press <b>1–5</b> · <b>Space</b> ends your turn · <b>R</b> restarts</div>
        </div>
        <button id="startBtn" class="big-btn start">▶ &nbsp;START DUEL</button>
        <p class="best">Best: ${data.best || 0} turns to win · 30 life each · 30-card deck</p>
      </div>`;
    document.getElementById('startBtn').addEventListener('click', () => onStart && onStart());
  } else if (kind === 'win') {
    o.innerHTML = `
      <div class="panel win-panel">
        <div class="win-stars">★ ★ ★</div>
        <h1 class="win-title">VICTORY!</h1>
        <p class="tagline">Marrow's flame is out. The Tidecaller takes the table in ${data.turns} turns.</p>
        <p class="win-line">Final life — You ${data.playerLife} · Marrow 0</p>
        <button id="againBtn" class="big-btn start">↻ &nbsp;PLAY AGAIN</button>
      </div>`;
    confetti(o);
    document.getElementById('againBtn').addEventListener('click', () => onRestart && onRestart());
  } else {
    o.innerHTML = `
      <div class="panel loss-panel">
        <div class="loss-mark">✖</div>
        <h1 class="loss-title">DEFEAT</h1>
        <p class="tagline">Marrow's embers win this one. Your life hit 0 on turn ${data.turns}.</p>
        <p class="win-line">Final life — You 0 · Marrow ${data.enemyLife}</p>
        <button id="againBtn" class="big-btn start">↻ &nbsp;TRY AGAIN</button>
      </div>`;
    document.getElementById('againBtn').addEventListener('click', () => onRestart && onRestart());
  }
}

export function hideOverlay() { els.overlay.classList.add('hidden'); els.overlay.innerHTML = ''; }

function confetti(container) {
  const colours = ['#ff5a3c', '#38a1ff', '#3ecf6a', '#ffb02e', '#f2c94c'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colours[i % colours.length];
    piece.style.animationDelay = `${Math.random() * 0.9}s`;
    piece.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
    container.appendChild(piece);
  }
}

export { PALETTE };
