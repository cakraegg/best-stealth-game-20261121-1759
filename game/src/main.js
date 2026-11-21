// EMBERWICK main loop: input, state machine, win/caught flow, and the
// deterministic screenshot mode (?shot=<name>&seed=1 renders one frame).

import { CANVAS_W, CANVAS_H, MAP_X, TILE, PLAYER_RADIUS, GUARD_RADIUS } from './config.js';
import { LEVELS, parseLevel, tileAt, isBushTile } from './levels.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { SoundFX } from './audio.js';
import {
  drawWorld,
  drawHud,
  drawTitle,
  drawCaught,
  drawLevelClear,
  drawGameClear,
  drawPaused,
} from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const sound = new SoundFX();

const input = { up: false, down: false, left: false, right: false, sneak: false };

class Game {
  constructor() {
    this.screen = 'title'; // title | play | caught | levelclear | gameclear | paused
    this.levelIndex = 0;
    this.level = null;
    this.guards = [];
    this.player = null;
    this.pebbles = [];
    this.elapsed = 0;
    this.totalTime = 0;
    this.totalFlies = 0;
    this.maxFlies = 0;
    this.timeText = '00:00';
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = parseLevel(LEVELS[index]);
    this.player = new Player(this.level.player);
    this.guards = this.level.def.guards.map((g) => new Guard(g, this.level));
    this.pebbles = [];
    this.elapsed = 0;
    this.maxFlies += this.level.fireflies.length;
  }

  start() {
    this.totalTime = 0;
    this.totalFlies = 0;
    this.maxFlies = 0;
    this.loadLevel(0);
    this.screen = 'play';
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.screen = 'gameclear';
      sound.win();
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.screen = 'play';
  }

  restartLevel() {
    this.loadLevel(this.levelIndex);
    this.screen = 'play';
  }

  formatTime(sec) {
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  update(dt) {
    if (this.screen !== 'play') return;
    this.elapsed += dt;
    this.totalTime += dt;
    const events = [];
    this.player.update(dt, input, this.level);
    this.guards.forEach((g) => g.update(dt, this.player, events));
    events.forEach((e) => {
      if (e.type === 'alarm') sound.alarm();
    });
    // Footsteps: the nearest moving guard's steps, louder up close.
    let nearest = Infinity;
    let stepping = false;
    this.guards.forEach((g) => {
      const d = Math.hypot(g.x - this.player.x, g.y - this.player.y);
      if (d < nearest) nearest = d;
      if (g.stepPhase > 34) {
        g.stepPhase = 0;
        stepping = true;
      }
    });
    if (stepping) sound.footstep(nearest);
    sound.ambient(dt);
    // Firefly pickup.
    this.level.fireflies.forEach((f) => {
      if (f.taken) return;
      const fx = (f.x + 0.5) * TILE;
      const fy = (f.y + 0.5) * TILE;
      if (Math.hypot(fx - this.player.x, fy - this.player.y) < 26) {
        f.taken = true;
        this.player.fireflies += 1;
        this.totalFlies += 1;
        sound.pickup();
      }
    });
    // Caught: an alert guard touches the player.
    const caught = this.guards.some(
      (g) => g.state === 'alert'
        && Math.hypot(g.x - this.player.x, g.y - this.player.y) < GUARD_RADIUS + PLAYER_RADIUS - 2,
    );
    if (caught) {
      this.screen = 'caught';
      sound.caught();
      this.announce('Caught! Press R to try the level again.');
      return;
    }
    this.timeText = this.formatTime(this.elapsed);
  }

  interact() {
    if (this.screen !== 'play') return;
    const tile = this.player.tile();
    const { pearl, exit } = this.level;
    if (pearl && tile.x === pearl.x && tile.y === pearl.y && !this.player.hasPearl) {
      this.player.hasPearl = true;
      sound.pearl();
      this.announce('Moonpearl taken. Reach the gate unseen.');
      return;
    }
    if (exit && tile.x === exit.x && tile.y === exit.y && this.player.hasPearl) {
      this.screen = 'levelclear';
      sound.win();
      this.announce(`${this.level.def.name} cleared.`);
    }
  }

  throwPebbleAt(clientX, clientY) {
    if (this.screen !== 'play') return;
    const rect = canvas.getBoundingClientRect();
    const wx = ((clientX - rect.left) / rect.width) * CANVAS_W - MAP_X;
    const wy = ((clientY - rect.top) / rect.height) * CANVAS_H;
    const land = this.player.throwPebble(wx, wy);
    if (!land) return;
    this.pebbles.push(land);
    sound.pebble();
    this.guards.forEach((g) => g.hearNoise(land.x, land.y));
  }

  announce(text) {
    if (statusEl) statusEl.textContent = text;
  }

  render(t) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (this.screen === 'title') {
      drawTitle(ctx);
      return;
    }
    drawWorld(ctx, this, t);
    drawHud(ctx, this);
    if (this.screen === 'caught') drawCaught(ctx);
    else if (this.screen === 'levelclear') drawLevelClear(ctx, this.level.def.name, this.timeText);
    else if (this.screen === 'gameclear') {
      drawGameClear(ctx, this.formatTime(this.totalTime), this.totalFlies, this.maxFlies);
    } else if (this.screen === 'paused') drawPaused(ctx);
  }
}

