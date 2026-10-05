import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, update, WORLD, STAGES, DIFFICULTIES } from '../engine.js';

const DT = 1 / 60;
function frames(g, n, input = {}) { for (let i = 0; i < n; i++) update(g, DT, typeof input === 'function' ? input(g, i) : input); return g; }
function isolated(difficulty = 'normal') {
  const g = createGame({ difficulty, seed: 16 });
  g.enemies = [g.enemies[0]];
  const e = g.enemies[0];
  e.x = g.player.x + 52;
  e.y = g.player.y;
  e.cooldown = 999;
  e.speed = 0;
  g.player.invuln = 0;
  return [g, e];
}
function killWave(g) { for (const e of g.enemies) { e.hp = 0; e.dead = true; e.deathTime = 0.1; } }
function finishWave(g) { killWave(g); frames(g, 165); }

// Every test creates its own mutable run; no timer, network or rendering required.
test('creation has complete, independent, seeded state', () => {
  const a = createGame({ seed: 'midnight' });
  const b = createGame({ seed: 'midnight' });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.enemies.map(e => e.y), createGame({ seed: 'daybreak' }).enemies.map(e => e.y));
  a.player.hp = 3;
  a.enemies[0].x = 50;
  assert.equal(b.player.hp, DIFFICULTIES.normal.health);
  assert.notEqual(b.enemies[0].x, 50);
  assert.equal(b.stage, 0);
  assert.equal(b.wave, 0);
  assert.equal(b.status, 'playing');
  assert.equal(b.stageName, STAGES[0]);
  assert.equal(b.player.name, 'RIN');
  assert.equal(createGame({ difficulty: 'invalid' }).difficulty, 'normal');
});

test('fixed input replay is deterministic for every gameplay state field', () => {
  const a = createGame({ seed: 729 });
  const b = createGame({ seed: 729 });
  const input = (_, i) => ({ right: i % 320 < 120, left: i % 320 > 260,
    up: i % 200 < 30, down: i % 200 > 170, punch: i % 90 < 60,
    kick: i % 90 >= 60, jump: i % 51 === 0, grab: i % 43 === 0 });
  frames(a, 2400, input);
  frames(b, 2400, input);
  assert.deepEqual(a, b);
});

test('movement uses normalized axes and respects arena and floor bounds', () => {
  const [g] = isolated();
  g.enemies[0].x = 850;
  frames(g, 600, { left: true, up: true });
  assert.equal(g.player.x, g.arena.left + 24);
  assert.equal(g.player.y, WORLD.minY);
  frames(g, 600, { right: true, down: true });
  assert.equal(g.player.x, g.arena.right - 24);
  assert.equal(g.player.y, WORLD.maxY);
  assert.ok(g.camera >= 0 && g.camera <= WORLD.width - 960);
  const [axis] = isolated();
  const [diag] = isolated();
  const x = axis.player.x;
  frames(axis, 10, { right: true });
  frames(diag, 10, { right: true, down: true });
  assert.ok(diag.player.x - x < axis.player.x - x);
});

test('opposing inputs cancel without invalid coordinates', () => {
  const [g] = isolated();
  const { x, y } = g.player;
  frames(g, 30, { left: true, right: true, up: true, down: true });
  assert.equal(g.player.x, x);
  assert.equal(g.player.y, y);
});

test('jump follows a bounded arc and requires release before the next jump', () => {
  const [g] = isolated();
  let apex = 0;
  for (let i = 0; i < 90; i++) { update(g, DT, { jump: true }); apex = Math.max(apex, g.player.z); }
  assert.ok(apex > 70 && apex < 110);
  assert.equal(g.player.z, 0);
  assert.equal(g.player.vz, 0);
  update(g, DT, {});
  update(g, DT, { jump: true });
  assert.ok(g.player.z > 0);
});

