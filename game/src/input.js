// Input: mouse clicks land on cards through render.js; this file owns the
// keyboard. 1–5 play a hand card, Space/Enter ends the turn or starts the
// game, R restarts, M mutes.

import { setMuted, isMuted } from './sound.js';

export function bindKeyboard(actions) {
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key;
    if (key >= '1' && key <= '5') {
      actions.playCard(Number(key) - 1);
    } else if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      actions.confirm();
    } else if (key === 'r' || key === 'R') {
      actions.restart();
    } else if (key === 'm' || key === 'M') {
      setMuted(!isMuted());
      actions.noteMute(isMuted());
    } else if (key === 'Escape') {
      actions.toTitle();
    }
  });
}
