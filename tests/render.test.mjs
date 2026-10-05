import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, update } from '../engine.js';
import { render } from '../render.js';

function canvasRecorder() {
  const calls = [];
  let depth = 0;
  const values = {};
  const ctx = new Proxy(values, {
    get(target, key) {
      if (key in target) return target[key];
      return (...args) => {
        for (const n of args) if (typeof n === 'number') assert.ok(Number.isFinite(n), `${String(key)} received ${n}`);
        if (key === 'save') depth++;
        if (key === 'restore') { depth--; assert.ok(depth >= 0, 'unbalanced restore'); }
        calls.push([key, ...args]);
      };
    },
    set(target, key, value) {
      if (typeof value === 'number') assert.ok(Number.isFinite(value), `${String(key)} received ${value}`);
      target[key] = value;
      return true;
    },
  });
  return { ctx, calls, check: () => assert.equal(depth, 0, 'renderer must restore its canvas state') };
}

test('all entity types, string IDs, states, stages and camera positions render finite coordinates', () => {
  const g = createGame({ seed: 104 });
  const states = ['idle', 'walk', 'attack', 'windup', 'hurt', 'jump', 'down', 'dead'];
  g.enemies = ['thug', 'runner', 'brute', 'boss'].map((type, i) => ({ ...g.enemies[0], id: `enemy-${i + 100}`, type, x: 400 + i * 120, y: 350 + i * 35 }));
  g.effects = [
    { type: 'hit', x: 450, y: 390, z: 32, life: .2, maxLife: .32 },
    { type: 'dust', x: 430, y: 400, life: .1, maxLife: .2 },
    { type: 'text', x: 230, y: 350, text: '5 HIT', life: .5, maxLife: .8 },
    { type: 'shock', x: 480, y: 410, life: .2, maxLife: .5 },
  ];
  g.pickups = [{ type: 'health', x: 350, y: 415 }];
  for (const stage of [0, 1, 2]) for (const state of states) for (const reducedMotion of [false, true]) {
    g.stage = stage;
    g.time = 3.25;
    g.camera = stage * 760;
    g.arena = { left: stage * 760, right: stage * 760 + 880 };
    for (const [i, e] of [g.player, ...g.enemies].entries()) {
      e.state = state;
      e.x = g.camera + 220 + i * 120;
      e.z = state === 'jump' ? 40 : 0;
      e.dead = state === 'dead';
      e.stun = state === 'hurt' ? .4 : 0;
      e.attack = ['attack', 'windup'].includes(state) ? { kind: i % 2 ? 'punch' : 'kick', time: state === 'windup' ? .04 : .2, windup: .1, duration: .4 } : null;
    }
    const before = JSON.stringify(g);
    const recorder = canvasRecorder();
    render(recorder.ctx, g, { reducedMotion });
    recorder.check();
    assert.ok(recorder.calls.length > 1000, 'scene should contain complete canvas artwork');
    assert.equal(JSON.stringify(g), before, 'renderer must not mutate simulation state');
  }
});

test('moving engine simulation renders without NaN coordinates', () => {
  const g = createGame({ seed: 88 });
  for (let tick = 0; tick < 480; tick++) {
    update(g, 1 / 60, { right: tick < 240, left: tick >= 240, down: tick % 120 < 30, up: tick % 120 > 90, punch: tick % 15 === 0, kick: tick % 47 === 0, jump: tick % 99 === 0 });
    if (tick % 12 === 0) {
      const recorder = canvasRecorder();
      render(recorder.ctx, g);
      recorder.check();
    }
  }
});

test('reduced motion disables combat camera shake', () => {
  const g = createGame();
  g.time = 2.13;
  const translations = (shake, reducedMotion) => {
    g.shake = shake;
    const recorder = canvasRecorder();
    render(recorder.ctx, g, { reducedMotion });
    return recorder.calls.filter(call => call[0] === 'translate');
  };
  assert.deepEqual(translations(7, true), translations(0, true));
  assert.equal(translations(7, false).length, translations(0, false).length + 1, 'normal motion adds one whole-scene shake transform');
});

test('reduced motion disables hit flash overlays', () => {
  const g = createGame();
  g.enemies = [];
  const draw = (hurt, reducedMotion) => {
    g.player.state = hurt ? 'hurt' : 'idle';
    g.player.stun = hurt ? .5 : 0;
    const recorder = canvasRecorder();
    render(recorder.ctx, g, { reducedMotion });
    return recorder.calls;
  };
  assert.deepEqual(draw(true, true), draw(false, true));
  assert.notDeepEqual(draw(true, false), draw(false, false));
});
