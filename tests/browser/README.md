# Local Chrome game sandbox

The harness imports the real `IntroScene` and `WorldScene` from source. It never imports production `main.ts`, edits production code, calls scene gameplay methods, or uses the hosted game. `window.sandboxGame` is declared only in `sandbox.ts`. Inspection helpers read the real Phaser scene; interactions use real canvas mouse/touch events and keyboard input.

## Setup and run (PowerShell, repository root)

```powershell
npm install --prefix outputs/browser-deps playwright --no-save --package-lock=false
node --test tests/browser/fixtures.check.mjs
node tests/browser/run.mjs
```

Playwright is installed entirely under `outputs/browser-deps`; the repository package manifest and lockfile stay unchanged. No browser download is required. The runner uses installed Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`, a disposable browser profile and a fresh context per scenario. The browser route permits only loopback requests. Chromium's OS sandbox is not disabled.

In the managed Windows execution sandbox, run the Chrome command with approved loopback/network access (an escalated tool invocation). A restricted invocation was observed to fail with `ERR_NETWORK_ACCESS_DENIED` even for `127.0.0.1`; the same command works with the required access.

Vite starts programmatically on an available loopback port and shuts down with Chrome. Reports, UI/state snapshots, failure details and screenshots go to `outputs/browser-sandbox/`. A failed scenario sets a nonzero exit code but does not suppress later independent scenarios. Vite transpiles source directly; a TypeScript check is separate:

```powershell
npx tsc --noEmit
```

Run selected cases, use another installed Chrome, or load Playwright from another installation:

```powershell
$env:SANDBOX_CASES = 'fresh,resume'  # default: intro,fresh,resume,feeding,cooldown
$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:PLAYWRIGHT_MODULE = 'C:/somewhere/node_modules/playwright/index.mjs'
$env:HEADED = '1'                  # optional; headless by default
node tests/browser/run.mjs
```

For a manually playable sandbox, run the existing Vite CLI and open its local `tests/browser/index.html` URL:

```powershell
npx vite --host 127.0.0.1
# http://127.0.0.1:5173/tests/browser/index.html
# ?auto=fresh or ?auto=resume starts immediately; otherwise use the header buttons.
```

The two start buttons exercise real `startFreshGame(localStorage)` or load the current sandbox-origin save. The test runner fixtures never reach a personal Chrome profile. Manual browsing uses that browser's storage for this local origin: use a temporary profile when preserving other localhost saves matters. WASD/arrows, E/Space, M, L and H are production controls; there is no substituted scene or fake rendering. The harness disables Phaser audio but leaves browser speech synthesis real.

## Scenarios

- `intro`: seed an owned-pet save, start fresh, touch-toggle voice when available, touch-skip intro and verify WorldScene starts and intro controls disappear. Intro shutdown failures are preserved rather than patched around.
- `fresh`: boot WorldScene directly with empty game storage; verify a chapter-one tutorial without companions, move with the keyboard, open map/notebook and close via real canvas buttons. This case is independent of intro so a shutdown regression cannot hide tutorial results.
- `resume`: restore chapter two, HQ position and xiezhi progress; reload and resume again without reseeding storage.
- `feeding`: touch the real pet, press the displayed feed label, verify food consumption, the 2→3 growth threshold and persisted progress, then close the panel via its canvas label.
- `cooldown`: discover a real seeded HQ fruit; create a legal localStorage checkpoint at that tile; click the fruit and the incorrect answer; verify persisted cooldown and blocked early retry; advance only `Date` past the deadline with Playwright's clock, retry correctly and verify the fruit is awarded before owning a pet. It does not wait 30 seconds or accelerate Phaser RAF/tweens.

These are fixture-backed runtime smoke tests, not a full six-act playthrough. Voice assertions cover enabling/disabling and skip cancellation usability; headless output does not prove audible Chinese playback or a Chinese voice installed on the target device. Current production changes can legitimately expose failing assumptions; failures are reported rather than bypassed.

## Exported helpers

`helpers.mjs` exports `canvasClientPoint`, `cameraPoint`, `setupFixture`, `clickCanvas`, `inspectScene`, `collectUiText`, `clickCanvasText`, `clickWorldPoint`, `clickQuizAnswer`, `waitForScene`, and `waitForWorld`. Canvas coordinates use the game's 1600×900 logical space and account for actual canvas bounds. UI collection walks nested visible Phaser Text objects and returns labels with positions. Quiz clicks find the two rendered answer labels and use the scene's randomized ordering; they do not assume fixed button coordinates. `waitForWorld(page, scene => condition)` evaluates a read-only predicate with bounded polling; do not mutate scene state inside it. `fixtures.mjs` exports storage-key constants and fresh/resume/cooldown fixture factories.

`pressGameplayKey(page, key, scene => condition, timeout?)` holds a real key down until the expected state appears, then always releases it. It is available for held movement and state-based control sequences. The fresh regression deliberately uses immediate `keyboard.press('m')` and `keyboard.press('l')`: production's key queue must preserve very quick presses even when keyup precedes the next game update. Map/notebook close tests click their rendered labels and follow the current control positions.

Screenshots are taken after font readiness. Gameplay waits poll actual state; there are no fixed long sleeps. Each context blocks nonlocal requests, preventing accidental production traffic. No request mocking, speech synthesis stubs, gameplay-method calls or production test hooks are installed.

## Full campaign and release regressions

- `node tests/browser/campaign.mjs`: starts with empty progress by default, walks/click-navigates the real original maps, interviews every required NPC, claims all six rewards after rules, checks unchanged position at each act switch, finale, 36 remaining fruits, and reload preservation. Require report `startAct: "1"` for a full-campaign claim. Optional `CAMPAIGN_START_ACT=3` and `CAMPAIGN_RESUME=1` are explicitly partial debugging runs.
- `node tests/browser/species-growth.mjs`: earned-campaign test fixtures, zero initial fruit; real 36 quiz pickups and 36 feed clicks, independent inventories, 3/6 growth textures and sizes, vertical animation and idle checks. Legal checkpoint placement between fruit cases is fixture setup, not a full traversal.
- `node tests/browser/production-mobile.mjs`: production index/main with no test hooks; 844×390 touch and 390×844 portrait. Starts/resumes via DOM buttons, operates joystick, ends NPC talk, opens/closes every mobile panel.
- `node tests/browser/hud-save-guards.mjs`: malformed third-act recovery, blocking hidden-world clicks behind opaque HUD, and sequential reward prerequisites.
- `node tests/browser/public-smoke.mjs`: after deployment, opens the real GitHub Pages URL in a clean browser, starts fresh, skips intro, verifies no pet and M/L/P/H panels. `GAME_PREVIEW_URL` can override the URL.

The production build excludes this harness; it contains no `sandboxGame` runtime export. Each script writes dated evidence under ignored `outputs/`.
