/**
 * Headless application integration coverage, not a browser/visual/auditory test.
 * Runs the shipped app module body in a deliberately small fake DOM, using the
 * real engine, a no-op renderer and an observable audio stub. Separately runs
 * the real AudioSystem against a WebAudio scheduling mock. This verifies event
 * handling, state transitions, accessible labels and synthesis calls; it does
 * not establish layout, actual pointer capture, autoplay policy or sound quality.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createGame as engineCreate, update as engineUpdate } from '../engine.js';
import { AudioSystem } from '../audio.js';

const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

function makeApp({ storage = {}, storageThrows = false, afterUpdate = null } = {}) {
  const nodes = new Map(), games = [], updates = [], audioInstances = [], renders = [];
  let now = 1000, raf = null;
  class Element {
    constructor(tagName = 'DIV', attributes = '') {
      this.tagName = tagName.toUpperCase();
      this.attributes = Object.fromEntries([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
      this.hidden = /\bhidden\b/.test(attributes); this.disabled = /\bdisabled\b/.test(attributes);
      this.style = {}; this.dataset = {}; this.textContent = ''; this.listeners = new Map(); this.captures = new Set();
      this.value = this.attributes.value || '';
      const classes = new Set((this.attributes.class || '').split(/\s+/).filter(Boolean));
      this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) };
      for (const [k, v] of Object.entries(this.attributes)) if (k.startsWith('data-')) this.dataset[k.slice(5)] = v;
    }
    addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(fn); }
    dispatch(type, data = {}) {
      const e = { target: this, code: '', repeat: false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...data };
      for (const fn of this.listeners.get(type) || []) fn(e);
      return e;
    }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key] ?? null; }
    setPointerCapture(id) { this.captures.add(id); }
    releasePointerCapture(id) { this.captures.delete(id); }
    hasPointerCapture(id) { return this.captures.has(id); }
    focus() { document.activeElement = this; }
    click() { if (!this.disabled) this.onclick?.({ target: this }); }
    getContext() { return {}; }
  }
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) nodes.set(m[3], new Element(m[1], m[2]));
  const controls = [...html.matchAll(/<button\b([^>]*\bdata-control="[^"]+"[^>]*)>/gi)].map(m => new Element('button', m[1]));
  const healthMatch = html.match(/<div\b([^>]*\bclass="health-track"[^>]*)>/i);
  const health = new Element('div', healthMatch?.[1] || '');
  const document = new Element('document'), window = new Element('window');
  document.getElementById = id => { assert.ok(nodes.has(id), `App requested unknown element #${id}`); return nodes.get(id); };
  document.querySelectorAll = selector => selector === '[data-control]' ? controls : [];
  document.querySelector = selector => selector === '.health-track' ? health : null;
  nodes.get('difficulty').value = 'normal';
  class AppAudio {
    constructor() { this.muted = false; this.running = false; this.notes = 0; this.voices = 0; this.effects = []; this.ctx = null; audioInstances.push(this); }
    unlock() { this.ctx = { state: 'running' }; }
    setMuted(value) { this.muted = value; }
    setRunning(value) { this.running = value; }
    effect(kind) { this.effects.push(kind); }
    tick() {}
  }
  const store = new Map(Object.entries(storage));
  const sandbox = {
    document, window,
    performance: { now: () => now },
    requestAnimationFrame: callback => { raf = callback; },
    matchMedia: () => ({ matches: false }),
    localStorage: {
      getItem(key) { if (storageThrows) throw new Error('storage denied'); return store.get(key) ?? null; },
      setItem(key, value) { if (storageThrows) throw new Error('storage denied'); store.set(key, String(value)); },
    },
    AudioSystem: AppAudio,
    createGame(options) { const g = engineCreate(options); games.push(g); return g; },
    update(game, dt, input) { updates.push({ dt, input: { ...input } }); engineUpdate(game, dt, input); afterUpdate?.(game); },
    render(ctx, game, options) { renders.push({ game, options }); },
  };
  // Only imports are replaced; the application body and handlers run unchanged.
  vm.runInNewContext(appSource.replace(/^import[^\n]*\n/gm, ''), sandbox, { filename: 'app.js' });
  return {
    nodes, controls, document, window, health, games, updates, store, renders,
    get game() { return games.at(-1); }, get audio() { return audioInstances[0]; },
    get lastInput() { return updates.at(-1)?.input; },
    click(id) { nodes.get(id).click(); },
    key(type, code, options = {}) { return window.dispatch(type, { target: nodes.get('game'), code, ...options }); },
    pointer(control, type, pointerId) { return controls.find(b => b.dataset.control === control).dispatch(type, { pointerId }); },
    frame(delta = 20) { now += delta; assert.equal(typeof raf, 'function'); const callback = raf; raf = null; callback(now); },
  };
}

function assertNoHeldControls(app) {
  assert.ok(app.controls.every(b => !b.classList.contains('held')));
  app.frame();
  assert.deepEqual(app.lastInput, {});
}

test('title, selected difficulty, start and HUD use the real engine state', () => {
  const app = makeApp();
  assert.equal(app.nodes.get('game').dataset.state, 'title');
  assert.equal(app.nodes.get('pause').disabled, true);
  app.nodes.get('difficulty').value = 'easy';
  app.click('start');
  assert.equal(app.game.difficulty, 'easy');
  assert.equal(app.nodes.get('game').dataset.state, 'playing');
  assert.equal(app.nodes.get('overlay').hidden, true);
  assert.equal(app.nodes.get('pause').disabled, false);
  assert.equal(app.document.activeElement, app.nodes.get('game'));
  assert.equal(app.audio.running, true);
  assert.equal(app.nodes.get('hp').textContent, '160 / 160');
  assert.equal(app.health.getAttribute('aria-valuenow'), '160');
  assert.equal(app.health.getAttribute('aria-valuemax'), '160');
});

test('all advertised keyboard controls reach the engine and release cleanly', () => {
  const app = makeApp(); app.click('start');
  const mapping = { ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down', KeyJ:'punch', KeyK:'kick', Space:'jump', KeyL:'grab' };
  for (const [code, action] of Object.entries(mapping)) {
    assert.equal(app.key('keydown', code).defaultPrevented, true);
    app.frame(); assert.equal(app.lastInput[action], true, code);
    app.key('keyup', code); app.frame(); assert.equal(app.lastInput[action], undefined, code);
  }
  app.key('keydown', 'KeyJ', { target: { tagName: 'SELECT' } }); app.frame();
  assert.equal(app.lastInput.punch, undefined, 'typing/selecting does not attack');
});

test('overlapping keyboard aliases remain held until both physical keys release', () => {
  const app = makeApp(); app.click('start');
  app.key('keydown', 'KeyA'); app.key('keydown', 'ArrowLeft');
  app.key('keyup', 'KeyA'); app.frame();
  assert.equal(app.lastInput.left, true, 'ArrowLeft still held after releasing A');
  app.key('keyup', 'ArrowLeft'); app.frame();
  assert.equal(app.lastInput.left, undefined);
});

test('pause/resume clears keyboard and touch state without advancing the engine while paused', () => {
  const app = makeApp(); app.click('start');
  app.key('keydown', 'KeyJ'); app.pointer('right', 'pointerdown', 1); app.frame();
  app.key('keydown', 'KeyP');
  assert.equal(app.nodes.get('game').dataset.state, 'paused');
  assert.equal(app.nodes.get('overlay').hidden, false);
  assert.equal(app.nodes.get('resume').hidden, false);
  assert.equal(app.document.activeElement, app.nodes.get('resume'));
  assert.equal(app.audio.running, false);
  assert.match(app.nodes.get('pause').getAttribute('aria-label'), /繼續|恢復/);
  const count = app.updates.length; app.frame(100); assert.equal(app.updates.length, count);
  app.key('keydown', 'KeyP', { repeat: true });
  assert.equal(app.nodes.get('game').dataset.state, 'paused');
  app.click('resume');
  assert.equal(app.nodes.get('game').dataset.state, 'playing');
  assert.equal(app.audio.running, true);
  assertNoHeldControls(app);
});

test('window blur and hidden-document visibility changes auto-pause and clear input', () => {
  for (const cause of ['blur', 'hidden']) {
    const app = makeApp(); app.click('start');
    app.key('keydown', 'KeyK'); app.pointer('up', 'pointerdown', 9); app.frame();
    if (cause === 'blur') app.window.dispatch('blur');
    else { app.document.hidden = true; app.document.dispatch('visibilitychange'); }
    assert.equal(app.nodes.get('game').dataset.state, 'paused', cause);
    assert.equal(app.audio.running, false);
    app.document.hidden = false;
    app.document.dispatch('visibilitychange');
    assert.equal(app.nodes.get('game').dataset.state, 'paused', 'visibility does not resume automatically');
    app.click('resume'); assertNoHeldControls(app);
  }
});

test('touch supports simultaneous movement/attack and independent cancellation', () => {
  const app = makeApp(); app.click('start');
  assert.equal(app.pointer('left', 'pointerdown', 10).defaultPrevented, true);
  app.pointer('punch', 'pointerdown', 11); app.frame();
  assert.equal(app.lastInput.left, true); assert.equal(app.lastInput.punch, true);
  app.pointer('left', 'pointercancel', 10); app.frame();
  assert.equal(app.lastInput.left, undefined); assert.equal(app.lastInput.punch, true);
  app.pointer('punch', 'lostpointercapture', 11); app.frame();
  assert.deepEqual(app.lastInput, {});
  assert.ok(app.controls.every(b => !b.classList.contains('held')));
});

test('two pointers on one touch action retain the action until the last one releases', () => {
  const app = makeApp(); app.click('start');
  const button = app.controls.find(b => b.dataset.control === 'kick');
  app.pointer('kick', 'pointerdown', 21); app.pointer('kick', 'pointerdown', 22);
  app.pointer('kick', 'pointerup', 21); app.frame();
  assert.equal(app.lastInput.kick, true); assert.equal(button.classList.contains('held'), true);
  app.pointer('kick', 'pointercancel', 22); app.frame();
  assert.equal(app.lastInput.kick, undefined); assert.equal(button.classList.contains('held'), false);
});

test('replay and return-to-title reset held controls and run state', () => {
  const app = makeApp(); app.click('start');
  app.game.score = 400; const first = app.game;
  app.key('keydown', 'KeyJ'); app.pointer('left', 'pointerdown', 30);
  app.click('pause'); app.click('replay');
  assert.notEqual(app.game, first); assert.equal(app.game.score, 0); assertNoHeldControls(app);
  app.key('keydown', 'KeyK'); app.click('pause'); app.click('menu');
  assert.equal(app.nodes.get('game').dataset.state, 'title');
  assert.equal(app.nodes.get('intro').hidden, false); assert.equal(app.nodes.get('modal').hidden, true);
  assert.equal(app.nodes.get('pause').disabled, true); assert.equal(app.audio.running, false);
  assert.equal(app.document.activeElement, app.nodes.get('start'));
  app.pointer('punch', 'pointerdown', 31); app.click('start'); assertNoHeldControls(app);
});

test('win and loss terminal states show correct UI, stop music, save best and allow restart', () => {
  for (const outcome of ['won', 'lost']) {
    const app = makeApp({ storage: { 'neon-alley-best': '300' } }); app.click('start');
    app.game.score = 1234; app.game.bestCombo = 9; app.game.status = outcome;
    app.key('keydown', 'KeyJ'); app.pointer('kick', 'pointerdown', 40); app.frame();
    assert.equal(app.nodes.get('game').dataset.state, outcome);
    assert.equal(app.nodes.get('overlay').hidden, false); assert.equal(app.nodes.get('modal').hidden, false);
    assert.equal(app.nodes.get('resume').hidden, true); assert.equal(app.nodes.get('pause').disabled, true);
    assert.equal(app.document.activeElement, app.nodes.get('replay')); assert.equal(app.audio.running, false);
    assert.equal(app.store.get('neon-alley-best'), '1234');
    assert.match(app.nodes.get('modal-copy').textContent, /1234/);
    assert.match(app.nodes.get('status').textContent, outcome === 'won' ? /RESTORED/ : /LOST/);
    app.click('replay'); assert.equal(app.nodes.get('game').dataset.state, 'playing'); assertNoHeldControls(app);
  }
});

test('app forwards only explicit sound events to audio, without duplicate gameplay-event cues', () => {
  const app = makeApp({ afterUpdate(game) {
    game.events = [{ type: 'sound', kind: 'punch' }, { type: 'hit', kind: 'punch' }, { type: 'sound', kind: 'hit' }, { type: 'hit', kind: 'hit' }];
  } });
  app.click('start'); app.frame();
  assert.deepEqual(app.audio.effects, ['punch', 'hit']);
});

test('keyboard and touch can share one action without a released source canceling the other', () => {
  const app = makeApp(); app.click('start');
  app.key('keydown', 'KeyJ'); app.pointer('punch', 'pointerdown', 51);
  app.key('keyup', 'KeyJ'); app.frame(); assert.equal(app.lastInput.punch, true);
  app.key('keydown', 'KeyJ'); app.pointer('punch', 'pointerup', 51); app.frame(); assert.equal(app.lastInput.punch, true);
  app.key('keyup', 'KeyJ'); app.frame(); assert.equal(app.lastInput.punch, undefined);
});

test('long animation gaps are clamped and simulation advances only in fixed steps', () => {
  const app = makeApp(); app.click('start'); app.frame(10000);
  assert.ok(app.updates.length >= 1 && app.updates.length <= 6);
  assert.ok(app.updates.every(({ dt }) => dt === 1 / 60));
  assert.equal(app.renders.length, 1);
});

test('an existing higher best score survives a lower-scoring loss', () => {
  const app = makeApp({ storage: { 'neon-alley-best': '9000' } }); app.click('start');
  app.game.score = 300; app.game.status = 'lost'; app.frame();
  assert.equal(app.store.get('neon-alley-best'), '9000');
  assert.equal(app.nodes.get('best').textContent, 'BEST 009000');
});

test('help pauses an active run and sound toggle persists accessible state', () => {
  const app = makeApp({ storage: { 'neon-alley-muted': 'true' } });
  assert.equal(app.audio.muted, true); assert.equal(app.nodes.get('mute').getAttribute('aria-pressed'), 'true');
  app.click('mute'); assert.equal(app.audio.muted, false); assert.equal(app.store.get('neon-alley-muted'), 'false');
  app.click('start'); app.click('help');
  assert.equal(app.nodes.get('guide').hidden, false); assert.equal(app.nodes.get('help').getAttribute('aria-expanded'), 'true');
  assert.equal(app.nodes.get('game').dataset.state, 'paused');
  app.click('help'); assert.equal(app.nodes.get('guide').hidden, true);
});

test('denied localStorage does not prevent start, mute, or finishing', () => {
  const app = makeApp({ storageThrows: true });
  app.click('start'); app.click('mute'); app.game.status = 'won'; app.frame();
  assert.equal(app.nodes.get('game').dataset.state, 'won');
});

test('static markup provides language, controls, status, reduced-motion and touch defaults', () => {
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /<canvas[^>]*tabindex="0"[^>]*aria-label="[^"]+"/);
  assert.match(html, /id="status" role="status"/);
  assert.match(html, /class="health-track" role="progressbar"/);
  const app = makeApp();
  assert.deepEqual(app.controls.map(b => b.dataset.control).sort(), ['down','grab','jump','kick','left','punch','right','up']);
  assert.match(css, /touch-action:none/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /\[hidden\][^{]*\{display:none!important\}/);
});

function fakeAudioContext({ state = 'running' } = {}) {
  const contexts = [];
  class Param {
    constructor() { this.value = 0; this.calls = []; }
    setValueAtTime(value, at) { this.calls.push(['set', value, at]); this.value = value; }
    exponentialRampToValueAtTime(value, at) { this.calls.push(['ramp', value, at]); this.value = value; }
  }
  class Gain {
    constructor() { this.gain = new Param(); this.connections = []; this.disconnected = false; }
    connect(target) { this.connections.push(target); }
    disconnect() { this.disconnected = true; }
  }
  class Oscillator {
    constructor() { this.frequency = new Param(); this.connections = []; this.disconnected = false; }
    connect(target) { this.connections.push(target); }
    disconnect() { this.disconnected = true; }
    start(at) { this.startAt = at; }
    stop(at) { this.stopAt = at; }
    end() { this.onended?.(); }
  }
  class Context {
    constructor() { this.state = state; this.currentTime = 4; this.destination = {}; this.gains = []; this.oscillators = []; this.resumes = 0; contexts.push(this); }
    createGain() { const node = new Gain(); this.gains.push(node); return node; }
    createOscillator() { const node = new Oscillator(); this.oscillators.push(node); return node; }
    resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
  }
  return { Context, contexts };
}

function withAudioContext(factory, fn) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  const previousWebkit = Object.getOwnPropertyDescriptor(globalThis, 'webkitAudioContext');
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, writable: true, value: factory });
  Object.defineProperty(globalThis, 'webkitAudioContext', { configurable: true, writable: true, value: undefined });
  try { return fn(); } finally {
    if (previous) Object.defineProperty(globalThis, 'AudioContext', previous); else delete globalThis.AudioContext;
    if (previousWebkit) Object.defineProperty(globalThis, 'webkitAudioContext', previousWebkit); else delete globalThis.webkitAudioContext;
  }
}

test('WebAudio unlock is lazy, idempotent, resumes suspended context and honors mute', () => {
  const fake = fakeAudioContext({ state: 'suspended' });
  withAudioContext(fake.Context, () => {
    const audio = new AudioSystem(); assert.equal(fake.contexts.length, 0);
    audio.setMuted(true); audio.unlock(); audio.unlock();
    assert.equal(fake.contexts.length, 1); assert.equal(audio.ctx.resumes, 1);
    assert.equal(audio.master.gain.value, 0);
    assert.equal(audio.master.connections[0], audio.ctx.destination);
    audio.setMuted(false); assert.equal(audio.master.gain.calls.at(-1)[1], .18);
  });
});

test('WebAudio tone schedules bounded envelope, connects output and cleans ended voices', () => {
  const fake = fakeAudioContext();
  withAudioContext(fake.Context, () => {
    const audio = new AudioSystem(); audio.unlock(); audio.tone(440, .2, 'triangle', .15, 5);
    const osc = audio.ctx.oscillators[0], gain = audio.ctx.gains[1];
    assert.equal(osc.type, 'triangle'); assert.deepEqual(osc.frequency.calls, [['set', 440, 5]]);
    assert.equal(osc.startAt, 5); assert.equal(osc.stopAt, 5.22);
    assert.deepEqual(gain.gain.calls, [['set', .0001, 5], ['ramp', .15, 5.008], ['ramp', .0001, 5.2]]);
    assert.equal(osc.connections[0], gain); assert.equal(gain.connections[0], audio.master);
    assert.equal(audio.notes, 1); assert.equal(audio.voices, 1);
    osc.end(); assert.equal(audio.voices, 0); assert.equal(osc.disconnected, true); assert.equal(gain.disconnected, true);
  });
});

test('WebAudio music schedules notes only while running and unmuted, with bounded catch-up', () => {
  const fake = fakeAudioContext();
  withAudioContext(fake.Context, () => {
    const audio = new AudioSystem(); audio.unlock(); audio.tick(); assert.equal(audio.notes, 0);
    audio.setRunning(true); audio.tick(0); assert.ok(audio.notes >= 1); const initial = audio.notes;
    audio.tick(0); assert.equal(audio.notes, initial, 'no duplicate scheduling at same time');
    audio.setRunning(false); audio.ctx.currentTime += 10; audio.tick(0); assert.equal(audio.notes, initial);
    audio.setRunning(true); audio.setMuted(true); audio.tick(0); assert.equal(audio.notes, initial);
    audio.setMuted(false); audio.ctx.currentTime += 100; audio.tick(2);
    assert.ok(audio.notes > initial); assert.ok(audio.notes - initial <= 9, 'scheduler has finite catch-up guard');
    assert.ok(audio.ctx.oscillators.at(-1).startAt >= audio.ctx.currentTime);
  });
});

test('WebAudio supports all documented effects and ignores unknown effects or unavailable audio', () => {
  const fake = fakeAudioContext();
  withAudioContext(fake.Context, () => {
    const audio = new AudioSystem(); audio.unlock();
    for (const kind of ['punch','kick','hit','hurt','jump','throw','ko','pickup','wave','stage','win','lose']) audio.effect(kind);
    assert.equal(audio.notes, 12); audio.effect('not-an-effect'); assert.equal(audio.notes, 12);
    audio.setMuted(true); audio.effect('punch'); audio.tone(220); assert.equal(audio.notes, 12);
  });
  withAudioContext(undefined, () => { const audio = new AudioSystem(); audio.unlock(); audio.effect('punch'); audio.tick(); assert.equal(audio.notes, 0); });
  withAudioContext(class { constructor() { throw new Error('audio unavailable'); } }, () => { const audio = new AudioSystem(); assert.doesNotThrow(() => audio.unlock()); assert.equal(audio.ctx, null); });
});
