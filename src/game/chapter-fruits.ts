import { companionSnackSpots } from './world-data';
import type { SpiritId } from './spirits';

export type AvailableSpirit = Extract<SpiritId, 'xiezhi' | 'baize' | 'pixiu'>;
export const chapterSpirit: Record<number, AvailableSpirit> = { 1: 'xiezhi', 2: 'baize', 3: 'pixiu' };
export const fruitNames = { xiezhi: '明鑑果', baize: '證言莓', pixiu: '守界梨' };
export const spiritNames = { xiezhi: '獬豸', baize: '白澤', pixiu: '貔貅' };

export const spiritQuestions: Record<AvailableSpirit, readonly (readonly [string, string, string])[]> = {
  xiezhi: [
    ['獬豸明辨曲直。兩份說法衝突，應該？', '用原始記錄逐項核對', '相信最熟悉的人'],
    ['獬豸不偏私。朋友被指控時，應該？', '用相同證據標準核查', '替朋友隱瞞記錄'],
    ['獬豸辨是非。看見收禮便能定罪嗎？', '不能，還須核對身份目的與關聯', '可以，立刻公開姓名'],
    ['獬豸提醒判斷有據。只有一張截圖時？', '保留原始上下文再核對', '只截對自己有利的部分'],
    ['獬豸守正。兩名證人的身份不同，應該？', '比較證詞與事實是否相符', '職位高的人一定正確'],
    ['獬豸辨曲直。證據尚不能確認的部分？', '註明待核實，暫不下結論', '用推測補滿案件'],
  ],
  baize: [
    ['白澤求證核實。聽見一則傳聞，先做甚麼？', '追溯來源並核對原始記錄', '立刻轉發給所有人'],
    ['白澤重視來源。證人只聽別人說，應如何記錄？', '標記為轉述，另找直接來源', '寫成親眼所見'],
    ['白澤核對細節。日期不一致時應該？', '查清製單與實際簽收日期', '挑一個順眼的日期'],
    ['白澤查缺補漏。帳簿缺頁應先？', '記錄缺頁並查經手流程', '自己補寫一頁'],
    ['白澤求真。證人不記得袋內物品時？', '保留未知，不誘導猜測', '引導對方說出預期答案'],
    ['白澤鑑證。兩份記錄吻合是否已足夠？', '仍核對獨立來源與完整上下文', '停止核實，直接結案'],
  ],
  pixiu: [
    ['貔貅守住邊界。廠商送禮請求插隊，應該？', '拒收並按程序登記來意', '先收下再說'],
    ['貔貅知止。禮物送給家人就沒有利益關係嗎？', '仍須核對實際受益與職務關聯', '換個收件人就可以'],
    ['貔貅守界。禮物標價很低便一定能收嗎？', '還須核對目的、規則與往來', '價錢低就直接收'],
    ['貔貅護正。有人說只是合作支持時？', '核對來源、用途與附帶請求', '相信包裝上的說法'],
    ['貔貅知止。對方要求刪除送禮訊息時？', '保留記錄，依程序報告', '刪除即可避免麻煩'],
    ['貔貅守界。拒收禮物後如何處理審批？', '繼續依同一標準和程序辦理', '為報復而拖延申請'],
  ],
};

/** Six questions per chapter, reusing the six established ground pickup anchors. */
export function getChapterFruitSpots(chapter: number) {
  return companionSnackSpots.flatMap((anchor, index) =>
    [1, 2, 3].filter(act => act <= chapter).map(act => ({
      ...anchor, id: `${chapterSpirit[act]}:${anchor.id}`, spiritId: chapterSpirit[act],
      questionIndex: index, act,
    })),
  );
}
