export const LATE_SAVE_KEY = 'under-shadow-late-acts-v1';
export interface LateProgress { completed: string[]; evidence: Record<string, string>; rewardClaimed: boolean }
interface Step { id: string; npcId: string }
export function emptyLateProgress(): LateProgress { return { completed: [], evidence: {}, rewardClaimed: false }; }
export function isLateActComplete(progress: LateProgress, steps: readonly Step[]): boolean {
  return steps.length > 0 && steps.every((s, i) => progress.completed[i] === s.id);
}
export function normalizeLateProgress(raw: unknown, steps: readonly Step[]): LateProgress {
  const result = emptyLateProgress();
  if (!raw || typeof raw !== 'object') return result;
  const saved = raw as Partial<LateProgress>;
  for (const step of steps) {
    if (!Array.isArray(saved.completed) || saved.completed[result.completed.length] !== step.id) break;
    result.completed.push(step.id);
    if (typeof saved.evidence?.[step.id] === 'string') result.evidence[step.id] = saved.evidence[step.id].slice(0, 2000);
  }
  result.rewardClaimed = saved.rewardClaimed === true && isLateActComplete(result, steps);
  return result;
}
export function completeLateStep(progress: LateProgress, steps: readonly Step[], npcId: string, evidence: string): LateProgress {
  const step = steps[progress.completed.length];
  if (!step || step.npcId !== npcId) return progress;
  return { ...progress, completed: [...progress.completed, step.id], evidence: { ...progress.evidence, [step.id]: evidence } };
}
export function claimLateReward(progress: LateProgress, steps: readonly Step[]): LateProgress {
  return isLateActComplete(progress, steps) ? { ...progress, rewardClaimed: true } : progress;
}
