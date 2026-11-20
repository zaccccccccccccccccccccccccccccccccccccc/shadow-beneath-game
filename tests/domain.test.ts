import { describe, expect, it } from 'vitest';
import {
  captureEvent,
  classifyEvidence,
  createGameState,
  drainLamp,
} from '../src/game/domain';
import { actOneEvents } from '../src/game/case-data';
import { chooseFacing, hoverKeepsTarget, keyboardDirection, pointerFacing, resolveFacing } from '../src/game/input';
import { actOneLevel, constrainToWalkable, tutorialLevel } from '../src/game/level-data';
import { allowsPointerNavigation, canEnterActOne, prologueAutoAdvanceMs, prologueCards, sceneKeys } from '../src/game/scene-flow';
import { isClueRevealed } from '../src/game/discovery';
import { normalizePlayerName } from '../src/game/profile';
import { getJoystickVector, requiresLandscapePrompt } from '../src/game/mobile';
import { wrapCjkText } from '../src/game/text-layout';
import { findUiHitTarget, hitsButton, toGamePoint } from '../src/game/ui-hit-test';
import { companionSnackSpots } from '../src/game/world-data';

describe('investigation rules', () => {
  it('places each spirit snack across the map with a distinct attribute lesson', () => {
    expect(companionSnackSpots).toHaveLength(6);
    expect(new Set(companionSnackSpots.map((spot) => spot.spirit)).size).toBe(6);
    expect(companionSnackSpots.map((spot) => spot.lesson)).toEqual(expect.arrayContaining(['明辨曲直', '求证核实', '守住边界']));
  });

  it('restores lamp oil for a correct classification', () => {
    const state = captureEvent(createGameState({ lampOil: 40 }), 'soda-gift');
    const result = classifyEvidence(state, 'soda-gift', 'courtesy');

    expect(result.state.lampOil).toBe(55);
    expect(result.state.redLines).toBe(0);
    expect(result.outcome).toBe('correct');
  });

  it('adds a red line for an incorrect classification', () => {
    const state = captureEvent(createGameState({ lampOil: 80 }), 'student-card');
    const result = classifyEvidence(state, 'student-card', 'corruption');

    expect(result.state.lampOil).toBe(80);
    expect(result.state.redLines).toBe(1);
    expect(result.outcome).toBe('incorrect');
  });

  it('locks an event after it is captured', () => {
    const state = createGameState();
    const captured = captureEvent(state, 'student-card');

    expect(captured.phase).toBe('judge');
    expect(captured.capturedEventId).toBe('student-card');
    expect(captureEvent(captured, 'student-card')).toBe(captured);
  });

  it('enters replay when the lamp runs out', () => {
    const state = createGameState({ lampOil: 5 });
    const drained = drainLamp(state, 10);

    expect(drained.lampOil).toBe(0);
    expect(drained.phase).toBe('replay');
  });

  it('refuses evidence classification outside the judgement phase', () => {
    const state = createGameState();
    const result = classifyEvidence(state, 'soda-gift', 'courtesy');

    expect(result.outcome).toBe('ignored');
    expect(result.state).toBe(state);
  });

  it('maps WASD keys to top-down movement axes', () => {
    expect(keyboardDirection({ W: true, A: true, S: false, D: false })).toEqual({ x: -1, y: -1 });
    expect(keyboardDirection({ W: false, A: false, S: true, D: true })).toEqual({ x: 1, y: 1 });
  });

  it('uses dedicated art when moving left or right', () => {
    expect(chooseFacing({ x: -1, y: 0 }, 'back')).toBe('left');
    expect(chooseFacing({ x: 1, y: 0 }, 'back')).toBe('right');
    expect(chooseFacing({ x: 0, y: -1 }, 'right')).toBe('right');
  });

  it('uses mouse position to control facing without starting movement', () => {
    expect(pointerFacing({ x: 300, y: 550 }, { x: 600, y: 560 }, 'back')).toBe('right');
    expect(pointerFacing({ x: 600, y: 550 }, { x: 300, y: 560 }, 'back')).toBe('left');
  });

  it('keeps the click route unchanged while the pointer only hovers', () => {
    expect(hoverKeepsTarget({ x: 420, y: 540 })).toEqual({ x: 420, y: 540 });
  });

  it('gives held keyboard movement deterministic priority over mouse facing', () => {
    expect(resolveFacing({ x: -1, y: 0 }, { x: 1, y: 0 }, 'back')).toBe('left');
    expect(resolveFacing({ x: 0, y: 0 }, { x: 1, y: 0 }, 'back')).toBe('right');
  });
});

describe('act one event data', () => {
  it('contains one ordinary courtesy and one evidence event', () => {
    expect(actOneEvents.map((event) => event.id)).toEqual(['soda-gift', 'student-card']);
    expect(actOneEvents[0].correctClassification).toBe('courtesy');
    expect(actOneEvents[1].correctClassification).toBe('declaration');
  });

  it('frames the student-card case as academic-integrity misconduct, not corruption', () => {
    const studentCard = actOneEvents.find((event) => event.id === 'student-card');

    expect(studentCard?.caseCategory).toBe('academic-integrity');
    expect(studentCard?.correctConsequence).toContain('學術不誠實');
  });

  it('places each event on the visible courtyard route', () => {
    expect(actOneEvents.map((event) => [event.x, event.y])).toEqual([
      [420, 510],
      [1110, 485],
    ]);
  });
});