test('punch has windup and each swing damages a target only once', () => {
  const [g, e] = isolated();
  const hp = e.hp;
  update(g, DT, { punch: true });
  assert.equal(e.hp, hp);
  frames(g, 5, {});
  assert.equal(e.hp, hp - 14);
  frames(g, 9, {});
  assert.equal(e.hp, hp - 14);
  assert.equal(g.combo, 1);
});

test('held punch advances the three-hit chain and builds combo score', () => {
  const [g, e] = isolated();
  e.hp = e.maxHp = 1000;
  frames(g, 52, { punch: true });
  assert.ok(g.bestCombo >= 3);
  assert.ok(g.score > 0);
  assert.ok(e.hp <= 944, `expected jab, cross and finisher, got ${e.hp}`);
});

test('kicks have longer reach, lane checks prevent hitting a different depth', () => {
  const [punch, e1] = isolated();
  e1.x = punch.player.x + 86;
  frames(punch, 18, { punch: true });
  assert.equal(e1.hp, e1.maxHp);
  const [kick, e2] = isolated();
  e2.x = kick.player.x + 86;
  frames(kick, 18, { kick: true });
  assert.equal(e2.hp, e2.maxHp - 24);
  const [lane, e3] = isolated();
  e3.y = lane.player.y - 80;
  frames(lane, 18, { kick: true });
  assert.equal(e3.hp, e3.maxHp);
});

test('jump plus attack produces a stronger aerial kick', () => {
  const [g, e] = isolated();
  frames(g, 12, (_, i) => ({ jump: i === 0, kick: true }));
  assert.equal(g.player.attack.kind, 'jumpkick');
  assert.equal(e.hp, e.maxHp - 28);
  assert.ok(g.player.z > 40);
});

test('grab needs stun and proximity; a stunned enemy can be thrown', () => {
  const [g, e] = isolated();
  update(g, DT, { grab: true });
  assert.equal(g.player.attack, null);
  frames(g, 23, {});
  e.stun = 1;
  e.hp = e.maxHp = 100;
  update(g, DT, {});
  assert.equal(g.grabTarget, e.id);
  update(g, DT, { grab: true });
  assert.equal(g.player.attack.kind, 'throw');
  assert.equal(e.grabbedBy, 'player');
  frames(g, 14, {});
  assert.equal(e.hp, 62);
  assert.equal(e.grabbedBy, null);
  assert.ok(e.thrownTime > 0);
  assert.ok(e.z > 0);
  assert.ok(e.vx > 0);
});

test('a thrown body damages bystanders only once', () => {
  const [g, e] = isolated();
  const other = { ...createGame().enemies[1], id: 'bystander', x: g.player.x + 120, y: g.player.y,
    hp: 100, maxHp: 100, cooldown: 999, speed: 0, thrownHits: [] };
  g.enemies.push(other);
  e.stun = 2;
  e.hp = e.maxHp = 100;
  update(g, DT, { grab: true });
  frames(g, 25, {});
  assert.equal(other.hp, 76);
  assert.ok(e.thrownHits.includes('bystander'));
});

test('enemy announces windup before its damaging attack', () => {
  const [g, e] = isolated();
  e.cooldown = 0;
  const hp = g.player.hp;
  update(g, DT, {});
  assert.equal(e.state, 'windup');
  assert.ok(g.events.some(ev => ev.type === 'cue'));
  frames(g, 15);
  assert.equal(g.player.hp, hp);
  frames(g, 20);
  assert.ok(g.player.hp < hp);
  assert.ok(g.player.invuln > 0);
});

test('post-hit invulnerability prevents pile-on damage; jumping evades attacks', () => {
  const [g, e] = isolated();
  e.cooldown = 0;
  frames(g, 32);
  const hp = g.player.hp;
  frames(g, 15);
  assert.equal(g.player.hp, hp);
  const [air, foe] = isolated();
  foe.cooldown = 0;
  frames(air, 13);
  update(air, DT, { jump: true });
  frames(air, 25);
  assert.equal(air.player.hp, air.player.maxHp);
});

