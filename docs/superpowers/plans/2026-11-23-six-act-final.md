# Six-act continuous game Implementation Plan

**Goal:** Deliver tutorial + acts 1–6 with earned companions, persistent independent fruit inventories and real UI interactions.
**Architecture:** Keep existing Phaser WorldScene and every map/portal/NPC coordinate. Add data-driven late investigations and generalize six-species ownership, rewards, checkpoint and followers. Existing Acts1–3 retained. Optional browser Chinese narration in IntroScene.
**Tech Stack:** TypeScript, Phaser, Vite, Vitest; real browser sandbox checks.
**Spec:** User overnight request and original 后续五幕_情景与法律后果.md; all historical map/fruit/mobile constraints remain binding.

## Global Constraints
- No edits to world-data.ts, world-geometry.ts or terrain assets/portal coordinates.
- Tutorial initially has no companions; each companion requires its own completed act + explicit reward after rules.
- Six persistent fruits per species, 36 total; 3/6 feeds growing/guardian, wrong answer30s cooldown. Earlier fruit remains.
- No autowalk help: head arrow + dashed safe route, limited requests. All buttons touch/keyboard operable.
- Preserve act positions and old pets through fade transitions. Map unchanged.
- Finish main six-act cycle first; voice optional and skippable, unavailable voice must not block.

## Review Focus
- Fresh/continue/new game, interrupted rewards, refresh on final act.
- UI overlays block world clicks and close on touch without reopening.
- Later-act out-of-order NPCs explain next destination; evidence/quest updates immediate.
- Wrong quiz cooldown, independent inventories, six-species growth and idle animations.
- Real desktop and mobile canvas sizing, no fake buttons or character clipping.

## Tasks
- [x] Data: late-acts.ts acts4–6 stories/choices/rules, chapter-fruits.ts sixspecies36questions; TDD and existing NPC route validation.
- [x] Main integration: chapter union1..6, late progress save+resume, ordered conversations/objectives/notebook, laws→reward→next/finale; migrate existing state without losing pets.
- [x] Six companion render: preload existing sixspecies3stage images, unified follow positions/feet depth/idle/gait, own progress, click feed, no initial ownership.
- [x] Opening voice: speechSynthesis + fallback readable timing, voice switch/skip/Escape, cancellation clean.
- [x] Verification: full tests/build, terrain hash equality, real browser sandbox fresh tutorial→acts1–6 using actual buttons; sixspecies feed/evolution/cooldown and mobile overlays. Fix defects.
- [x] Review/publish: independent source review, correct important findings, deploy GitHub Pages, verify public page + deliver test report and open limitations.

## Decisions
- User requested autonomous overnight execution; no new design approval pause.
- Legal teaching retains conditional risk language; no automatically inferred convictions or unverified prison sentences.
