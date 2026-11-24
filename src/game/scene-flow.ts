export type TutorialStep = 'move' | 'observe' | 'exit';

export const sceneKeys = ['intro', 'tutorial', 'act-one', 'next-patch'] as const;

export const prologueAutoAdvanceMs = 4200;

export const prologueCards = [
  {"actor":"rong-jie","speaker":"蓉姐","kicker":"一份邀請","title":"歡迎來到 CCAC","body":"見習申請通過了，歡迎加入。明天跟我去街區走走，先認認地方。"},
  {"actor":"player","speaker":"你","kicker":"報到前一晚","title":"我能做甚麼？","body":"這一帶我倒是挺熟的。不過，真要查事情，我該先問誰、看甚麼？"},
  {"actor":"rong-jie","speaker":"蓉姐","kicker":"第一天 · 廉政公署","title":"先走近，再判斷","body":"別急，先過去看看。聽人怎麼說，把你親眼見到的記下來，再回頭核對。"},
  {"actor":"player","speaker":"你","kicker":"接過工作證","title":"從一名見習生開始","body":"明白。我會把親眼看見的和聽來的分開記。暫時不知道的，就先留着，查清楚再補。"},
  {"actor":"rong-jie","speaker":"蓉姐","kicker":"街燈亮起","title":"我們出發吧","body":"走吧，先熟悉總部和街區。等接到檔案，我再跟你說要查甚麼。有不明白的，隨時問我。"},
] as const;

export function allowsPointerNavigation(_: TutorialStep): boolean {
  return true;
}

export function canEnterActOne(_: TutorialStep): boolean {
  return true;
}
