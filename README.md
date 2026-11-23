# Ember & Tide — an original card duel

[![bounty](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/hermansto/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/hermansto/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

You are the Tidecaller. Marrow, the Ember Warden, sits across a green felt
table with 30 life, a 30-card deck, and a tell you can read. First to 0 loses.

## How to play

- **Each turn** you get 3 energy and draw 2 cards. Play cards by clicking
  them (or pressing **1–5**); **Space** ends your turn.
- **Four elements**, each told apart by colour *and* shape: ▲ Ember (red)
  beats ◆ Thorn (green), ◆ Thorn beats ■ Stone (amber), ■ Stone beats
  ● Tide (blue), ● Tide beats ▲ Ember.
- **Combo:** play the same element as the last card you played this turn
  for **+3 damage** and a free draw.
- **Counter:** Marrow telegraphs the element it will favour next turn.
  Hit it with the element that beats it for **+2**; the wrong element is
  resisted (−1). Marrow's telegraphed element also hits **+2** for it, and
  its combos chain like yours — the telegraph is a warning, not just a hint.
- **Strikes** deal damage, **Mends** heal 5, **Surges** draw 2. Marrow
  heals when hurt and keeps a cheap card back sometimes — watch its hand
  shrink and its telegraph change, then answer it.

## Run it

Open `game/index.html` in desktop Chrome, or serve the folder:

```
node serve.ts   # then open http://localhost:8080
```

No network, no build step, no audio files — every sound is a WebAudio
oscillator, every picture is CSS. Keyboard + mouse only.

Bounty: https://make.fun/bounty/best-card-game-20261122-1826
