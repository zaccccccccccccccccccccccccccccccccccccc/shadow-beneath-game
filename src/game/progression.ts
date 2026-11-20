export type TravelRegion = string;

export function isChapterComplete(objectiveStates: readonly boolean[]): boolean {
  return objectiveStates.length > 0 && objectiveStates.every(Boolean);
}

export function canFastTravelTo(
  target: TravelRegion,
  current: TravelRegion,
  visited: readonly TravelRegion[],
): boolean {
  return target !== current && visited.includes(target);
}
