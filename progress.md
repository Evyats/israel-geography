Original prompt: i want a game like web app, simple, for learning the cities locations in israel.

in that game a map of israel is shown that is segmented to the citied in israel - every city is bordered in its segment and colored in a different color than neighbours.

in every round - a name of a city will appear and the user will need to choose the segment of that city on the map.

the map is kinda interactive - can be enlarged using the mouse wheel, and can move it using the mouse.

there will be levels of diffuiculty to choose from before starting - easiest have only big cities, medium even more smaller settlements, hard maybe include everything.

there is a radio button before starting which ask if include palestinian parts or not (everything in Judea and Samaria and gaza).

whole app will be in the hebrew language.

## Work log
- Built a vanilla Hebrew RTL SPA with Leaflet map, pan/zoom, polygon click gameplay.
- Added game flow: settings, 10 rounds, immediate feedback, score, restart.
- Added static datasets and difficulty pools under data/.
- Added preprocessing script scripts/prepare_data.js for normalizing raw GeoJSON and generating outputs.

## TODOs
- Replace sample polygon dataset with full-resolution OSM/Overpass-derived municipal boundaries.
- Improve neighbor detection in prepare_data.js from bbox-touch to robust geometry topology.
- Add automated Playwright smoke script once environment has Playwright client/dependency ready.
- Consider optional hint mode for wrong answers.

## Suggestions for next agent
- Use an official/curated locality boundary source and rerun prepare_data.js.
- Add map label layer for better visual orientation in lower zoom levels.
- Add persistent best-score storage in localStorage.

- Replaced placeholder square geometries with real OSM boundary polygons for all 20 configured localities via scripts/fetch_real_boundaries.js.
- Regenerated data/localities_all.geojson and data/localities_no_wb_gaza.geojson from live OSM geometry fetch.
- Updated map coloring to deterministic per-city colors so neighboring segments are clearly distinguishable.

- Expanded city/town coverage from 20 to 62 real-boundary localities (excluding tiny settlements) via scripts/fetch_real_boundaries.js.
- levels.json is now regenerated automatically from population thresholds (easy>=180k, medium>=60k, hard=all fetched).
- Current dataset sizes: all=62, exclude WB/Gaza=55.

- Replaced manual locality fetch flow with bulk Overpass+Nominatim pipeline in scripts/fetch_real_boundaries.js.
- New generated dataset sizes: all=231, exclude WB/Gaza=188; levels easy=11, medium=29, hard=231.

- Rebuilt app with React + TypeScript + Vite + Tailwind + shadcn-style UI components, while preserving gameplay and map interactions.
- Migrated map/game logic into src/App.tsx with typed state, DSATUR+proximity coloring, and render_game_to_text/advanceTime hooks.
- Added frontend toolchain config (tailwind/postcss/vite/tsconfig) and moved runtime data serving to public/data.

- UI refresh pass:
  - Difficulty selector changed from radio list to a horizontal button row.
  - Territories option changed from radio group to a slider-style switch (shadcn switch).
  - City list toggle button moved into the difficulty card.
  - Added dark/light mode toggle in the header.
  - Updated visual theme to a blue-oriented palette for both light and dark modes.
  - Fixed corrupted Hebrew text rendering (mojibake) in `src/App.tsx` labels/messages.
- Added `src/components/ui/switch.tsx` and installed `@radix-ui/react-switch`.
- Validation:
  - `npm run build` passed.
  - Playwright client run executed (`output/web-game/shot-0.png`, `output/web-game/state-0.json`) and screenshot was manually reviewed.

- Typography update:
  - Switched app typography to Hebrew-friendly fonts (`Heebo`, `Assistant`) in `src/index.css` and Tailwind `fontFamily.sans`.
  - Fixed page title encoding in `index.html` to proper Hebrew text.
  - Re-ran build + Playwright screenshot check.

- Motion animation pass:
  - Added `motion` library and integrated `motion/react` in `src/App.tsx`.
  - Implemented multiple animation types:
    - Page/panel entrance fades and vertical transitions.
    - Staggered card appearance.
    - Hover/tap micro-interactions for key controls.
    - Animated question/target and feedback transitions with `AnimatePresence`.
    - Animated city-list open/close and list-item stagger reveal.
    - Subtle floating pin icon animation in the header.
  - Validation:
    - `npm run build` passed after changes.
    - Playwright screenshot/state check rerun (`output/web-game/shot-0.png`, `output/web-game/state-0.json`).