describe('level route data', () => {
  it('keeps each level spawn point inside its walkable route', () => {
    expect(constrainToWalkable(tutorialLevel.spawn, tutorialLevel)).toEqual(tutorialLevel.spawn);
    expect(constrainToWalkable(actOneLevel.spawn, actOneLevel)).toEqual(actOneLevel.spawn);
  });

  it('pushes a roof click back to the nearest act one route', () => {
    expect(constrainToWalkable({ x: 800, y: 250 }, actOneLevel)).toEqual({ x: 800, y: 462 });
  });

  it('links the teaching level into Act One', () => {
    expect(tutorialLevel.exit.targetScene).toBe('act-one');
    expect(tutorialLevel.id).toBe('tutorial');
  });

  it('starts at level zero and reserves the next chapter scene', () => {
    expect(sceneKeys).toEqual(['intro', 'tutorial', 'act-one', 'next-patch']);
  });

  it('automatically introduces the CCAC invitation before the tutorial', () => {
    expect(prologueCards).toHaveLength(5);
    expect(prologueAutoAdvanceMs).toBeGreaterThanOrEqual(1800);
    expect(prologueCards[0].speaker).toBe('蓉姐');
    expect(prologueCards[0].title).toContain('CCAC');
    expect(prologueCards.map((card) => card.actor)).toEqual(['rong-jie', 'player', 'rong-jie', 'player', 'rong-jie']);
  });

  it('keeps pointer navigation available throughout the tutorial', () => {
    expect(allowsPointerNavigation('move')).toBe(true);
    expect(allowsPointerNavigation('observe')).toBe(true);
    expect(allowsPointerNavigation('exit')).toBe(true);
  });

  it('lets the gate enter Act One at every tutorial stage', () => {
    expect(canEnterActOne('move')).toBe(true);
    expect(canEnterActOne('observe')).toBe(true);
    expect(canEnterActOne('exit')).toBe(true);
  });
});

describe('lantern discovery', () => {
  it('reveals a clue only after it enters the lantern radius', () => {
    expect(isClueRevealed({ x: 800, y: 560 }, { x: 900, y: 560 }, 120)).toBe(true);
    expect(isClueRevealed({ x: 800, y: 560 }, { x: 950, y: 560 }, 120)).toBe(false);
  });
});

describe('player profile', () => {
  it('keeps a readable player name and supplies a traditional-Chinese fallback', () => {
    expect(normalizePlayerName('  小明  ')).toBe('小明');
    expect(normalizePlayerName('')).toBe('見習生');
    expect(normalizePlayerName('這是一個太長太長太長的名字')).toHaveLength(12);
  });
});

describe('mobile layout', () => {
  it('asks touch users in portrait to rotate, but never blocks landscape play', () => {
    expect(requiresLandscapePrompt({ width: 390, height: 844, coarsePointer: true })).toBe(true);
    expect(requiresLandscapePrompt({ width: 844, height: 390, coarsePointer: true })).toBe(false);
    expect(requiresLandscapePrompt({ width: 390, height: 844, coarsePointer: false })).toBe(false);
  });
  it('keeps small stick motion slow and releases cleanly inside the dead zone', () => {
    expect(getJoystickVector(2, 2, 36)).toEqual({ x: 0, y: 0 });
    expect(getJoystickVector(18, 0, 36).x).toBeGreaterThan(0);
    expect(getJoystickVector(18, 0, 36).x).toBeLessThan(1);
    expect(getJoystickVector(60, 0, 36)).toEqual({ x: 1, y: 0 });
  });
  it('wraps long Chinese dialogue before it escapes the mobile panel', () => {
    expect(wrapCjkText('先记录事实，再向当事人逐一核实。', 6)).toBe('先记录事实，\n再向当事人逐\n一核实。');
  });
  it('maps a phone tap to the notebook and dialogue exit buttons', () => {
    const bounds = { left: 113, top: 0, width: 693, height: 390 };
    const notebook = toGamePoint(459.5, 312, bounds, 1600, 900);
    expect(hitsButton(notebook.x, notebook.y, 800, 720, 270, 88)).toBe(true);
    const dialogue = toGamePoint(706.4, 212.3, bounds, 1600, 900);
    expect(hitsButton(dialogue.x, dialogue.y, 1370, 490, 230, 88)).toBe(true);
  });
  it('dispatches a canvas tap to the topmost registered game button', () => {
    const targets = [
      { centerX: 800, centerY: 650, width: 300, height: 64, action: 'close-dialogue' },
      { centerX: 800, centerY: 650, width: 260, height: 56, action: 'continue-story' },
    ];
    expect(findUiHitTarget(800, 650, targets)).toBe('continue-story');
    expect(findUiHitTarget(1050, 650, targets)).toBeNull();
  });
});
