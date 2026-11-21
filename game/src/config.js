// EMBERWICK — The Lantern Thief: shared tuning and palette.
// One job: every number and colour the rest of the game agrees on.

export const TILE = 48;
export const COLS = 26;
export const ROWS = 15;
export const MAP_W = COLS * TILE; // 1248
export const MAP_H = ROWS * TILE; // 720
export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const MAP_X = (CANVAS_W - MAP_W) / 2; // 16

// Movement (pixels per second).
export const WALK_SPEED = 150;
export const SNEAK_SPEED = 82;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_SUSPICIOUS_SPEED = 88;
export const GUARD_CHASE_SPEED = 148;
export const ELITE_MULTIPLIER = 1.25;

// Vision.
export const CONE_RANGE = 235;
export const CONE_HALF_ANGLE = 0.62; // radians, ~35 degrees each side
export const ELITE_RANGE_BONUS = 55;
export const LIGHT_RANGE_BONUS = 45;
export const BUSH_HIDE_DISTANCE = 42; // a guard must be this close to spot a hidden player

// Detection meter 0..1. Rises while the guard sees the player, falls otherwise.
export const DETECT_RISE = 1.15; // per second, point blank
export const DETECT_RISE_FAR = 0.45; // per second, at cone edge
export const DETECT_FALL = 0.28;
export const SUSPICIOUS_AT = 0.35;
export const ALERT_AT = 1.0;
export const SNEAK_DETECT_MULT = 0.45;
export const LIGHT_DETECT_MULT = 1.6;

// Guard patience.
export const SEARCH_SECONDS = 4.5;
export const LOSE_SIGHT_SECONDS = 2.2;
export const WAYPOINT_PAUSE = 1.1;

// Player.
export const PLAYER_RADIUS = 14;
export const GUARD_RADIUS = 15;
export const PEBBLES_PER_LEVEL = 3;
export const PEBBLE_RANGE = 320;
export const PEBBLE_HEAR_RADIUS = 430;

export const PALETTE = {
  floorLight: '#4a5470',
  floorDark: '#3f4763',
  floorPath: '#565e78',
  wall: '#2a2547',
  wallTop: '#4a4480',
  bush: '#2a6b3e',
  bushLeaf: '#46a05c',
  crate: '#5a4632',
  crateEdge: '#7a5f45',
  lanternGlow: '#ffb347',
  lanternPost: '#2a2118',
  pearl: '#bff3ff',
  pearlCore: '#ffffff',
  exitLocked: '#3f6b4f',
  exitOpen: '#7dff9e',
  guardBody: '#8e2f38',
  guardTrim: '#d8b25c',
  guardAlert: '#ff3b30',
  playerCloak: '#2e6f6a',
  playerHood: '#17423f',
  coneCalm: 'rgba(255, 201, 92, 0.20)',
  coneSuspicious: 'rgba(255, 150, 60, 0.30)',
  coneAlert: 'rgba(255, 59, 48, 0.34)',
  darkness: 'rgba(8, 8, 26, 0.38)',
  hudBar: 'rgba(10, 10, 24, 0.78)',
  text: '#f2ead8',
  textDim: '#b9b2a0',
  gold: '#ffcf6e',
};

export const TEXTS = {
  title: 'EMBERWICK',
  subtitle: 'The Lantern Thief',
  tagline: 'Steal the Moonpearl. Reach the gate. Never be seen.',
  objective: 'Steal the Moonpearl, then reach the gate unseen',
  controls:
    'WASD / Arrows — move    Shift — sneak    Click — throw a pebble    E — take pearl / open gate    R — restart    P — pause    M — mute',
  caught: 'CAUGHT!',
  caughtSub: 'A lantern guard seized you in the light. Press R to try the level again.',
  levelClear: 'LEVEL CLEAR',
  gameClear: 'THE MOONPEARL IS YOURS',
  pressStart: 'Click or press Enter to begin',
  pearlPrompt: 'Press E to take the Moonpearl',
  gatePrompt: 'Press E to slip through the gate',
  gateLocked: 'The gate is locked — take the Moonpearl first',
};
