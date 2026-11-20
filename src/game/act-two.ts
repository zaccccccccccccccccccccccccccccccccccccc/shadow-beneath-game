import type { RegionId } from './world-data';

export type ActTwoStep = 'ledger' | 'yongqi' | 'tea-house' | 'register';
export type ActTwoRegion = RegionId;
export interface ActTwoState { completed: ActTwoStep[]; lampOil: number; rewardClaimed: boolean }

const required: ActTwoStep[] = ['ledger', 'yongqi', 'tea-house', 'register'];

export function getActTwoNextStep(state: ActTwoState): ActTwoStep | null {
  return required.find((step) => !state.completed.includes(step)) ?? null;
}

export function canCompleteActTwoStep(state: ActTwoState, step: ActTwoStep): boolean {
  return getActTwoNextStep(state) === step;
}

export function canTravelActTwoRegion(state: ActTwoState, region: ActTwoRegion, visited: readonly ActTwoRegion[]): boolean {
  if (region === 'campus' || region === 'hill' || visited.includes(region)) return true;
  if (region === 'hq') return state.completed.includes('yongqi');
  if (region === 'oldTown') return state.completed.includes('yongqi');
  return state.completed.includes('tea-house');
}

export function createActTwoState(): ActTwoState {
  return { completed: [], lampOil: 100, rewardClaimed: false };
}

export function completeActTwoStep(state: ActTwoState, step: ActTwoStep): ActTwoState {
  if (!canCompleteActTwoStep(state, step)) return state;
  return { ...state, completed: [...state.completed, step], lampOil: Math.max(0, state.lampOil - 18) };
}

export function isActTwoComplete(state: ActTwoState): boolean {
  return required.every((step) => state.completed.includes(step));
}

export function claimActTwoReward(state: ActTwoState): ActTwoState | null {
  if (!isActTwoComplete(state) || state.rewardClaimed) return null;
  return { ...state, rewardClaimed: true };
}

export function getActTwoMissingSteps(state: ActTwoState): ActTwoStep[] {
  return required.filter((step) => !state.completed.includes(step));
}
