// World / marina generator based on docking type
// Coordinates are in metres. Origin at top-left of the "water area".
// Boat should approach from the bottom of the screen toward dock at top.

export const WORLD = { w: 80, h: 120 }; // 80m x 120m water area

export function buildWorld(cfg) {
  const w = { obstacles: [], walls: [], target: null, spawn: null, lines: [], mooringBall: null, anchor: null, meta: cfg };

  // Base pontoon/dock shapes along the top edge
  // A primary dock runs horizontally across top (y=10..14)
  const dockY = 12;
  const dockH = 6;

  const dock = { type: 'dock', x1: 0, y1: 6, x2: WORLD.w, y2: dockY + dockH/2 };
  w.walls.push(dock);

  // Populate neighbour boats based on density.
  // normal:  2 boats, ONE SIDE of berth only (clear approach from other side)
  // crowded: 5 boats, both sides tight
  const density = cfg.obs;

  // Helper: place boats along dock in numbered slots.
  // normal → side=+1 only (starboard of berth); crowded → alternating sides.
  function sideAndN(i, isNormal) {
    if (isNormal) return { side: 1, n: i + 1 };           // +1 side, n=1,2
    return { side: i % 2 === 0 ? 1 : -1, n: Math.floor(i/2) + 1 }; // alternating
  }

  switch (cfg.dock) {
    case 'alongside': {
      const berthX = WORLD.w / 2;
      const berthY = dockY + dockH/2 + 3.5;
      w.target = {
        type: 'alongside',
        x: berthX, y: berthY,
        angle: 0,
        tolerance: { pos: 5.5, angle: 0.38 },
      };
      // normal: 2 boats on starboard side only, starting 16m out (one berth gap)
      // crowded: 5 boats tight on both sides
      const aOffsets = density === 'empty'  ? [] :
                       density === 'normal' ? [18, 34]                    :
                                             [-14, 14, -28, 28, -42];
      for (const off of aOffsets) {
        const bx = berthX + off;
        if (bx < 4 || bx > WORLD.w - 4) continue;
        w.obstacles.push({type:'boat', x:bx, y:berthY, angle:0, len: 10 + Math.random()*4, beam: 3.5});
      }
      w.spawn = { x: WORLD.w/2, y: WORLD.h - 20, heading: -Math.PI/2 };
      break;
    }
    case 'stern-med': {
      const berthX = WORLD.w / 2;
      const lm = (cfg.length || 40) * 0.3048;
      const berthY = dockY + dockH/2 + lm * 0.6;
      w.target = {
        type: 'stern-med',
        x: berthX, y: berthY,
        angle: Math.PI/2,   // stern to dock: bow faces downward (+y)
        tolerance: { pos: 5.0, angle: 0.32 },
      };
      const spacing = 7.5;
      const smSlots = density === 'empty' ? 0 : density === 'normal' ? 2 : 5;
      const isNormal = density === 'normal';
      for (let i = 0; i < smSlots; i++) {
        const { side, n } = sideAndN(i, isNormal);
        const bx = berthX + side * n * spacing;
        if (bx < 6 || bx > WORLD.w - 6) continue;
        w.obstacles.push({type:'boat', x:bx, y:berthY, angle:Math.PI/2, len: 11, beam: 3.8});
      }
      w.lines.push({x1:berthX, y1:berthY+1, x2:berthX, y2:berthY+14, dash:true});
      w.spawn = { x: WORLD.w/2, y: WORLD.h - 20, heading: -Math.PI/2 };
      break;
    }
    case 'stern-anchor': {
      const berthX = WORLD.w / 2;
      const lm = (cfg.length || 40) * 0.3048;
      const berthY = dockY + dockH/2 + lm * 0.6;
      w.target = {
        type: 'stern-anchor',
        x: berthX, y: berthY,
        angle: Math.PI/2,   // stern to dock: bow faces downward (+y)
        tolerance: { pos: 5.0, angle: 0.34 },
      };
      // anchor is placed by player during gameplay (no pre-placed anchor)
      const spacing = 7.5;
      const saSlots = density === 'empty' ? 0 : density === 'normal' ? 2 : 5;
      const isNormal = density === 'normal';
      for (let i = 0; i < saSlots; i++) {
        const { side, n } = sideAndN(i, isNormal);
        const bx = berthX + side * n * spacing;
        if (bx < 6 || bx > WORLD.w - 6) continue;
        w.obstacles.push({type:'boat', x:bx, y:berthY, angle:Math.PI/2, len: 11, beam: 3.8});
      }
      w.spawn = { x: WORLD.w/2, y: WORLD.h - 20, heading: -Math.PI/2 };
      break;
    }
    case 'bow-to': {
      const berthX = WORLD.w / 2;
      const lm = (cfg.length || 40) * 0.3048;
      const berthY = dockY + dockH/2 + lm * 0.6;
      w.target = {
        type: 'bow-to',
        x: berthX, y: berthY,
        angle: -Math.PI/2,  // bow to dock: bow faces upward (−y)
        tolerance: { pos: 5.0, angle: 0.32 },
      };
      const spacing = 7.5;
      const btSlots = density === 'empty' ? 0 : density === 'normal' ? 2 : 5;
      const isNormal = density === 'normal';
      for (let i = 0; i < btSlots; i++) {
        const { side, n } = sideAndN(i, isNormal);
        const bx = berthX + side * n * spacing;
        if (bx < 6 || bx > WORLD.w - 6) continue;
        w.obstacles.push({type:'boat', x:bx, y:berthY, angle:-Math.PI/2, len: 11, beam: 3.8});
      }
      w.spawn = { x: WORLD.w/2, y: WORLD.h - 20, heading: -Math.PI/2 };
      break;
    }
    case 'piles': {
      const berthX = WORLD.w / 2;
      const lm = (cfg.length || 40) * 0.3048;
      const berthY = dockY + dockH/2 + lm * 0.6;
      w.target = {
        type: 'piles',
        x: berthX, y: berthY,
        angle: -Math.PI/2,  // bow to dock: bow faces upward (−y)
        tolerance: { pos: 4.5, angle: 0.30 },
      };
      w.obstacles.push({type:'pile', x: berthX - 3.5, y: berthY + lm * 0.45});
      w.obstacles.push({type:'pile', x: berthX + 3.5, y: berthY + lm * 0.45});
      const spacing = 8;
      const pSlots = density === 'empty' ? 0 : density === 'normal' ? 2 : 5;
      const isNormal = density === 'normal';
      for (let i = 0; i < pSlots; i++) {
        const { side, n } = sideAndN(i, isNormal);
        const bx = berthX + side * n * spacing;
        if (bx < 8 || bx > WORLD.w - 8) continue;
        w.obstacles.push({type:'boat', x:bx, y:berthY, angle:-Math.PI/2, len: 10.5, beam: 3.6});
        w.obstacles.push({type:'pile', x: bx - 3.5, y: berthY + lm * 0.45});
        w.obstacles.push({type:'pile', x: bx + 3.5, y: berthY + lm * 0.45});
      }
      w.spawn = { x: WORLD.w/2, y: WORLD.h - 20, heading: -Math.PI/2 };
      break;
    }
    case 'mooring-ball': {
      w.walls.length = 0;
      const bx = WORLD.w / 2;
      const by = WORLD.h / 2 - 10;
      w.mooringBall = { x: bx, y: by };
      const windHeading = (cfg.winddir * Math.PI / 180) + Math.PI;
      const lm = (cfg.length || 40) * 0.3048;
      // shift target center so that the BOW (not center) aligns with the ball
      w.target = {
        type: 'mooring-ball',
        x: bx - Math.cos(windHeading) * lm / 2,
        y: by - Math.sin(windHeading) * lm / 2,
        angle: windHeading,
        tolerance: { pos: 4.0, angle: 0.50 },
      };
      const mbSlots = density === 'empty' ? 0 : density === 'normal' ? 2 : 5;
      for (let i = 0; i < mbSlots; i++) {
        const rx = 8 + Math.random() * (WORLD.w - 16);
        const ry = 20 + Math.random() * (WORLD.h - 40);
        if (Math.hypot(rx - bx, ry - by) < 15) continue;
        w.obstacles.push({type:'boat', x:rx, y:ry, angle: windHeading, len: 11, beam: 3.8, moored: true});
      }
      w.spawn = { x: WORLD.w/2 - 15, y: WORLD.h - 20, heading: -Math.PI/2 };
      break;
    }
  }

  // Outer water bounds
  w.bounds = { x1: 0, y1: 0, x2: WORLD.w, y2: WORLD.h };
  return w;
}

