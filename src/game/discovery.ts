export interface Point {
  x: number;
  y: number;
}

export function isClueRevealed(lantern: Point, clue: Point, radius: number): boolean {
  return (lantern.x - clue.x) ** 2 + (lantern.y - clue.y) ** 2 <= radius ** 2;
}
