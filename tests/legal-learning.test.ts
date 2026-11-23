import { it, expect } from 'vitest';
import { legalLearning } from '../src/game/legal-learning';
it('offers Macau learning references for all six acts without automatic convictions', () => {
  expect(Object.keys(legalLearning)).toHaveLength(6);
  for (const entry of Object.values(legalLearning)) {
    expect(new URL(entry.url).hostname).toMatch(/(?:ccac|court)\.gov\.mo|ccac\.org\.mo/);
    expect(entry.note).toContain('不等於');
    expect(entry.summary.length).toBeGreaterThan(30);
    expect(entry.summary).not.toContain('第385');
  }
});
