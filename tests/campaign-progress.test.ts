import { describe, it, expect } from 'vitest';
import { emptyLateProgress, normalizeLateProgress, completeLateStep, claimLateReward, isLateActComplete, LATE_SAVE_KEY } from '../src/game/campaign-progress';
import { GAME_SAVE_KEYS } from '../src/game/save-session';

describe('continuous late-act progress', () => {
  const steps = [{id:'quote',npcId:'developer'}, {id:'payment',npcId:'treasurer'}];
  it('starts with no completed steps or rewards and new game clears it', () => {
    expect(emptyLateProgress()).toEqual({completed:[], evidence:{}, rewardClaimed:false});
    expect(GAME_SAVE_KEYS).toContain(LATE_SAVE_KEY);
  });
  it('rejects skipped steps, records a choice once and grants a reward only after completion', () => {
    let p = emptyLateProgress();
    expect(completeLateStep(p, steps, 'treasurer', 'payment evidence')).toEqual(p);
    expect(claimLateReward(p, steps).rewardClaimed).toBe(false);
    p = completeLateStep(p, steps, 'developer', 'saved original quote');
    expect(completeLateStep(p, steps, 'developer', 'overwrite')).toEqual(p);
    p = completeLateStep(p, steps, 'treasurer', 'verified payment');
    expect(isLateActComplete(p, steps)).toBe(true);
    expect(claimLateReward(p, steps).rewardClaimed).toBe(true);
    expect(p.evidence).toEqual({quote:'saved original quote', payment:'verified payment'});
  });
  it('restores only the ordered prefix, with no unearned reward or forged future steps', () => {
    expect(normalizeLateProgress({completed:['payment'],rewardClaimed:true},steps)).toEqual(emptyLateProgress());
    const p = normalizeLateProgress({completed:['quote','payment','forged'], evidence:{quote:'original',payment:'receipt'},rewardClaimed:true},steps);
    expect(p.completed).toEqual(['quote','payment']);
    expect(p.rewardClaimed).toBe(true);
  });
});
