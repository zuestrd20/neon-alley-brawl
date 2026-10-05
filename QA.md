# Verification report

## Automated checks

`npm test`: **48 passing tests** (Node built-in test runner, no installed dependencies).

- 24 engine tests: seeded determinism; normalized movement and arena bounds; opposite directions; jump arc and press-edge behavior; attack timing and single-hit semantics; combo chain, lane/range checks, flying kick; stun-only grapple and thrown-body damage; AI windups/attack-slot limits and all enemy types; bounded health drops; all nine waves/stages; loss and terminal-state freezing; restart; dt caps; isolated configuration; boss interruption resistance.
- Complete runs using only ordinary controls, without editing gameplay state: all three difficulties × three seeds defeat all 28 foes and reach victory. This is an idealized automated controller, not a claim of human playthrough.
- 20 application/audio tests: actual app body and real engine under a small fake DOM, including physical-key alias overlap, keyboard/touch overlap, multitouch, pointer cancellation, pause/replay/title/blur/visibility input clearing, terminal overlays, storage denial, fixed-step clamping and sound-only event dispatch. Mocked WebAudio verifies node graphs, envelope and oscillator scheduling, mute/run gating, bounded catch-up and cleanup.
- 4 renderer tests: finite coordinates for all characters/states/stages/cameras, actual engine movement integration, reduced-motion camera-shake and flash suppression.
- JavaScript syntax checks pass for all shipped modules.

## Live browser verification

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
