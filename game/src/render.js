// EMBERWICK rendering: one canvas, layered in order — floor and cover,
// lantern light and darkness, vision cones, characters, then the HUD.
// The same painter draws the title, caught and win screens.

import {
  TILE,
  MAP_W,
  MAP_H,
  MAP_X,
  CANVAS_W,
  CANVAS_H,
  CONE_RANGE,
  CONE_HALF_ANGLE,
  PALETTE,
  TEXTS,
} from './config.js';
import { tileAt, isSolidTile, isBushTile, tileShade } from './levels.js';

// One reused offscreen canvas for the night-darkness layer (see drawWorld).
let darkCanvas = null;

export function drawCone(ctx, gx, gy, facing, range, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.arc(gx, gy, range, facing - CONE_HALF_ANGLE, facing + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fill();
  // A bright rim so the cone reads as a cone, not a blob.
  ctx.strokeStyle = 'rgba(255, 224, 130, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(gx, gy, range, facing - CONE_HALF_ANGLE, facing + CONE_HALF_ANGLE);
  ctx.stroke();
  ctx.restore();
}

function drawLantern(ctx, x, y, t) {
  const flicker = 0.85 + Math.sin(t * 3.1 + x * 0.7) * 0.08 + Math.sin(t * 7.7 + y) * 0.05;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 110 * flicker);
  glow.addColorStop(0, 'rgba(255, 179, 71, 0.7)');
  glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 110 * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.lanternPost;
  ctx.fillRect(x - 3, y - 8, 6, 18);
  ctx.fillStyle = PALETTE.lanternGlow;
  ctx.beginPath();
  ctx.arc(x, y - 10, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(x, y - 10, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPearl(ctx, x, y, t) {
  const pulse = 1 + Math.sin(t * 2.4) * 0.12;
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 48 * pulse);
  glow.addColorStop(0, 'rgba(191, 243, 255, 0.9)');
  glow.addColorStop(1, 'rgba(191, 243, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 48 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.pearl;
  ctx.beginPath();
  ctx.arc(x, y, 9 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.pearlCore;
  ctx.beginPath();
  ctx.arc(x - 2.5, y - 2.5, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawExit(ctx, x, y, open, t) {
  ctx.save();
  ctx.translate(x, y);
  const glowR = open ? 58 + Math.sin(t * 3) * 6 : 34;
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, glowR);
  glow.addColorStop(0, open ? 'rgba(125, 255, 158, 0.8)' : 'rgba(90, 140, 110, 0.5)');
  glow.addColorStop(1, 'rgba(125, 255, 158, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = open ? PALETTE.exitOpen : PALETTE.exitLocked;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 6, 21, Math.PI, 0);
  ctx.moveTo(-21, 6);
  ctx.lineTo(-21, 22);
  ctx.moveTo(21, 6);
  ctx.lineTo(21, 22);
  ctx.stroke();
  if (!open) {
    ctx.strokeStyle = '#8a6d3b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-21, 22);
    ctx.lineTo(21, 22);
    ctx.moveTo(-21, 13);
    ctx.lineTo(21, 13);
    ctx.stroke();
  }
  ctx.fillStyle = open ? PALETTE.exitOpen : '#9fc7a8';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', 0, 42);
  ctx.restore();
}

function drawGuard(ctx, guard, t) {
  const { x, y } = guard;
  const fill = guard.state === 'alert'
    ? PALETTE.coneAlert
    : guard.state === 'suspicious' || guard.state === 'search'
      ? PALETTE.coneSuspicious
      : PALETTE.coneCalm;
  drawCone(ctx, x, y, guard.facing, guard.range(), fill);
  // Body: a lantern guard in a maroon coat, helmet catching the light.
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 12, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = guard.state === 'alert' ? PALETTE.guardAlert : PALETTE.guardBody;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guardTrim;
  ctx.beginPath();
  ctx.arc(0, 0, 15, guard.facing - 0.5, guard.facing + 0.5);
  ctx.lineTo(0, 0);
  ctx.fill();
  ctx.fillStyle = '#e8d9a8';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.facing) * 5, Math.sin(guard.facing) * 5 - 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2c14';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.facing) * 9, Math.sin(guard.facing) * 9 - 4, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Detection eye and meter above the guard.
  if (guard.meter > 0.02) {
    const w = 34;
    const bx = x - w / 2;
    const by = y - 30;
    ctx.fillStyle = 'rgba(8, 8, 20, 0.8)';
    ctx.fillRect(bx - 2, by - 2, w + 4, 9);
    ctx.fillStyle = guard.meter >= 1 ? '#ff3b30' : guard.meter >= 0.35 ? '#ff9a3c' : '#ffcf6e';
    ctx.fillRect(bx, by, w * guard.meter, 5);
  }
  if (guard.state === 'alert') {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', x, y - 38);
  } else if (guard.state === 'search' || guard.state === 'suspicious') {
    ctx.fillStyle = '#ffcf6e';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', x, y - 38);
  }
  ctx.fillStyle = 'rgba(242, 234, 216, 0.85)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(guard.name, x, y + 30);
}

function drawPlayer(ctx, player, t) {
  const { x, y } = player;
  const bob = player.moving ? Math.sin(player.stepPhase * 0.12) * 1.5 : Math.sin(t * 2) * 0.8;
  const crouch = player.sneaking ? 0.82 : 1;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(2, 12, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerCloak;
  ctx.beginPath();
  ctx.arc(0, 0, 14 * crouch + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9fff2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 14 * crouch + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.playerHood;
  ctx.beginPath();
  ctx.arc(Math.cos(player.facing) * 3, Math.sin(player.facing) * 3 - 3, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(Math.cos(player.facing) * 7, Math.sin(player.facing) * 7 - 3, 2.4, 0, Math.PI * 2);
  ctx.fill();
  if (player.hasPearl) {
    ctx.fillStyle = PALETTE.pearl;
    ctx.beginPath();
    ctx.arc(-10, 6, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFirefly(ctx, x, y, t, seed) {
  const tw = 0.6 + Math.sin(t * 3 + seed * 2.1) * 0.4;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 12);
  glow.addColorStop(0, `rgba(190, 255, 170, ${0.75 * tw})`);
  glow.addColorStop(1, 'rgba(190, 255, 170, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8ffb0';
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawWorld(ctx, game, t) {
  const { level, player, guards, pebbles, levelIndex } = game;
  ctx.save();
  ctx.translate(MAP_X, 0);
  // Floor: stone tiles with a deterministic shade per tile, plus a path tint
  // down the middle walkway so routes read at a glance.
  for (let y = 0; y < level.tiles.length; y += 1) {
    for (let x = 0; x < level.tiles[y].length; x += 1) {
      const ch = level.tiles[y][x];
      const px = x * TILE;
      const py = y * TILE;
      const shade = tileShade(x, y);
      if (ch === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(px, py, TILE, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(px + 3, py + 8, TILE - 6, 2);
      } else {
        ctx.fillStyle = shade > 0.5 ? PALETTE.floorLight : PALETTE.floorDark;
        ctx.fillRect(px, py, TILE, TILE);
        if (ch === '.') {
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(px + 2, py + 2, TILE - 4, 1);
        }
      }
      if (ch === ',') {
        ctx.fillStyle = PALETTE.bush;
        ctx.beginPath();
        ctx.arc(px + 14, py + 26, 15, 0, Math.PI * 2);
        ctx.arc(px + 32, py + 20, 16, 0, Math.PI * 2);
        ctx.arc(px + 24, py + 34, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.bushLeaf;
        ctx.beginPath();
        ctx.arc(px + 16, py + 22, 8, 0, Math.PI * 2);
        ctx.arc(px + 32, py + 30, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      if (ch === 'C') {
        ctx.fillStyle = PALETTE.crate;
        ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
        ctx.strokeStyle = PALETTE.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 6, py + 6, TILE - 12, TILE - 12);
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 6);
        ctx.lineTo(px + TILE - 6, py + TILE - 6);
        ctx.moveTo(px + TILE - 6, py + 6);
        ctx.lineTo(px + 6, py + TILE - 6);
        ctx.stroke();
      }
      if (ch === 'L') drawLantern(ctx, px + TILE / 2, py + TILE / 2, t);
    }
  }
  // Gazebo ring around the pearl, so the prize reads as a place.
  if (level.pearl) {
    const cx = (level.pearl.x + 0.5) * TILE;
    const cy = (level.pearl.y + 0.5) * TILE;
    ctx.strokeStyle = 'rgba(216, 178, 92, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.stroke();
    if (!player.hasPearl) drawPearl(ctx, cx, cy, t);
  }
  if (level.exit) {
    drawExit(ctx, (level.exit.x + 0.5) * TILE, (level.exit.y + 0.5) * TILE, player.hasPearl, t);
  }
  level.fireflies.forEach((f, i) => {
    if (!f.taken) drawFirefly(ctx, (f.x + 0.5) * TILE, (f.y + 0.5) * TILE, t, i * 3 + levelIndex);
  });
  // Night darkness, with warm holes cut around lanterns and the player.
  // Painted on a reused offscreen canvas: cutting the holes there erases
  // only darkness, never the floor and lantern glow underneath.
  if (!darkCanvas) {
    darkCanvas = document.createElement('canvas');
    darkCanvas.width = MAP_W;
    darkCanvas.height = MAP_H;
  }
  const dctx = darkCanvas.getContext('2d');
  dctx.clearRect(0, 0, MAP_W, MAP_H);
  dctx.fillStyle = PALETTE.darkness;
  dctx.fillRect(0, 0, MAP_W, MAP_H);
  dctx.globalCompositeOperation = 'destination-out';
  level.lanterns.forEach((l) => {
    const g = dctx.createRadialGradient(
      (l.x + 0.5) * TILE, (l.y + 0.5) * TILE, 10,
      (l.x + 0.5) * TILE, (l.y + 0.5) * TILE, 110,
    );
    g.addColorStop(0, 'rgba(0,0,0,0.95)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = g;
    dctx.beginPath();
    dctx.arc((l.x + 0.5) * TILE, (l.y + 0.5) * TILE, 110, 0, Math.PI * 2);
    dctx.fill();
  });
  const pg = dctx.createRadialGradient(player.x, player.y, 8, player.x, player.y, 85);
  pg.addColorStop(0, 'rgba(0,0,0,0.9)');
  pg.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = pg;
  dctx.beginPath();
  dctx.arc(player.x, player.y, 85, 0, Math.PI * 2);
  dctx.fill();
  dctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkCanvas, 0, 0);
  // Thrown pebbles on the ground, then guards, then the player on top.
  pebbles.forEach((p) => {
    ctx.fillStyle = '#9a938a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  guards.forEach((g) => drawGuard(ctx, g, t));
  drawPlayer(ctx, player, t);
  // Hiding in a bush tucks leaves over the player: cover you can see working.
  const ptile = player.tile();
  if (isBushTile(tileAt(level, ptile.x, ptile.y))) {
    ctx.fillStyle = 'rgba(47, 107, 63, 0.88)';
    ctx.beginPath();
    ctx.arc(player.x - 8, player.y - 6, 10, 0, Math.PI * 2);
    ctx.arc(player.x + 9, player.y - 2, 11, 0, Math.PI * 2);
    ctx.arc(player.x, player.y + 9, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(70, 160, 92, 0.9)';
    ctx.beginPath();
    ctx.arc(player.x - 4, player.y - 9, 5, 0, Math.PI * 2);
    ctx.arc(player.x + 7, player.y + 6, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawHud(ctx, game) {
  const { level, levelIndex, player, guards, elapsed } = game;
  const def = level.def;
  ctx.fillStyle = PALETTE.hudBar;
  ctx.fillRect(0, 0, CANVAS_W, 46);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${def.name}  ·  ${def.sub}`, 18, 20);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(TEXTS.objective, 18, 38);
  // Right side: fireflies, pebbles, global alarm, timer.
  const totalFlies = level.fireflies.length;
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`✦ ${player.fireflies}/${totalFlies}    ● ${player.pebbles} pebbles`, CANVAS_W - 260, 20);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(elapsed % 60)).padStart(2, '0');
  ctx.fillText(`${mm}:${ss}`, CANVAS_W - 18, 20);
  // Global detection eye: the worst guard meter, so a near-miss reads instantly.
  const worst = guards.reduce((m, g) => Math.max(m, g.meter), 0);
  const ex = CANVAS_W - 260;
  const ey = 30;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(ex, ey, 120, 8);
  ctx.fillStyle = worst >= 1 ? '#ff3b30' : worst >= 0.35 ? '#ff9a3c' : '#ffcf6e';
  ctx.fillRect(ex, ey, 120 * worst, 8);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(worst >= 1 ? 'SPOTTED!' : worst >= 0.35 ? 'suspicious…' : 'unseen', ex + 130, ey + 8);
  // Context prompt near the bottom.
  const tile = player.tile();
  const onPearl = level.pearl && tile.x === level.pearl.x && tile.y === level.pearl.y && !player.hasPearl;
  const onExit = level.exit && tile.x === level.exit.x && tile.y === level.exit.y;
  let prompt = '';
  if (onPearl) prompt = TEXTS.pearlPrompt;
  else if (onExit && player.hasPearl) prompt = TEXTS.gatePrompt;
  else if (onExit) prompt = TEXTS.gateLocked;
  if (prompt) {
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(prompt).width + 28;
    ctx.fillStyle = 'rgba(10, 10, 24, 0.82)';
    ctx.fillRect((CANVAS_W - w) / 2, CANVAS_H - 52, w, 34);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(prompt, CANVAS_W / 2, CANVAS_H - 29);
  }
  // Controls reminder, small and dim.
  ctx.fillStyle = 'rgba(185, 178, 160, 0.75)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD move · Shift sneak · Click throw pebble · E interact · R restart · P pause', 18, CANVAS_H - 12);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 6, 18, 0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || PALETTE.text;
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2 - 40);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '19px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, CANVAS_H / 2 + 8 + i * 30);
  });
}

export function drawTitle(ctx) {
  ctx.fillStyle = '#0d0b1e';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // A painted night garden behind the title: moon, manor silhouette, bushes.
  const moon = ctx.createRadialGradient(1020, 130, 10, 1020, 130, 150);
  moon.addColorStop(0, 'rgba(255, 244, 200, 0.9)');
  moon.addColorStop(0.25, 'rgba(255, 244, 200, 0.25)');
  moon.addColorStop(1, 'rgba(255, 244, 200, 0)');
  ctx.fillStyle = moon;
  ctx.fillRect(820, 0, 400, 320);
  ctx.fillStyle = '#f7efc8';
  ctx.beginPath();
  ctx.arc(1020, 130, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#17142c';
  ctx.fillRect(140, 430, 1000, 290);
  ctx.fillRect(560, 330, 160, 110);
  ctx.beginPath();
  ctx.moveTo(540, 330);
  ctx.lineTo(640, 260);
  ctx.lineTo(740, 330);
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  for (let i = 0; i < 9; i += 1) {
    ctx.fillRect(200 + i * 100, 480, 26, 34);
  }
  ctx.fillStyle = PALETTE.bush;
  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    ctx.arc(60 + i * 110, 690, 46, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText(TEXTS.title, CANVAS_W / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'italic 34px Georgia, serif';
  ctx.fillText(TEXTS.subtitle, CANVAS_W / 2, 300);
  ctx.font = '19px sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(TEXTS.tagline, CANVAS_W / 2, 348);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '15px sans-serif';
  ctx.fillText(TEXTS.controls, CANVAS_W / 2, 560);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(TEXTS.pressStart, CANVAS_W / 2, 610);
}

export function drawCaught(ctx) {
  overlay(ctx, TEXTS.caught, [TEXTS.caughtSub, 'Press R to try again — the patrols reset.'], '#ff6b5e');
}

export function drawLevelClear(ctx, levelName, timeText) {
  overlay(ctx, TEXTS.levelClear, [`${levelName} — cleared in ${timeText}.`, 'Press Enter for the next level.'], PALETTE.exitOpen);
}

export function drawGameClear(ctx, totalTime, totalFlies, maxFlies) {
  overlay(
    ctx,
    TEXTS.gameClear,
    [
      `You slipped out of Emberwick with the Moonpearl in ${totalTime}.`,
      `Fireflies gathered: ${totalFlies} of ${maxFlies}.`,
      'Press Enter to play again from the garden.',
    ],
    PALETTE.gold,
  );
}

export function drawPaused(ctx) {
  overlay(ctx, 'PAUSED', ['Press P to keep sneaking.'], PALETTE.textDim);
}