test('normal allows one simultaneous enemy attack, hard allows two', () => {
  for (const [difficulty, max] of [['normal', 1], ['hard', 2]]) {
    const g = createGame({ difficulty });
    for (const e of g.enemies) { e.x = g.player.x + 50; e.y = g.player.y; e.cooldown = 0; }
    update(g, DT);
    assert.equal(g.enemies.filter(e => e.attack).length, max);
  }
});

test('all AI types engage, with distinct health, reach, speed and telegraphs', () => {
  const g = createGame();
  finishWave(g); // runner wave
  const runner = g.enemies.find(e => e.type === 'runner');
  assert.ok(runner.speed > g.enemies.find(e => e.type === 'thug').speed);
  finishWave(g); // brute wave
  const brute = g.enemies.find(e => e.type === 'brute');
  assert.ok(brute.maxHp > 70);
  g.enemies = [brute];
  brute.x = g.player.x + 70; brute.y = g.player.y; brute.cooldown = 0;
  update(g, DT);
  assert.equal(brute.attack.kind, 'slam');
  assert.ok(brute.attack.windup > 0.7);
  while (!(g.stage === 2 && g.wave === 2)) finishWave(g);
  const boss = g.enemies.find(e => e.type === 'boss');
  assert.ok(boss && boss.hp > 300);
  g.enemies = [boss];
  boss.x = g.player.x + 70; boss.y = g.player.y; boss.cooldown = 0; boss.attacksMade = 2;
  update(g, DT);
  assert.equal(boss.attack.kind, 'charge');
  assert.ok(boss.attack.windup >= 0.9);
});

test('health pickups restore bounded health and disappear exactly once', () => {
  const [g] = isolated();
  g.player.hp = g.player.maxHp - 10;
  g.pickups.push({ id: 'health-test', type: 'health', x: g.player.x, y: g.player.y, amount: 23, timer: 20 });
  update(g, DT);
  assert.equal(g.player.hp, g.player.maxHp);
  assert.equal(g.pickups.length, 0);
  assert.equal(g.events.filter(ev => ev.type === 'pickup').length, 1);
  const score = g.score;
  update(g, DT);
  assert.equal(g.score, score);
  assert.equal(g.events.filter(ev => ev.type === 'pickup').length, 0);
});

test('KO awards score, marks death, and creates deterministic health drops', () => {
  const [g, e] = isolated();
  g.kills = 2;
  e.hp = 1;
  frames(g, 6, { punch: true });
  assert.equal(e.dead, true);
  assert.equal(e.hp, 0);
  assert.equal(g.kills, 3);
  assert.ok(g.score >= 100);
  assert.equal(g.pickups.length, 1);
  assert.ok(g.transition > 0);
  frames(g, 90);
  assert.equal(g.enemies.length, 0);
});

test('nine waves and three stages advance automatically through the final boss to victory', () => {
  const g = createGame();
  const visited = [];
  for (let i = 0; i < 9; i++) {
    visited.push([g.stage, g.wave]);
    if (i === 8) assert.ok(g.enemies.some(e => e.type === 'boss'));
    killWave(g);
    update(g, DT);
    assert.ok(g.transition > 0);
    assert.equal(g.status, 'playing');
    frames(g, 164);
    if (g.status === 'playing') {
      assert.equal(g.arena.left, g.wave * 760);
      assert.ok(g.player.x >= g.arena.left + 24);
    }
  }
  assert.deepEqual(visited, [[0,0], [0,1], [0,2], [1,0], [1,1], [1,2], [2,0], [2,1], [2,2]]);
  assert.equal(g.status, 'won');
  assert.ok(g.score >= 3000);
  assert.equal(g.stage, 2);
  assert.equal(g.wave, 2);
});

