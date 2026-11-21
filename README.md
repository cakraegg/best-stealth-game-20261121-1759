# EMBERWICK — The Lantern Thief

[![best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/cakraegg/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/cakraegg/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

A top-down stealth game for the [make.fun best stealth game bounty](https://make.fun/c/best-stealth-game-20261121-1759).
Pip, a young lantern thief, slips through Emberwick Manor on a full-moon night to steal the
Moonpearl and escape through the garden gate — unseen.

## How to play

- **WASD / Arrow keys** — move
- **Shift** — sneak (slower, quieter, harder to spot)
- **Click** — throw a pebble to distract a guard (3 per level)
- **E** — take the Moonpearl / slip through the gate
- **R** — restart level · **P** — pause · **M** — mute · **Esc** — title

Guards patrol fixed routes with vision cones. Bushes hide you, lantern light exposes you,
and a detection meter gives you a chance to recover before the alarm. Get caught and the
level restarts — the manor does not forgive twice.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

No build step, no network requests, no libraries — plain static files and vanilla canvas.
All sound is synthesised in code with WebAudio.

## Structure

- `game/index.html` — page and canvas
- `game/src/config.js` — tuning, palette, text
- `game/src/levels.js` — the three hand-drawn maps and patrol routes
- `game/src/guards.js` — guard AI: patrol, suspicion, alert chase, search
- `game/src/player.js` — movement, sneaking, pebbles, pickups
- `game/src/audio.js` — synthesised footsteps, alarm, chimes, crickets
- `game/src/render.js` — level, cones, light and shadow, HUD, screens
- `game/src/shots.js` — deterministic screenshot staging
- `game/src/main.js` — game loop, input, state machine
- `main.ts` — the hand-in program that writes `dossier.json`