- UI refinements pass:
  - Default theme now starts in light mode (`isDarkMode` default set to `false`).
  - Difficulty controls redesigned:
    - Horizontally centered, rounder pill-style buttons.
    - Per-selected difficulty city count moved next to the active button label as an animated badge.
    - Removed the separate count container below the button row.
  - City list converted from inline panel to animated popup modal overlay with backdrop click and `Esc` close support.
  - Added deterministic selector id `#city-list-toggle-btn` for automated UI checks.
  - Validation:
    - `npm run build` passed.
    - Playwright check confirmed popup opens (`output/web-game/shot-0.png` reviewed).

- In-game flow/UI pass:
  - Added explicit active play mode (`isPlaying`) to hide setup controls (difficulty + territories + city-list settings) once gameplay starts.
  - Added `עצור משחק` action during active rounds; it resets session state back to idle setup state.
  - Upgraded round indicator from plain `X/10` to visual progress card:
    - percent label,
    - animated progress bar,
    - textual round summary (`סיבוב X מתוך 10`).
  - Restyled start button to be larger and more prominent (gradient, bigger height/text, stronger shadow).
  - Default header subtitle now changes based on mode (setup vs active game).
  - Validation:
    - `npm run build` passed.

- Gameplay + UX interaction pass:
  - Round flow now waits after answer until user clicks anywhere (no auto-advance).
  - Added delayed continue hint (appears after 5 seconds): "לחצו בכל מקום כדי להמשיך לסיבוב הבא".
  - Scoring now awards proximity-based points by geographic distance between selected and target city centers (exact match = 100).
  - Wrong answers now show two on-map labels: selected city and correct city.
  - Hover tooltip positioning adjusted (`direction: auto`, offset + CSS tweak) for better cursor alignment.
- City-list modal enhancement:
  - Added search input in popup.
  - Added fuzzy-ish similarity ranking while typing.
  - Best match is highlighted in the list and highlighted on the map with animated emphasis; map auto-focuses to it.
- Theme + motion polish:
  - Slower global theme color transition.
  - Dark/light toggle icon now animates vertically (new icon drops in from above, old exits downward).
- Reliability fix while implementing:
  - Repaired Hebrew text encoding corruption in `src/App.tsx` and `src/game/constants.ts`.
  - Build verification passed (`npm run build`).
- Refactor pass (single sweep, behavior-preserving):
  - Reworked app flow to explicit 3 left-panel screens only:
    - `home` (pre-game settings),
    - `play` (active round),
    - `end` (finished/stopped result with actions).
  - Stopped mixing UI conditions (`isPlaying` + `finished` checks); now left panel renders by `leftScreen` only.
  - Implemented end-screen actions:
    - `חזרה למסך הבית` resets to home,
    - `שחקו שוב עם אותן הגדרות` starts a new session with current settings.
  - Wired extracted components and reduced App responsibility:
    - map panel moved to `src/components/game/MapSection.tsx`,
    - setup panel moved to `src/components/game/SetupControls.tsx`,
    - city-list popup moved to `src/components/game/CityListModal.tsx`.
  - Removed duplicated helpers from `App.tsx` and switched to `src/game/utils.ts` imports (`normalizeIdList`, `randomPick`, `similarityScore`).
  - Kept search behavior strict (relevant matches only), best-match-first highlighting, and map focus behavior.
  - Fixed lint blocker by exporting only component from `src/components/ui/button.tsx`.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
- Deep modularization pass to reduce `App.tsx` size and centralize responsibilities:
  - Added `src/hooks/useGameData.ts` for dataset loading, difficulty pools, feature indexes, search state, and warning handling.
  - Added `src/hooks/useGameSession.ts` for session engine, round flow, scoring, feedback, and 3-screen game-state transitions.
  - Added `src/components/game/SidebarPanel.tsx` to encapsulate left-panel UI across `home|play|end` screens.
  - Kept map rendering in `src/components/game/MapSection.tsx` and city modal in `src/components/game/CityListModal.tsx`.
  - `src/App.tsx` is now an orchestrator only (wiring hooks + map + sidebar), reduced from ~638 lines to ~244 lines.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
