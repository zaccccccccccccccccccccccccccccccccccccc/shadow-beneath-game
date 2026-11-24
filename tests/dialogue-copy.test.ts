import { expect, it } from 'vitest';
import { spokenDialogue } from '../src/game/dialogue-copy';
it('keeps speech and removes narrated speaker actions from portrait dialogue', () => {
  expect(spokenDialogue('蓉姐把燈遞過來：「先看清楚。」')).toBe('先看清楚。');
  expect(spokenDialogue('“先記錄。”她說，“再核對。”')).toBe('先記錄。\n再核對。');
  expect(spokenDialogue('附件缺了一頁。')).toBe('附件缺了一頁。');
});
