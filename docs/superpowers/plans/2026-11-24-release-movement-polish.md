# Release movement and roads implementation plan

Goal: movement-directed facing, genuine front/back walking for the player and 18 companion forms, finer road collision/occlusion, and recoverable startup in the embedded browser.

User authorization: proceed independently, preserve maps and all NPC/portal coordinates; latest movement-facing request supersedes prior mouse-facing choice. No approval pause requested.

Architecture: retain Phaser/TypeScript and original map art. Separate foot collision polygons from visual roof overlap. A shared distance-based pose selector controls companions. New transparent front/back sprite atlases supplement approved side frames. Boot progress/error/retry must reflect actual stages rather than blame missing uploads after 15 seconds.

- [x] Make loading progress explicit, add retry/Canvas recovery; verify production-entry retry and Canvas mode. The original browser's exact stall cause remains unproven.
- [x] Replace pointer-facing with actual displacement facing; Chrome verifies mouse-only, opposite mouse, keyboard, click-route, touch and wall-slide behavior.
- [x] Add four-frame front/back player steps, anchor them to the existing idle art, and verify alternating boots in Chrome.
- [x] Add transparent front/back walking poses for all six spirits and three growth stages; verify 72 species/stage/direction cases and immediate idle-frame stop.
- [x] Trace Old Town building footprints separately from seven visual eave masks; retain the original district/map/portal/NPC coordinates; audit routes and old saves.
- [x] Browser automation: 19 movement cases, 72 four-way companion cases, all six fruit/quiz/feed/growth loops, six-act continuity, mobile, and boot recovery. Visual snapshot verifies the eave mask reaches 35% alpha while the road remains walkable.
- [ ] Final diff review, production build, commit/publish existing Pages, then verify deployed URL before handoff.
