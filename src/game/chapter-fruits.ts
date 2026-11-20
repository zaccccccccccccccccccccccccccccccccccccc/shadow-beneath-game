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
    ['獬豸守正。主管與學生說法衝突，但兩份記錄都來自同一人的轉述，應如何比較？', '查獨立原件和直接證詞，不把重複轉述當相互印證', '兩份記錄一致，先採信主管並保留學生意見'],
    ['獬豸辨曲直。收禮與審批同日，卻尚未查清職務權限與請託目的，最穩妥的結論？', '記錄可疑關聯，保全往來並補查權限與目的', '時點一致已構成利益交換，可先定性再補查'],
  ],
  baize: [
    ['白澤求證核實。聽見一則傳聞，先做甚麼？', '追溯來源並核對原始記錄', '立刻轉發給所有人'],
    ['白澤重視來源。證人只聽別人說，應如何記錄？', '標記為轉述，另找直接來源', '寫成親眼所見'],
    ['白澤核對細節。日期不一致時應該？', '查清製單與實際簽收日期', '挑一個順眼的日期'],
    ['白澤查缺補漏。帳簿缺頁應先？', '記錄缺頁並查經手流程', '自己補寫一頁'],
    ['白澤求真。證人看過文件袋，後從群聊聽說裡面是現金；應如何歸檔？', '看見袋子屬直接觀察，現金內容另列轉述待查', '證人已確認現金，群聊作為補強證據'],
    ['白澤鑑證。報銷副本和登記摘要日期一致，但二者都由同一張表複製，應先做甚麼？', '找獨立簽收原件並確認資料形成時間', '兩份資料已互相吻合，優先追問責任人'],
  ],
  pixiu: [
    ['貔貅守住邊界。廠商送禮請求插隊，應該？', '拒收並按程序登記來意', '先收下再說'],
    ['貔貅知止。禮物送給家人就沒有利益關係嗎？', '仍須核對實際受益與職務關聯', '換個收件人就可以'],
    ['貔貅守界。禮物標價很低便一定能收嗎？', '還須核對目的、規則與往來', '價錢低就直接收'],
    ['貔貅護正。有人說只是合作支持時？', '核對來源、用途與附帶請求', '相信包裝上的說法'],
    ['貔貅知止。贊助先送家屬，廠商說與審批無關，卻在訊息裡要求優先處理，應如何判斷？', '保留訊息，核對實際受益人及職務關聯再依程序報告', '贊助未直接給審批人，可按一般社交禮物登記'],
    ['貔貅守界。廠商撤回禮物後，申請恰好符合正式加急條件；該如何辦理？', '按公開加急條件辦理並留痕，與拒禮分開記錄', '為保持清白，一律取消其依法申請加急的資格'],
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
