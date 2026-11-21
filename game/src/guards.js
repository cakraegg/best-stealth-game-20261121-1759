// EMBERWICK guard AI: patrol, suspicion, alert chase, and search.
// A guard never sees through walls or crates, and a player crouched in a
// bush is invisible unless the guard is almost on top of them.

import {
  TILE,
  GUARD_PATROL_SPEED,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_CHASE_SPEED,
  ELITE_MULTIPLIER,
  CONE_RANGE,
  CONE_HALF_ANGLE,
  ELITE_RANGE_BONUS,
  LIGHT_RANGE_BONUS,
  BUSH_HIDE_DISTANCE,
  DETECT_RISE,
  DETECT_RISE_FAR,
  DETECT_FALL,
  SUSPICIOUS_AT,
  ALERT_AT,
  SNEAK_DETECT_MULT,
  LIGHT_DETECT_MULT,
  SEARCH_SECONDS,
  LOSE_SIGHT_SECONDS,
  WAYPOINT_PAUSE,
  PEBBLE_HEAR_RADIUS,
} from './config.js';
import { tileAt, isSolidTile, isBushTile, isLanternTile } from './levels.js';

function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Walk the line in small steps; any solid tile blocks the view.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const px = ax + (dx * i) / steps;
    const py = ay + (dy * i) / steps;
    const ch = tileAt(level, Math.floor(px / TILE), Math.floor(py / TILE));
    if (isSolidTile(ch)) return false;
  }
  return true;
}

export function tileIsLit(level, tx, ty) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      if (dx * dx + dy * dy > 5) continue;
      if (isLanternTile(tileAt(level, tx + dx, ty + dy))) return true;
    }
  }
  return false;
}

export class Guard {
  constructor(def, level) {
    this.name = def.name;
    this.elite = Boolean(def.elite);
    this.waypoints = def.waypoints.map(([x, y]) => tileCenter(x, y));
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.wpIndex = 1 % this.waypoints.length;
    this.facing = 0;
    this.state = 'patrol'; // patrol | suspicious | alert | search
    this.meter = 0;
    this.pauseLeft = 0;
    this.searchLeft = 0;
    this.loseSightLeft = 0;
    this.lastSeen = null;
    this.investigate = null;
    this.stepPhase = 0;
    this.speedMult = def.speed || 1;
    this.rangeBonus = def.range || 0;
    this.level = level;
  }

  range() {
    return CONE_RANGE + this.rangeBonus + (this.elite ? ELITE_RANGE_BONUS : 0);
  }

  // Can this guard currently see the player at all?
  canSee(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const ptx = Math.floor(player.x / TILE);
    const pty = Math.floor(player.y / TILE);
    const inBush = isBushTile(tileAt(this.level, ptx, pty));
    if (inBush && dist > BUSH_HIDE_DISTANCE) return { seen: false, dist, lit: false };
    let range = this.range();
    const lit = tileIsLit(this.level, ptx, pty);
    if (lit) range += LIGHT_RANGE_BONUS;
    if (dist > range) return { seen: false, dist, lit };
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, this.facing)) > CONE_HALF_ANGLE) {
      return { seen: false, dist, lit };
    }
    if (!hasLineOfSight(this.level, this.x, this.y, player.x, player.y)) {
      return { seen: false, dist, lit };
    }
    return { seen: true, dist, lit };
  }

  hearNoise(px, py) {
    const dist = Math.hypot(px - this.x, py - this.y);
    if (dist > PEBBLE_HEAR_RADIUS) return;
    if (this.state === 'alert') return;
    this.investigate = { x: px, y: py };
    this.state = 'search';
    this.searchLeft = SEARCH_SECONDS;
    this.meter = Math.max(this.meter, SUSPICIOUS_AT);
  }

  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const step = Math.min(dist, speed * dt);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.facing = Math.atan2(dy, dx);
    this.stepPhase += step;
    return dist - step < 2;
  }

  update(dt, player, events) {
    const seen = this.canSee(player);
    const range = this.range();
    if (seen.seen) {
      // Detection rises faster up close, slower at the cone's edge, slower
      // still against a sneaking player, faster under a lantern.
      const closeness = 1 - Math.min(1, seen.dist / range);
      let rate = DETECT_RISE_FAR + (DETECT_RISE - DETECT_RISE_FAR) * closeness;
      if (player.sneaking) rate *= SNEAK_DETECT_MULT;
      if (seen.lit) rate *= LIGHT_DETECT_MULT;
      this.meter = Math.min(1, this.meter + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightLeft = LOSE_SIGHT_SECONDS;
      if (this.meter >= ALERT_AT && this.state !== 'alert') {
        this.state = 'alert';
        events.push({ type: 'alarm', guard: this });
      } else if (this.meter >= SUSPICIOUS_AT && this.state === 'patrol') {
        this.state = 'suspicious';
      }
    } else {
      this.meter = Math.max(0, this.meter - DETECT_FALL * dt);
      if (this.state === 'alert') {
        this.loseSightLeft -= dt;
        if (this.loseSightLeft <= 0) {
          this.state = 'search';
          this.searchLeft = SEARCH_SECONDS;
          this.investigate = this.lastSeen ? { ...this.lastSeen } : null;
        }
      } else if (this.state === 'suspicious' && this.meter < SUSPICIOUS_AT) {
        this.state = 'patrol';
      }
    }

    const patrolSpeed = GUARD_PATROL_SPEED * this.speedMult * (this.elite ? ELITE_MULTIPLIER : 1);
    if (this.state === 'patrol') {
      if (this.pauseLeft > 0) {
        this.pauseLeft -= dt;
        // Look around while waiting at a waypoint.
        this.facing += Math.sin(this.pauseLeft * 2.2) * 0.02;
      } else {
        const target = this.waypoints[this.wpIndex];
        if (this.moveToward(target.x, target.y, patrolSpeed, dt)) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.pauseLeft = WAYPOINT_PAUSE;
        }
      }
    } else if (this.state === 'suspicious') {
      if (this.lastSeen) {
        const dx = this.lastSeen.x - this.x;
        const dy = this.lastSeen.y - this.y;
        this.facing = Math.atan2(dy, dx);
        this.moveToward(this.lastSeen.x, this.lastSeen.y, GUARD_SUSPICIOUS_SPEED * this.speedMult, dt);
      }
    } else if (this.state === 'alert') {
      const chase = GUARD_CHASE_SPEED * this.speedMult * (this.elite ? ELITE_MULTIPLIER : 1);
      this.moveToward(player.x, player.y, chase, dt);
    } else if (this.state === 'search') {
      this.searchLeft -= dt;
      if (this.investigate) {
        const arrived = this.moveToward(
          this.investigate.x,
          this.investigate.y,
          GUARD_SUSPICIOUS_SPEED * this.speedMult,
          dt,
        );
        if (arrived) {
          this.facing += dt * 1.4; // scan the spot, then give up
        }
      }
      if (this.searchLeft <= 0) {
        this.state = 'patrol';
        this.investigate = null;
        this.meter = 0;
      }
    }
  }
}
