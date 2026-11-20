import { describe, expect, it } from 'vitest';
import { musicProfiles, type MusicZone } from '../src/game/music';

describe('district music', () => {
  it('gives the tutorial courtyard and five districts distinct scores', () => {
    const zones: MusicZone[] = ['tutorial', 'hq', 'oldTown', 'campus', 'harbor', 'hill'];
    const signatures = zones.map((zone) => {
      const profile = musicProfiles[zone];
      return `${profile.tempo}:${profile.root}:${profile.scale.join(',')}:${profile.wave}`;
    });
    expect(signatures).toHaveLength(6);
    expect(new Set(signatures).size).toBe(6);
  });
});
