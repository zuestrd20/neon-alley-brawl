# NEON ALLEY: Midnight Signal / 午夜訊號

An original HTML5 pixel-art street brawler, built with vanilla JavaScript, Canvas 2D and Web Audio. Play as courier RIN and restore the neighborhood broadcast across Afterglow Avenue, Switchyard Nine and Skyline Relay.

**Play:** https://zuestrd20.github.io/neon-alley-brawl/

## Controls

- Arrow keys / WASD: move horizontally and between street lanes
- J: punch (hold to chain a three-hit combo)
- K: kick; K while jumping: flying kick
- Space: jump (release before the next jump)
- L: grapple and throw a nearby stunned enemy (release before next throw)
- P / Escape: pause / resume; M: mute
- On-screen directional and action buttons support simultaneous touch input.

Line up with an enemy vertically before attacking. Move away from red attack windups. Collect medical kits for health. Defeat each wave to advance automatically. Three difficulties change health, enemy speed/damage and recovery. A full run contains nine waves, four enemy archetypes and a final boss. Pause provides restart and title-menu actions; returning to the title allows difficulty changes. Leaving the tab automatically pauses and clears held input.

## Run and test

Serve this directory with any static HTTP server; no build tools, dependencies or API keys. Example: `python3 -m http.server 8080`, then open http://localhost:8080 in your own browser.

Node 20+ tests: `npm test`.

Deploy with GitHub Pages → Deploy from a branch → `main` → `/ (root)`. No custom workflow or OAuth workflow scope is needed.

## Architecture

- `engine.js`: seeded deterministic fixed-step simulation, combat, AI, drops and progression
- `render.js`: original procedural scenery, character placement and effects
- `sprites.js`: original 64×64 indexed character frames, cached pixel runs and exact 2× nearest-neighbor rendering. Five unique palettes/silhouettes, six-step walk cycles, windup/strike/recovery, cross/uppercut, kick/flying kick, throw, slam/charge, jump, held, hurt and downed poses. No borrowed sprites or smoothing.
- `app.js`: DOM overlays, keyboard/touch input, fixed timestep, pause and persistence
- `audio.js`: original synthesized melody and effects; starts only after user interaction
- `tests/`: deterministic engine and integration/audio tests

Best score and mute preference are stored locally when browser storage is available. No analytics, remote font, asset download, tracking or backend. Storage failure does not prevent play. Reduced-motion preference disables screen shake and flashes.

## Originality

The project takes general inspiration from classic belt-scrolling arcade games. All code, story, names, procedural art, melody and sound effects were created for this project. It includes no ROMs, extracted sprites, levels, characters, logos, dialogue or music from Double Dragon or another commercial game.

## Verification

See `QA.md` for exact automated and live-browser test coverage and limitations.
