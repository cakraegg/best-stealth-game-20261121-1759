// EMBERWICK screenshot staging: deterministic states for ?shot=<name>&seed=1.
// Each stage places the player, the guards and the meters by hand, so the
// same query always renders the same frame. No randomness, no animation.

import { TILE } from './config.js';

function at(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

function placeGuard(guard, tx, ty, facing, state, meter) {
  const p = at(tx, ty);
  guard.x = p.x;
  guard.y = p.y;
  guard.facing = facing;
  guard.state = state;
  guard.meter = meter;
  guard.pauseLeft = 0;
  if (state === 'search' || state === 'suspicious') {
    guard.lastSeen = { x: p.x + 120, y: p.y - 40 };
  }
}

// Cover shot: the whole first level mid-game — player crouched behind a
// bush, two patrol cones sweeping the stone path, pearl in its gazebo,
// the gate glowing at the far end, HUD complete.
function stageStart(game) {
  const p = at(7, 8);
  game.player.x = p.x;
  game.player.y = p.y;
  game.player.sneaking = true;
  game.player.facing = Math.PI / 2;
  placeGuard(game.guards[0], 9, 2, 0, 'patrol', 0);
  placeGuard(game.guards[1], 8, 11, -Math.PI / 2, 'patrol', 0);
  placeGuard(game.guards[2], 20, 5, Math.PI, 'patrol', 0);
  game.elapsed = 47;
}

// Tense shot: a cone sweeps right past a player pressed into the shadows,
// detection half full, a thrown pebble lying by the guard's feet.
function stageTense(game) {
  const p = at(12, 6);
  game.player.x = p.x;
  game.player.y = p.y;
  game.player.sneaking = true;
  game.player.facing = Math.PI;
  placeGuard(game.guards[0], 11, 4, Math.PI / 2, 'suspicious', 0.52);
  placeGuard(game.guards[1], 8, 11, 0, 'patrol', 0);
  placeGuard(game.guards[2], 20, 5, Math.PI, 'patrol', 0);
  game.pebbles = [{ x: (11.5) * TILE, y: (5.5) * TILE }];
  game.player.pebbles = 2;
  game.elapsed = 96;
}

// Search shot: the player hides INSIDE a bush while a guard investigates
// the pebble's clatter, question mark over its head.
function stageSearch(game) {
  const p = at(6, 8);
  game.player.x = p.x;
  game.player.y = p.y;
  game.player.sneaking = true;
  placeGuard(game.guards[0], 10, 8, 0, 'search', 0.42);
  game.guards[0].investigate = { x: (11.5) * TILE, y: (8.5) * TILE };
  placeGuard(game.guards[1], 8, 12, -Math.PI / 2, 'patrol', 0);
  placeGuard(game.guards[2], 20, 5, Math.PI, 'patrol', 0);
  game.pebbles = [{ x: (11.5) * TILE, y: (8.5) * TILE }];
  game.player.pebbles = 2;
  game.elapsed = 133;
}

// Vault shot: level 3, pearl just taken, the elite guard's cone burning red
// as it chases, the open gate glowing ahead of the player.
function stageVault(game) {
  game.loadLevel(2);
  const p = at(21, 12);
  game.player.x = p.x;
  game.player.y = p.y;
  game.player.hasPearl = true;
  game.player.facing = Math.PI;
  game.player.pebbles = 1;
  game.player.fireflies = 2;
  placeGuard(game.guards[2], 19, 10, 0, 'alert', 1);
  placeGuard(game.guards[0], 5, 2, Math.PI / 2, 'patrol', 0);
  placeGuard(game.guards[1], 13, 3, -Math.PI / 2, 'patrol', 0);
  placeGuard(game.guards[3], 21, 9, Math.PI, 'suspicious', 0.6);
  placeGuard(game.guards[4], 13, 8, 0, 'patrol', 0);
  game.elapsed = 214;
}

export const STAGES = {
  start: stageStart,
  tense: stageTense,
  search: stageSearch,
  vault: stageVault,
};

export function applyShot(game, name) {
  const stage = STAGES[name];
  if (!stage) return false;
  stage(game);
  return true;
}