test('player death ends the game once and terminal runs remain frozen', () => {
  const [g, e] = isolated();
  g.player.hp = 1;
  e.cooldown = 0;
  frames(g, 40);
  assert.equal(g.status, 'lost');
  assert.equal(g.player.hp, 0);
  assert.equal(g.player.dead, true);
  const { time, score } = g;
  frames(g, 200, { right: true, punch: true });
  assert.equal(g.time, time);
  assert.equal(g.score, score);
  assert.equal(g.events.length, 0);
  const reset = createGame({ seed: g.seed });
  assert.equal(reset.status, 'playing');
  assert.equal(reset.player.hp, reset.player.maxHp);
  assert.equal(reset.time, 0);
  assert.equal(reset.score, 0);
  assert.equal(reset.stage, 0);
  assert.equal(reset.wave, 0);
});

test('dt cap prevents tab-resume catch-up and invalid deltas are harmless', () => {
  const a = createGame({ seed: 9 });
  const b = createGame({ seed: 9 });
  update(a, 100, { right: true });
  update(b, 1 / 15, { right: true });
  assert.deepEqual(a, b);
  assert.ok(Math.abs(a.time - 1 / 15) < 1e-12);
  const before = { x: a.player.x, time: a.time, tick: a.tick, hp: a.player.hp };
  for (const dt of [0, -1, NaN, Infinity, -Infinity, undefined]) update(a, dt, { punch: true });
  assert.deepEqual({ x: a.player.x, time: a.time, tick: a.tick, hp: a.player.hp }, before);
});

test('combo expires while attack chain and transient visual effects reset', () => {
  const [g, e] = isolated();
  frames(g, 7, { punch: true });
  assert.ok(g.combo > 0);
  e.x = 850;
  frames(g, 170);
  assert.equal(g.combo, 0);
  assert.equal(g.comboTime, 0);
  assert.equal(g.player.chainTimer, 0);
  assert.equal(g.effects.length, 0);
});

test('an input-only controller can finish all difficulties without editing the run', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    for (const seed of [1, 2, 3]) {
      const g = createGame({ difficulty, seed });
      for (let i = 0; i < 60 * 300 && g.status === 'playing'; i++) {
        const enemy = g.enemies.filter(e => !e.dead).sort((a, b) =>
          Math.hypot(a.x - g.player.x, a.y - g.player.y) - Math.hypot(b.x - g.player.x, b.y - g.player.y))[0];
        let input = {};
        if (enemy) {
          const dx = enemy.x - g.player.x;
          const dy = enemy.y - g.player.y;
          input = { left: dx < -50, right: dx > 50, up: dy < -10, down: dy > 10,
            kick: Math.abs(dx) < 100 && Math.abs(dy) < 30,
            jump: g.enemies.some(e => e.attack && e.attack.time > e.attack.windup - 0.26 && Math.abs(e.x - g.player.x) < 140) };
        }
        update(g, DT, input);
      }
      assert.equal(g.status, 'won', `${difficulty}, seed ${seed} could not finish`);
      assert.equal(g.kills, 28);
      const { time, score } = g;
      update(g, 1, { punch: true, right: true });
      assert.equal(g.time, time);
      assert.equal(g.score, score);
    }
  }
});

test('boss armor preserves committed windup against a light strike', () => {
  const g = createGame();
  while (!(g.stage === 2 && g.wave === 2)) finishWave(g);
  const boss = g.enemies.find(e => e.type === 'boss');
  g.enemies = [boss];
  boss.x = g.player.x + 55;
  boss.y = g.player.y;
  boss.cooldown = 0;
  g.player.invuln = 0;
  frames(g, 12);
  assert.ok(boss.attack && boss.attack.time > 0.12);
  frames(g, 6, { punch: true });
  assert.ok(boss.hp < boss.maxHp);
  assert.ok(boss.attack, 'a light hit should not erase a committed boss telegraph');
  assert.equal(boss.stun, 0);
});

test('per-run tuning is isolated and empty controls are accepted', () => {
  const a = createGame();
  const b = createGame();
  a.tuning.damage = 42;
  assert.equal(b.tuning.damage, 1);
  assert.doesNotThrow(() => update(b, DT, null));
  assert.doesNotThrow(() => update(b, DT));
});
