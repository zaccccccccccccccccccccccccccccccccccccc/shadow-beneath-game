export type TutorialStep = 'move' | 'observe' | 'exit';

export const sceneKeys = ['intro', 'tutorial', 'act-one', 'next-patch'] as const;

export const prologueAutoAdvanceMs = 2600;

export const prologueCards = [
  { actor: 'rong-jie', speaker: '榮姐', kicker: '澳門 · 雨夜', title: '沒有署名的信', body: '雨水還未乾，信已經在監察組的門縫裡。' },
  { actor: 'rong-jie', speaker: '榮姐', kicker: '南灣項目', title: '被抽走的一頁', body: '審批快得不尋常，附件裡卻少了一頁帳。' },
  { actor: 'rong-jie', speaker: '榮姐', kicker: '調查之前', title: '先分清看見與聽說', body: '一封信只是起點。你需要找到能互相印證的人與事。' },
  { actor: 'player', speaker: '你', kicker: '你的第一夜', title: '接過這盞燈', body: '今晚先記下事實，再去問那些有名字的人。' },
  { actor: 'rong-jie', speaker: '榮姐', kicker: '路線已標記', title: '從街燈下出發', body: '先學會走近，之後去舊城、海邊，讓每條線索自己說話。' },
] as const;

export function allowsPointerNavigation(_: TutorialStep): boolean {
  return true;
}

export function canEnterActOne(_: TutorialStep): boolean {
  return true;
}
