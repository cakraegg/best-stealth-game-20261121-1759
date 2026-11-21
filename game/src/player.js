// EMBERWICK player: Pip, the lantern thief. Walk, sneak, throw pebbles,
// pick up fireflies and the Moonpearl, slip through the gate.

import {
  TILE,
  WALK_SPEED,
  SNEAK_SPEED,
  PLAYER_RADIUS,
  PEBBLES_PER_LEVEL,
  PEBBLE_RANGE,
} from './config.js';
import { tileAt, isSolidTile } from './levels.js';

export class Player {
  constructor(spawn) {
    this.spawn = { x: (spawn.x + 0.5) * TILE, y: (spawn.y + 0.5) * TILE };
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.sneaking = false;
    this.facing = -Math.PI / 2;
    this.pebbles = PEBBLES_PER_LEVEL;
    this.fireflies = 0;
    this.hasPearl = false;
    this.stepPhase = 0;
    this.moving = false;
  }

  reset() {
    this.x = this.spawn.x;
    this.y = this.spawn.y;
    this.sneaking = false;
    this.pebbles = PEBBLES_PER_LEVEL;
    this.fireflies = 0;
    this.hasPearl = false;
    this.stepPhase = 0;
  }

  collides(level, px, py) {
    const r = PLAYER_RADIUS - 2;
    for (const [cx, cy] of [
      [px - r, py - r],
      [px + r, py - r],
      [px - r, py + r],
      [px + r, py + r],
    ]) {
      if (isSolidTile(tileAt(level, Math.floor(cx / TILE), Math.floor(cy / TILE)))) return true;
    }
    return false;
  }

  update(dt, input, level) {
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    this.sneaking = Boolean(input.sneak) && (mx !== 0 || my !== 0);
    this.moving = mx !== 0 || my !== 0;
    if (!this.moving) return;
    const len = Math.hypot(mx, my);
    const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const stepX = (mx / len) * speed * dt;
    const stepY = (my / len) * speed * dt;
    this.facing = Math.atan2(stepY, stepX);
    // Move axis by axis so the player slides along walls instead of sticking.
    if (!this.collides(level, this.x + stepX, this.y)) this.x += stepX;
    if (!this.collides(level, this.x, this.y + stepY)) this.y += stepY;
    this.stepPhase += Math.hypot(stepX, stepY);
  }

  tile() {
    return { x: Math.floor(this.x / TILE), y: Math.floor(this.y / TILE) };
  }

  // A pebble lands where the mouse clicked, clamped to throwing range.
  throwPebble(worldX, worldY) {
    if (this.pebbles <= 0) return null;
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    const dist = Math.hypot(dx, dy);
    const reach = Math.min(dist, PEBBLE_RANGE);
    const land = dist > 0
      ? { x: this.x + (dx / dist) * reach, y: this.y + (dy / dist) * reach }
      : { x: this.x, y: this.y };
    this.pebbles -= 1;
    return land;
  }
}
