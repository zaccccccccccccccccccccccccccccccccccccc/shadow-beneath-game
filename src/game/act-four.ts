/** Prepared investigation data only: no new map, portal, or NPC coordinates. */
export const fourthActDraft = {
  title: '第四幕 · 朋友價',
  status: 'prepared' as const,
  spirit: 'qilin' as const,
  opening: '第三幕的禮包已登記，蓉姐收到一份翻修報價。昌叔說「朋友價嚟嘅啫」，卻要求把差額另行結算。這次要核對的，是優惠背後的款項和交換條件。',
  route: [
    { npcId: 'developer', region: 'oldTown', task: '保存原始報價與朋友價，核對差額說明' },
    { npcId: 'treasurer', region: 'campus', task: '比對合同、付款安排與報價項目' },
    { npcId: 'hill-guard', region: 'hill', task: '核實實際工程量及現場記錄' },
    { npcId: 'supervisor', region: 'hq', task: '檢查付款流向與審批權限' },
    { npcId: 'mentor', region: 'hq', task: '與蓉姐復盤，分開記錄已知事實與待查事項' },
  ],
  review: '便宜本身不能替代利益關係的核實；先保存報價、合同、工程量和付款記錄，再結合財產性質、行為人身份與目的判斷。',
};
