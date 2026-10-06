# Verification report

## Automated checks

`npm test`: **53 passing tests** (Node built-in test runner, no installed dependencies).

- 24 engine tests: seeded determinism; normalized movement and arena bounds; opposite directions; jump arc and press-edge behavior; attack timing and single-hit semantics; combo chain, lane/range checks, flying kick; stun-only grapple and thrown-body damage; AI windups/attack-slot limits and all enemy types; bounded health drops; all nine waves/stages; loss and terminal-state freezing; restart; dt caps; isolated configuration; boss interruption resistance.
- Complete runs using only ordinary controls, without editing gameplay state: all three difficulties × three seeds defeat all 28 foes and reach victory. This is an idealized automated controller, not a claim of human playthrough.
- 20 application/audio tests: actual app body and real engine under a small fake DOM, including physical-key alias overlap, keyboard/touch overlap, multitouch, pointer cancellation, pause/replay/title/blur/visibility input clearing, terminal overlays, storage denial, fixed-step clamping and sound-only event dispatch. Mocked WebAudio verifies node graphs, envelope and oscillator scheduling, mute/run gating, bounded catch-up and cleanup.
- 4 renderer tests: finite coordinates for all characters/states/stages/cameras, actual engine movement integration, reduced-motion camera-shake and flash suppression.
- 5 sprite tests: all five types and 36 action frames use bounded integer pixels; cached/discrete poses; actual attack timing; exact 2× horizontal mirrors; unique character palettes and safe type fallback.
- JavaScript syntax checks pass for all shipped modules.

## Pixel-character update verification (2026-10-06)

- Replaced vector-like immediate character drawing and fractional big-character scaling with original 64×64 indexed raster frames, displayed at exactly 2×. Reviewed a contact sheet containing all five types and representative poses. No sprite pixels touch the sheet edges in the checked attack/downed poses.
- The simulation (`engine.js`), controls, audio, HTML and CSS are unchanged. All 53 tests pass, including the input-only full runs on all difficulties.
- Published art commit `da9f386552592cf4e59a770f99b7edfd1ce5600e`: native Pages build/deploy run 37399372292 succeeded. Live sprites.js SHA-256 matches the tested local source.
- Public cloud Chromium: title/start, live animated combat using ordinary held J input, advancement to wave 3 with score 1409, pause/resume, restart and natural defeat verified. No game-origin runtime errors observed.
- Narrow layout and pause controls verified at 393 CSS px using Chrome zoom: body scroll width 388 px, canvas width 366.33 px. This is not a physical-phone touch test.
- Remaining limits below still apply.

## Original release live browser verification

Performed against the public HTTPS GitHub Pages deployment using the supported cloud Chromium browser, with real Canvas 2D rendering:

- Title artwork and scene render; start enters the game.
- Holding punch defeats the first enemy wave, score rises to 623 and wave 2 starts.
- Pause shows current stage/wave; restart returns to wave 1, score 0 and full health.
- An idle run reaches natural defeat at 0 HP and shows the loss menu; return to title works.
- WebAudio reports `running` after a user gesture, with 159 notes scheduled in the observed run. Audio was not listened to; subjective sound quality is not claimed.
- Narrow layout checked at 393 CSS px using normal Chrome zoom, with no horizontal page overflow. Narrow-screen start and pause buttons were exercised.
- No game-origin runtime errors observed; browser-extension metadata errors are outside the app.

## Scope and limits

The fake-DOM tests do not establish physical-device touch behavior or browser pointer-capture implementation. The narrow-screen check is browser zoom, not a physical phone test. Full victory is proven by input-only simulation; full manual victory was not claimed. Screen-reader operation and auditory quality were not assessed. The game is deliberately forgiving on casual/standard difficulty. No ROM or third-party game assets are included.

GitHub Pages uses native branch deployment from `main` at `/`, with `.nojekyll`; no custom Actions workflow or credential-scope changes.
