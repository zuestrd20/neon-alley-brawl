/** NEON ALLEY: Midnight Signal. Original deterministic arcade combat simulation. */
export const WORLD = Object.freeze({ width: 2400, height: 540, minY: 315, maxY: 485 });
export const STAGES = Object.freeze(['Afterglow Avenue', 'Switchyard Nine', 'Skyline Relay']);
export const DIFFICULTIES = Object.freeze({
  easy: { health: 160, damage: 0.68, enemyHealth: 0.82, speed: 0.88, attackers: 1, recovery: 13 },
  normal: { health: 130, damage: 1, enemyHealth: 1, speed: 1, attackers: 1, recovery: 9 },
  hard: { health: 110, damage: 1.2, enemyHealth: 1.2, speed: 1.1, attackers: 2, recovery: 5 },
});
const FOES = {
  thug: { hp: 42, speed: 92, damage: 9, range: 66, windup: 0.46, recovery: 1.15, points: 100 },
  runner: { hp: 31, speed: 148, damage: 8, range: 83, windup: 0.36, recovery: 1.15, points: 125 },
  brute: { hp: 84, speed: 63, damage: 16, range: 108, windup: 0.82, recovery: 1.75, points: 250 },
  boss: { hp: 300, speed: 86, damage: 19, range: 125, windup: 0.72, recovery: 1.65, points: 2000 },
};
const WAVES = [
  [['thug', 'thug'], ['thug', 'runner', 'thug'], ['brute', 'runner', 'thug']],
  [['runner', 'thug', 'runner'], ['brute', 'thug', 'runner'], ['brute', 'runner', 'thug', 'thug']],
  [['brute', 'runner', 'thug'], ['brute', 'runner', 'runner', 'thug'], ['boss', 'runner', 'thug']],
];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const approach = (v, target, speed) => v < target ? Math.min(target, v + speed) : Math.max(target, v - speed);
const buttons = ['left', 'right', 'up', 'down', 'punch', 'kick', 'jump', 'grab'];
function random(g) {
  let t = g.rng = (g.rng + 0x6D2B79F5) >>> 0;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function seedNumber(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  let n = 2166136261;
  for (const c of String(seed)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
function event(g, type, kind, data = {}) { g.events.push({ type, kind, ...data }); }
function effect(g, type, x, y, extra = {}) {
  g.effects.push({ type, x, y, z: 28, life: 0.32, maxLife: 0.32, ...extra });
}
function sound(g, kind, data = {}) { event(g, 'sound', kind, data); }
function entity(id, type, x, y, hp) {
  return { id, type, x, y, z: 0, vz: 0, vx: 0, vy: 0, hp, maxHp: hp, face: 1,
    state: 'idle', timer: 0, attack: null, dead: false, invuln: 0, stun: 0,
    flash: 0, cooldown: 0, deathTime: 0, walkTime: 0, thrownTime: 0, thrownHits: [] };
}

/** Create a completely independent run. All random choices derive solely from seed. */
export function createGame({ difficulty = 'normal', seed = 1 } = {}) {
  if (!Object.hasOwn(DIFFICULTIES, difficulty)) difficulty = 'normal';
  const tuning = DIFFICULTIES[difficulty];
  const player = { ...entity('player', 'player', 230, 407, tuning.health), name: 'RIN',
    speed: 224, chain: 0, chainTimer: 0, grabCooldown: 0, jumpCooldown: 0 };
  const g = { difficulty, seed, rng: seedNumber(seed), nextId: 1, tuning: { ...tuning }, world: { ...WORLD },
    player, enemies: [], pickups: [], effects: [], events: [], stage: 0, wave: 0,
    stageName: STAGES[0], waveTitle: 'Block 1 / 3', camera: 0,
    arena: { left: 0, right: 880 }, status: 'playing', score: 0, combo: 0,
    bestCombo: 0, comboTime: 0, kills: 0, time: 0, transition: 0,
    transitionKind: null, shake: 0, flash: 0, grabTarget: null,
    lastInput: Object.fromEntries(buttons.map(b => [b, false])), input: {}, tick: 0 };
  spawnWave(g);
  return g;
}

function spawnWave(g) {
  g.arena = { left: g.wave * 760, right: g.wave * 760 + 880 };
  g.stageName = STAGES[g.stage];
  g.waveTitle = g.stage === 2 && g.wave === 2 ? 'Final signal' : `Block ${g.wave + 1} / 3`;
  g.enemies = [];
  g.pickups = [];
  const p = g.player;
  p.x = clamp(p.x, g.arena.left + 135, g.arena.right - 135);
  p.y = clamp(p.y, WORLD.minY + 25, WORLD.maxY - 25);
  p.vx = 0;
  p.vy = 0;
  p.invuln = Math.max(p.invuln, 1.1);
  WAVES[g.stage][g.wave].forEach((type, i) => {
    const spec = FOES[type];
    const x = clamp(p.x + 290 + i * 94, g.arena.left + 65, g.arena.right - 50);
    const y = clamp(350 + (i % 3) * 53 + random(g) * 16, WORLD.minY + 18, WORLD.maxY - 18);
    const hp = Math.round(spec.hp * g.tuning.enemyHealth * (1 + g.stage * 0.055));
    const e = { ...entity(`enemy-${g.nextId++}`, type, x, y, hp), name: type === 'boss' ? 'THE RELAY' : type.toUpperCase(),
      speed: spec.speed * g.tuning.speed, cooldown: 0.5 + random(g) * 0.65,
      aiPhase: random(g) * Math.PI * 2, attacksMade: 0, points: spec.points, grabbedBy: null };
    e.face = -1;
    g.enemies.push(e);
  });
  sound(g, 'wave');
  event(g, 'wave', 'start', { stage: g.stage, wave: g.wave });
}

function attackSpec(kind, p) {
  if (kind === 'throw') return { kind, windup: 0.20, active: 0.20, end: 0.3, duration: 0.59, range: 76, lane: 40, damage: 38, knockback: 470, stun: 0.85 };
  if (kind === 'jumpkick') return { kind, windup: 0.07, active: 0.07, end: 0.30, duration: 0.44, range: 101, lane: 40, damage: 28, knockback: 190, stun: 0.55 };
  if (kind === 'kick') return { kind, windup: 0.13, active: 0.13, end: 0.24, duration: 0.48, range: 94, lane: 35, damage: 24, knockback: 150, stun: 0.5 };
  const n = p.chain;
  return { kind: n === 3 ? 'finisher' : 'punch', step: n, windup: n === 3 ? 0.13 : 0.065,
    active: n === 3 ? 0.13 : 0.065, end: n === 3 ? 0.26 : 0.15,
    duration: n === 3 ? 0.39 : 0.26, range: n === 3 ? 86 : 72, lane: 34,
    damage: n === 3 ? 25 : n === 2 ? 17 : 14, knockback: n === 3 ? 190 : 37, stun: n === 3 ? 0.62 : 0.39 };
}
function beginPlayerAttack(g, kind, target = null) {
  const p = g.player;
  if (kind === 'punch') {
    p.chain = p.chainTimer > 0 ? p.chain % 3 + 1 : 1;
    p.chainTimer = 0.85;
  } else p.chain = 0;
  if (!g.input.left && !g.input.right) {
    const aim = target || g.enemies.filter(e => !e.dead && Math.abs(e.y - p.y) < 43 && Math.abs(e.x - p.x) < 130)
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (aim) p.face = aim.x < p.x ? -1 : 1;
  }
  p.attack = { ...attackSpec(kind, p), time: 0, hitIds: [], face: p.face, grabId: target?.id ?? null };
  p.state = 'attack';
  p.timer = p.attack.duration;
  if (target) {
    target.attack = null;
    target.grabbedBy = p.id;
    target.stun = 0.7;
    target.state = 'hurt';
    p.invuln = Math.max(p.invuln, 0.48);
  }
  sound(g, kind === 'jumpkick' ? 'kick' : kind, { x: p.x, y: p.y });
}
function canReach(attacker, target, attack) {
  const dx = target.x - attacker.x;
  return Math.abs(target.y - attacker.y) <= attack.lane && dx * attack.face >= -23 && Math.abs(dx) <= attack.range;
}
function addCombo(g) {
  g.combo += 1;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  g.comboTime = 2.6;
}
function hitEnemy(g, e, damage, knockback, stun, face, source = 'hit') {
  if (e.dead) return;
  e.hp = Math.max(0, e.hp - damage);
  e.flash = 0.13;
  // Heavy boss windups resist light strikes; a finisher, air kick or throw interrupts.
  const armored = e.type === 'boss' && e.attack && e.attack.time > 0.12 &&
    !['finisher', 'jumpkick', 'throw'].includes(source);
  e.stun = armored ? 0 : stun * (e.type === 'boss' ? 0.65 : 1);
  e.vx = face * knockback * (armored ? 0.1 : 1);
  e.grabbedBy = null;
  if (!armored) { e.attack = null; e.state = 'hurt'; e.timer = e.stun; }
  e.cooldown = Math.max(e.cooldown, e.stun + 0.25);
  addCombo(g);
  g.score += Math.round(damage * (1 + Math.min(g.combo, 20) * 0.025));
  g.shake = Math.max(g.shake, knockback > 140 ? 6 : 3);
  effect(g, 'hit', e.x, e.y, { z: e.z + 34, color: source === 'throw' ? '#ffd27a' : '#9bfff0' });
  if (g.combo % 5 === 0) effect(g, 'text', e.x, e.y - 20, { text: `${g.combo} HIT`, color: '#f6ce65', life: 0.8, maxLife: 0.8 });
  event(g, 'hit', source, { target: e.id, x: e.x, y: e.y, damage, combo: g.combo });
  sound(g, 'hit');
  if (e.hp === 0) {
    e.dead = true;
    e.attack = null;
    e.state = 'down';
    e.deathTime = 1.1;
    e.stun = 0;
    e.vx = face * Math.max(knockback, 110);
    e.vz = Math.max(e.vz, 180);
    g.kills += 1;
    g.score += e.points;
    sound(g, 'ko');
    event(g, 'defeat', e.type, { target: e.id, x: e.x, y: e.y });
    if (e.type !== 'boss' && (g.kills % 3 === 0 || e.type === 'brute')) {
      g.pickups.push({ id: `pickup-${g.nextId++}`, type: 'health', x: e.x, y: e.y, z: 0, amount: 23, timer: 20 });
    }
  }
}
function hitPlayer(g, e, a) {
  const p = g.player;
  if (p.dead || p.invuln > 0 || p.z > 25) return;
  const damage = Math.round(a.damage * g.tuning.damage);
  p.hp = Math.max(0, p.hp - damage);
  p.flash = 0.18;
  p.invuln = 0.82;
  p.stun = a.kind === 'slam' ? 0.4 : 0.27;
  p.state = 'hurt';
  p.timer = p.stun;
  if (p.attack?.grabId) {
    const held = g.enemies.find(target => target.id === p.attack.grabId);
    if (held) held.grabbedBy = null;
  }
  p.attack = null;
  p.vx = a.face * (a.kind === 'slam' ? 190 : 95);
  g.combo = 0;
  g.comboTime = 0;
  g.shake = 7;
  effect(g, 'hit', p.x, p.y, { z: 35, color: '#ff6986' });
  sound(g, 'hurt');
  event(g, 'hit', 'player', { target: p.id, x: p.x, y: p.y, damage });
  if (p.hp === 0) {
    p.dead = true;
    p.state = 'down';
    p.vz = 190;
    p.deathTime = 1;
    g.status = 'lost';
    g.transition = 0;
    g.transitionKind = null;
    sound(g, 'lose');
    event(g, 'gameover', 'lost');
  }
}
function resolvePlayerAttack(g, a, oldTime) {
  const p = g.player;
  if (a.time < a.active || oldTime > a.end) return;
  if (a.kind === 'throw') {
    const e = g.enemies.find(target => target.id === a.grabId);
    if (e && !a.hitIds.includes(e.id)) {
      a.hitIds.push(e.id);
      e.x = p.x + a.face * 43;
      e.y = p.y;
      e.z = 30;
      e.vz = 270;
      e.thrownTime = 0.65;
      e.thrownHits = [];
      hitEnemy(g, e, a.damage, a.knockback, a.stun, a.face, 'throw');
      sound(g, 'throw');
    }
    return;
  }
  for (const e of g.enemies) {
    if (e.dead || e.grabbedBy || a.hitIds.includes(e.id) || e.z > 100 || !canReach(p, e, a)) continue;
    a.hitIds.push(e.id);
    hitEnemy(g, e, a.damage, a.knockback, a.stun, a.face, a.kind);
  }
}
function movePhysics(g, e, dt) {
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.vx = approach(e.vx, 0, dt * 720);
  e.vy = approach(e.vy, 0, dt * 600);
  if (e.z > 0 || e.vz > 0) {
    e.vz -= 1220 * dt;
    e.z += e.vz * dt;
    if (e.z <= 0) {
      e.z = 0;
      e.vz = 0;
      if (!e.dead) effect(g, 'dust', e.x, e.y, { z: 1, life: 0.22, maxLife: 0.22 });
    }
  }
  e.x = clamp(e.x, g.arena.left + 24, g.arena.right - 24);
  e.y = clamp(e.y, WORLD.minY, WORLD.maxY);
}
function tickTimers(e, dt) {
  for (const key of ['invuln', 'stun', 'flash', 'cooldown', 'timer', 'deathTime', 'thrownTime']) e[key] = Math.max(0, e[key] - dt);
}
function updatePlayer(g, dt, pressed) {
  const p = g.player;
  tickTimers(p, dt);
  p.chainTimer = Math.max(0, p.chainTimer - dt);
  p.grabCooldown = Math.max(0, p.grabCooldown - dt);
  p.jumpCooldown = Math.max(0, p.jumpCooldown - dt);
  if (p.stun <= 0 && !p.dead) {
    const i = g.input;
    let mx = Number(i.right) - Number(i.left);
    let my = Number(i.down) - Number(i.up);
    const norm = Math.hypot(mx, my) || 1;
    mx /= norm;
    my /= norm;
    if (!p.attack && mx) p.face = Math.sign(mx);
    if (pressed.jump && p.z === 0 && p.jumpCooldown === 0 && !p.attack) {
      p.vz = 470;
      p.z = 1;
      p.jumpCooldown = 0.32;
      sound(g, 'jump');
      effect(g, 'dust', p.x, p.y, { z: 1 });
    }
    if (!p.attack) {
      const target = g.enemies.find(e => !e.dead && !e.grabbedBy && e.stun > 0 && e.z < 15 &&
        Math.abs(e.x - p.x) < 69 && Math.abs(e.y - p.y) < 39);
      if (pressed.grab && p.z === 0 && p.grabCooldown === 0) {
        p.grabCooldown = 0.35;
        if (target) beginPlayerAttack(g, 'throw', target);
        else effect(g, 'text', p.x, p.y - 20, { text: 'STUN + GET CLOSE', color: '#d0d5e7', life: 0.65, maxLife: 0.65 });
      }
      if (!p.attack && i.kick) beginPlayerAttack(g, p.z > 0 ? 'jumpkick' : 'kick');
      else if (!p.attack && i.punch) beginPlayerAttack(g, p.z > 0 ? 'jumpkick' : 'punch');
    }
    const moveScale = p.attack ? (p.attack.kind === 'throw' ? 0 : p.z > 0 ? 0.7 : 0.28) : 1;
    p.x += mx * p.speed * moveScale * dt;
    p.y += my * p.speed * 0.69 * moveScale * dt;
    if (mx || my) p.walkTime += dt * p.speed * moveScale / 30;
    if (!p.attack) p.state = p.z > 0 ? 'jump' : mx || my ? 'walk' : 'idle';
  }
  if (p.attack) {
    const a = p.attack;
    const old = a.time;
    a.time += dt;
    p.face = a.face;
    if (a.grabId && a.time < a.active) {
      const held = g.enemies.find(e => e.id === a.grabId);
      if (held && !held.dead) { held.x = p.x + p.face * 32; held.y = p.y; held.z = 16; }
    }
    resolvePlayerAttack(g, a, old);
    if (a.time >= a.duration) {
      p.attack = null;
      p.state = p.z > 0 ? 'jump' : 'idle';
    }
  }
  movePhysics(g, p, dt);
}
function beginEnemyAttack(g, e) {
  const spec = FOES[e.type];
  e.face = g.player.x < e.x ? -1 : 1;
  e.attacksMade += 1;
  const charge = e.type === 'runner' || e.type === 'boss' && e.attacksMade % 3 === 0;
  const slam = e.type === 'brute' || e.type === 'boss' && !charge;
  const enraged = e.type === 'boss' && e.hp < e.maxHp * 0.5;
  e.enraged = enraged;
  const windup = (charge && e.type === 'boss' ? 0.9 : spec.windup) * (enraged ? 0.83 : 1);
  e.attack = { kind: charge ? 'charge' : slam ? 'slam' : 'punch', time: 0, windup,
    active: windup, end: windup + (charge ? 0.25 : 0.13), duration: windup + (charge ? 0.58 : 0.42),
    range: spec.range, lane: slam ? 48 : 34, damage: spec.damage, face: e.face, hitIds: [],
    dashSpeed: charge ? e.type === 'boss' ? 340 : 210 : 0 };
  e.state = 'windup';
  e.timer = e.attack.duration;
  sound(g, 'windup', { enemyType: e.type });
  event(g, 'cue', e.attack.kind, { target: e.id, x: e.x, y: e.y, duration: windup });
}
function updateEnemy(g, e, dt) {
  tickTimers(e, dt);
  if (e.grabbedBy) return;
  movePhysics(g, e, dt);
  if (e.thrownTime > 0) {
    for (const target of g.enemies) {
      if (target === e || target.dead || e.thrownHits.includes(target.id)) continue;
      if (Math.abs(target.x - e.x) < 43 && Math.abs(target.y - e.y) < 37) {
        e.thrownHits.push(target.id);
        hitEnemy(g, target, 24, 220, 0.6, Math.sign(e.vx) || e.face, 'throw');
      }
    }
  }
  if (e.dead) { e.state = 'down'; return; }
  if (e.stun > 0 || e.z > 12) { e.state = 'hurt'; return; }
  if (e.attack) {
    const a = e.attack;
    const old = a.time;
    a.time += dt;
    e.face = a.face;
    e.state = a.time < a.windup ? 'windup' : 'attack';
    if (a.time >= a.active && old <= a.end) {
      if (a.dashSpeed) e.x = clamp(e.x + a.face * a.dashSpeed * dt, g.arena.left + 24, g.arena.right - 24);
      if (!a.hitIds.includes('player') && canReach(e, g.player, a) && g.player.z <= 25 && g.player.invuln <= 0) {
        a.hitIds.push('player');
        hitPlayer(g, e, a);
      }
    }
    if (a.time >= a.duration) {
      e.attack = null;
      e.cooldown = FOES[e.type].recovery + random(g) * 0.6;
      e.state = 'idle';
    }
    return;
  }
  const p = g.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  e.face = dx < 0 ? -1 : 1;
  const attacking = g.enemies.filter(other => other !== e && !other.dead && other.attack).length;
  const canAttack = attacking < g.tuning.attackers;
  const spec = FOES[e.type];
  if (canAttack && e.cooldown <= 0 && Math.abs(dx) < spec.range - 10 && Math.abs(dy) < 28) {
    beginEnemyAttack(g, e);
    return;
  }
  const desired = canAttack ? Math.max(40, spec.range - 23) : 135 + (e.type === 'brute' ? 25 : 0);
  const targetY = canAttack ? p.y : clamp(p.y + Math.sin(g.time * 1.2 + e.aiPhase) * 54, WORLD.minY + 10, WORLD.maxY - 10);
  const mx = Math.abs(dx) > desired + 5 ? Math.sign(dx) : Math.abs(dx) < 35 ? -Math.sign(dx || 1) : 0;
  const my = Math.abs(targetY - e.y) > 6 ? Math.sign(targetY - e.y) : 0;
  const len = Math.hypot(mx, my) || 1;
  const recoveryScale = e.cooldown > 0 ? 0.72 : 1;
  e.x += mx / len * e.speed * recoveryScale * dt;
  e.y += my / len * e.speed * 0.67 * recoveryScale * dt;
  e.x = clamp(e.x, g.arena.left + 24, g.arena.right - 24);
  e.y = clamp(e.y, WORLD.minY, WORLD.maxY);
  e.state = mx || my ? 'walk' : 'idle';
  if (mx || my) e.walkTime += dt * e.speed / 30;
}
function separateEnemies(g, dt) {
  for (let i = 0; i < g.enemies.length; i++) {
    const a = g.enemies[i];
    if (a.dead || a.grabbedBy || a.attack || a.stun > 0) continue;
    for (let j = i + 1; j < g.enemies.length; j++) {
      const b = g.enemies[j];
      if (b.dead || b.grabbedBy || b.attack || b.stun > 0) continue;
      if (Math.abs(a.x - b.x) < 32 && Math.abs(a.y - b.y) < 21) {
        const direction = a.y <= b.y ? -1 : 1;
        a.y = clamp(a.y + direction * dt * 20, WORLD.minY, WORLD.maxY);
        b.y = clamp(b.y - direction * dt * 20, WORLD.minY, WORLD.maxY);
      }
    }
  }
}
function collectPickups(g, dt) {
  for (const p of g.pickups) {
    p.timer -= dt;
    if (Math.abs(p.x - g.player.x) < 38 && Math.abs(p.y - g.player.y) < 32 && g.player.z < 30) {
      const restored = Math.min(p.amount, g.player.maxHp - g.player.hp);
      g.player.hp += restored;
      g.score += 50;
      p.timer = 0;
      sound(g, 'pickup');
      event(g, 'pickup', 'health', { amount: restored });
      effect(g, 'text', p.x, p.y - 12, { text: restored ? `+${restored} HP` : '+50', color: '#8bffb8', life: 0.8, maxLife: 0.8 });
    }
  }
  g.pickups = g.pickups.filter(p => p.timer > 0);
}
function advance(g) {
  if (g.wave < 2) {
    g.wave += 1;
  } else if (g.stage < 2) {
    g.stage += 1;
    g.wave = 0;
    g.player.x = 230;
    g.player.y = 407;
    g.player.hp = Math.min(g.player.maxHp, g.player.hp + 35);
    g.camera = 0;
    sound(g, 'stage');
  } else {
    g.status = 'won';
    g.score += 3000 + Math.round(g.player.hp * 10);
    g.transitionKind = null;
    sound(g, 'win');
    event(g, 'gameover', 'won');
    return;
  }
  g.transitionKind = null;
  g.player.attack = null;
  g.player.stun = 0;
  g.player.z = 0;
  g.player.vz = 0;
  g.player.state = 'idle';
  spawnWave(g);
}
function step(g, dt, pressed) {
  g.time += dt;
  g.tick += 1;
  g.shake = Math.max(0, g.shake - dt * 25);
  g.flash = Math.max(0, g.flash - dt);
  g.comboTime = Math.max(0, g.comboTime - dt);
  if (g.comboTime === 0) g.combo = 0;
  g.effects = g.effects.filter(e => (e.life -= dt) > 0);
  if (g.transition > 0) {
    g.transition = Math.max(0, g.transition - dt);
    updatePlayer(g, dt, pressed);
    for (const e of g.enemies) updateEnemy(g, e, dt);
    collectPickups(g, dt);
    if (g.transition === 0) advance(g);
  } else {
    updatePlayer(g, dt, pressed);
    for (const e of g.enemies) {
      if (g.status !== 'playing') break;
      updateEnemy(g, e, dt);
    }
    separateEnemies(g, dt);
    collectPickups(g, dt);
    if (g.status === 'playing' && g.enemies.every(e => e.dead)) {
      g.transition = g.wave === 2 ? 2.5 : 1.6;
      g.transitionKind = g.stage === 2 && g.wave === 2 ? 'victory' : g.wave === 2 ? 'stage' : 'wave';
      g.player.hp = Math.min(g.player.maxHp, g.player.hp + g.tuning.recovery);
      g.score += 300;
      event(g, 'clear', g.transitionKind, { stage: g.stage, wave: g.wave });
      sound(g, 'clear');
    }
  }
  g.enemies = g.enemies.filter(e => !e.dead || e.deathTime > 0 || e.thrownTime > 0);
  g.grabTarget = g.enemies.find(e => !e.dead && e.stun > 0 && e.z < 15 && Math.abs(e.x - g.player.x) < 69 && Math.abs(e.y - g.player.y) < 39)?.id ?? null;
  const cameraTarget = clamp(g.player.x - 340, 0, WORLD.width - 960);
  g.camera += (cameraTarget - g.camera) * (1 - Math.exp(-dt * 7));
  g.camera = clamp(g.camera, 0, WORLD.width - 960);
}

/** Mutates and returns g. dt is seconds, capped at 1/15; no background catch-up. */
export function update(g, dt, input = {}) {
  g.events = [];
  if (g.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return g;
  const elapsed = Math.min(dt, 1 / 15);
  input = input && typeof input === 'object' ? input : {};
  g.input = Object.fromEntries(buttons.map(b => [b, Boolean(input[b])]));
  const pressed = Object.fromEntries(buttons.map(b => [b, g.input[b] && !g.lastInput[b]]));
  // Substeps avoid tunnelling and make capped browser-frame updates safe.
  const count = Math.ceil(elapsed / (1 / 60));
  const stepDt = elapsed / count;
  for (let i = 0; i < count && g.status === 'playing'; i++) {
    step(g, stepDt, i === 0 ? pressed : {});
  }
  g.lastInput = { ...g.input };
  return g;
}