// Separating Axis Theorem test for two oriented bounding boxes
function obbOverlap(cx, cy, ch, cHL, cHB, ox, oy, oh, oHL, oHB) {
  const dx = ox - cx, dy = oy - cy;
  const c1 = Math.cos(ch), s1 = Math.sin(ch);
  const c2 = Math.cos(oh), s2 = Math.sin(oh);
  for (const [ax, ay] of [[c1, s1], [-s1, c1], [c2, s2], [-s2, c2]]) {
    const sep = Math.abs(dx * ax + dy * ay);
    const pA = Math.abs(cHL * (c1*ax + s1*ay)) + Math.abs(cHB * (-s1*ax + c1*ay));
    const pB = Math.abs(oHL * (c2*ax + s2*ay)) + Math.abs(oHB * (-s2*ax + c2*ay));
    if (sep > pA + pB) return false;
  }
  return true;
}

// Axis-aligned overlap between boat (oriented rect) and obstacle shapes
export function checkCollisions(boat, world) {
  const hits = [];
  const bx = boat.x, by = boat.y, bh = boat.heading;
  const halfL = boat.lm/2, halfB = boat.beam/2;
  // Approximate boat as 4 corner points
  const ch = Math.cos(bh), sh = Math.sin(bh);
  const corners = [
    [ halfL,  halfB],
    [ halfL, -halfB],
    [-halfL, -halfB],
    [-halfL,  halfB],
  ].map(([lx, ly]) => [bx + lx*ch - ly*sh, by + lx*sh + ly*ch]);

  // No invisible side/bottom bounds — open water in all directions

  // Dock wall (top)
  for (const wall of world.walls) {
    for (const [cx, cy] of corners) {
      if (cx >= wall.x1 && cx <= wall.x2 && cy >= wall.y1 && cy <= wall.y2) {
        hits.push({type:'dock', nx: 0, ny: 1});
      }
    }
  }

  // Obstacles
  for (const ob of world.obstacles) {
    if (ob.type === 'boat') {
      const oAngle = ob.angle || 0;
      const oBeam  = ob.beam  || 3.5;
      if (obbOverlap(
          boat.x, boat.y, boat.heading, boat.lm / 2, boat.beam / 2,
          ob.x,   ob.y,   oAngle,       ob.len / 2,  oBeam / 2)) {
        const dx = boat.x - ob.x, dy = boat.y - ob.y;
        const d = Math.hypot(dx, dy) || 1;
        hits.push({type:'boat', nx: dx / d, ny: dy / d});
      }
    } else if (ob.type === 'pile') {
      for (const [cx, cy] of corners) {
        const dx = cx - ob.x;
        const dy = cy - ob.y;
        if (dx*dx + dy*dy < 0.8*0.8) {
          const d = Math.hypot(dx, dy) || 0.1;
          hits.push({type:'pile', nx: dx/d, ny: dy/d});
        }
      }
    }
  }
  return hits;
}

// Check if boat has reached the docking target.
// Success when ~80% of the hull is inside the zone — no pixel-perfect parking needed.
export function checkDocked(boat, world) {
  const t = world.target;
  if (!t) return false;
  const dx = boat.x - t.x;
  const dy = boat.y - t.y;
  const pos = Math.hypot(dx, dy);
  let angDiff = boat.heading - t.angle;
  while (angDiff > Math.PI)  angDiff -= Math.PI * 2;
  while (angDiff < -Math.PI) angDiff += Math.PI * 2;

  // Allow center to sit up to 20% of half-length outside the base zone
  // → guarantees ~80% of the hull overlaps the target area
  const posTol = t.tolerance.pos + boat.lm * 0.20;
  // Angle: base tolerance × 1.8 + small fixed buffer (~10°)
  const angTol = t.tolerance.angle * 1.8 + 0.17;
  // Speed: up to ~1 kn is still "slow enough" for a gentle moor
  const slow = boat.speedMs < 0.52;

  return pos < posTol && Math.abs(angDiff) < angTol && slow;
}
