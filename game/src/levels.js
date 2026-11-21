// EMBERWICK level data: three hand-drawn maps, patrol routes and pickups.
// Legend: # wall, . floor, , bush (hides you), C crate (solid cover),
// L lantern (light), P player spawn, * Moonpearl, E exit gate, f firefly.
// Every row is exactly 26 characters; validate with `node -e` if you edit a map.

export const LEVELS = [
  {
    name: 'Moonlit Garden',
    sub: 'Level 1 — learn the patrols',
    map: [
      '##########################',
      '#P....,,......##........E#',
      '#...............#........#',
      '#..C.....,....#....C.....#',
      '#.....L.......#..........#',
      '#............#....L......#',
      '#..f....C.....#..........#',
      '#............#..C....f...#',
      '#....,,.......#..........#',
      '#......L.....#....L......#',
      '#.............#..........#',
      '#..C....,....#....C......#',
      '#............#.....*.....#',
      '#.....f.......#..........#',
      '##########################',
    ],
    guards: [
      { name: 'Wren', waypoints: [[4, 2], [11, 2], [11, 4], [4, 4]], speed: 1.0, range: 0 },
      { name: 'Bramble', waypoints: [[6, 10], [11, 10], [11, 12], [6, 12]], speed: 1.0, range: 0 },
      { name: 'Sorrel', waypoints: [[18, 3], [18, 8], [22, 8], [22, 3]], speed: 1.0, range: 0 },
    ],
  },
  {
    name: 'Candle Hall',
    sub: 'Level 2 — corridors and candlelight',
    map: [
      '##########################',
      '#P......#.......#........#',
      '#..C....#...f.......L....#',
      '#.......#.......#........#',
      '###.#####...#####.#####..#',
      '#.......#.......#....C...#',
      '#..L........C............#',
      '#.......#.......#...f....#',
      '#..C....###.#####.#####..#',
      '#.......#.......#........#',
      '#....f..#...L...#....C...#',
      '#.......#.......#........#',
      '###.#####...#####.#####..#',
      '#......*#.......#.......E#',
      '##########################',
    ],
    guards: [
      { name: 'Wren', waypoints: [[2, 1], [7, 1], [7, 3], [2, 3]], speed: 1.05, range: 0 },
      { name: 'Ash', waypoints: [[13, 5], [13, 10], [15, 10], [15, 5]], speed: 1.45, range: 0 },
      { name: 'Sorrel', waypoints: [[19, 2], [23, 2], [23, 6], [19, 6]], speed: 1.05, range: 0 },
    ],
  },
  {
    name: 'The Vault',
    sub: 'Level 3 — the elite watch',
    map: [
      '##########################',
      '#P......##......##.......#',
      '#..C....##..f...##...L...#',
      '#........................#',
      '#..L....##..f...##...C...#',
      '#.......##..C...##.......#',
      '###.######..#####.#####..#',
      '#.......#.......#........#',
      '#..C....#...f.......L....#',
      '#.......#.......#........#',
      '#....L..........#....C...#',
      '#.......#...C...#........#',
      '###.######..#####.######E#',
      '#......*#.......#........#',
      '##########################',
    ],
    guards: [
      { name: 'Wren', waypoints: [[3, 1], [7, 1], [7, 3], [3, 3]], speed: 1.1, range: 0 },
      { name: 'Ash', waypoints: [[12, 2], [15, 2], [15, 4], [12, 4]], speed: 1.1, range: 0 },
      { name: 'Elite Rowan', waypoints: [[4, 8], [7, 8], [7, 10], [4, 10]], speed: 1.2, range: 55, elite: true },
      { name: 'Sorrel', waypoints: [[19, 8], [23, 8], [23, 11], [19, 11]], speed: 1.1, range: 0 },
      { name: 'Bramble', waypoints: [[11, 7], [15, 7], [15, 9], [11, 9]], speed: 1.1, range: 0 },
    ],
  },
];

// Parse one map's characters into the structures the game loop uses.
export function parseLevel(def) {
  const tiles = [];
  let player = { x: 1, y: 1 };
  let pearl = null;
  let exit = null;
  const fireflies = [];
  const lanterns = [];
  for (let y = 0; y < def.map.length; y += 1) {
    const row = def.map[y];
    tiles.push(row.split(''));
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      if (ch === 'P') player = { x, y };
      if (ch === '*') pearl = { x, y };
      if (ch === 'E') exit = { x, y };
      if (ch === 'f') fireflies.push({ x, y, taken: false });
      if (ch === 'L') lanterns.push({ x, y });
    }
  }
  return { def, tiles, player, pearl, exit, fireflies, lanterns };
}

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || ty >= level.tiles.length || tx >= level.tiles[ty].length) return '#';
  return level.tiles[ty][tx];
}

export function isSolidTile(ch) {
  return ch === '#' || ch === 'C';
}

export function isBushTile(ch) {
  return ch === ',';
}

export function isLanternTile(ch) {
  return ch === 'L';
}

// Deterministic per-tile shade so the floor never looks flat but always
// renders the same way. A tiny integer hash of the coordinates.
export function tileShade(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  return ((h * 1274126177) | 0) % 100 / 100;
}
