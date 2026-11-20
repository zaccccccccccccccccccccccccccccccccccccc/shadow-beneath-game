export type TutorialStep = 'move' | 'observe' | 'exit';

export const sceneKeys = ['intro', 'tutorial', 'act-one', 'next-patch'] as const;

export const prologueAutoAdvanceMs = 4200;

export const prologueCards = [
  {"actor":"rong-jie","speaker":"蓉姐","kicker":"一份邀請","title":"歡迎來到 CCAC","body":"「你的見習申請通過了。」蓉姐把邀請函推到桌前，「明天，和我一起走進街區。」"},
  {"actor":"player","speaker":"你","kicker":"報到前一晚","title":"我能做甚麼？","body":"「我認得這些街道，也認得街坊。但我還不知道，怎樣才算真正看清一件事。」"},
  {"actor":"rong-jie","speaker":"蓉姐","kicker":"第一天 · 廉政公署","title":"先走近，再判斷","body":"「唔好靠估，行過去睇。每個人都有自己的理由。先聽、先記錄，再核對。」"},
  {"actor":"player","speaker":"你","kicker":"接過工作證","title":"從一名見習生開始","body":"「我會把看見的和聽說的分開。暫時不知道的，就先寫下不知道。」"},
  {"actor":"rong-jie","speaker":"蓉姐","kicker":"街燈亮起","title":"我們出發吧","body":"蓉姐拿起外套：「先熟悉總部和街區。每份檔案開始時，我再告訴你這次要查甚麼。」"},
] as const;

export function allowsPointerNavigation(_: TutorialStep): boolean {
  return true;
}

export function canEnterActOne(_: TutorialStep): boolean {
  return true;
}