const game = new Game();
window.__emberwick = game; // play-test hook: inspect state from the console

// Screenshot mode: stage the frame, draw it once, and stop. The frame is
// identical on every run for the same query.
if (shotName) {
  game.screen = 'play';
  if (applyShot(game, shotName)) {
    game.render(1.7);
    document.title = `EMBERWICK shot ${shotName}`;
  }
} else {
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render(now / 1000);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function keyName(e) {
  return e.key.toLowerCase();
}

window.addEventListener('keydown', (e) => {
  sound.ensure();
  const k = keyName(e);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'arrowup' || k === 'w') input.up = true;
  if (k === 'arrowdown' || k === 's') input.down = true;
  if (k === 'arrowleft' || k === 'a') input.left = true;
  if (k === 'arrowright' || k === 'd') input.right = true;
  if (k === 'shift') input.sneak = true;
  if (k === 'e') game.interact();
  if (k === 'r' && (game.screen === 'caught' || game.screen === 'play')) game.restartLevel();
  if (k === 'p') {
    if (game.screen === 'play') game.screen = 'paused';
    else if (game.screen === 'paused') game.screen = 'play';
  }
  if (k === 'm') sound.muted = !sound.muted;
  if (k === 'escape' && game.screen !== 'title') game.screen = 'title';
  if (k === 'enter') {
    if (game.screen === 'title') game.start();
    else if (game.screen === 'levelclear') game.nextLevel();
    else if (game.screen === 'gameclear') game.start();
  }
});

window.addEventListener('keyup', (e) => {
  const k = keyName(e);
  if (k === 'arrowup' || k === 'w') input.up = false;
  if (k === 'arrowdown' || k === 's') input.down = false;
  if (k === 'arrowleft' || k === 'a') input.left = false;
  if (k === 'arrowright' || k === 'd') input.right = false;
  if (k === 'shift') input.sneak = false;
});

canvas.addEventListener('mousedown', (e) => {
  sound.ensure();
  if (game.screen === 'title') {
    game.start();
    return;
  }
  if (game.screen === 'levelclear') {
    game.nextLevel();
    return;
  }
  if (game.screen === 'gameclear') {
    game.start();
    return;
  }
  game.throwPebbleAt(e.clientX, e.clientY);
});

// Hide the mouse cursor's trail of pebble throws on touch devices: a tap is a throw.
canvas.addEventListener('touchstart', (e) => {
  sound.ensure();
  if (game.screen === 'title') {
    game.start();
    return;
  }
  const touch = e.touches[0];
  if (touch) game.throwPebbleAt(touch.clientX, touch.clientY);
  e.preventDefault();
}, { passive: false });
