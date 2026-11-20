export const thirdActSteps = [
  { id: 'developer', title: '舊城 · 向地產商核對禮包來源', story: '地產商說柏熹以「合作支持」為名送來廠商禮包，並留下「希望審批快一點」的訊息。你保存原始訊息，請他提供來源與購買憑證。', evidence: '來源：廠商禮包；附有加快審批的請求。包裝名稱不能代替事實。' },
  { id: 'hill-guard', title: '山坡 · 核對禮包收件記錄', story: '管理員出示收件簿：禮包原定送到審批經手人的住處，後改填家屬名字。這是需要核實的關聯，不能只憑改名就下結論。你記下時間與經手人。', evidence: '收件：原定經手人住處，曾改填家屬；保留原始流轉記錄。' },
  { id: 'supervisor', title: '聯署 · 比對價值與審批往來', story: '林主任陪你比較發票、廠商說明與審批流程：禮包有價值，送出時間緊接補件通知。是否存在職務交換，還須核對真實目的、身份和完整往來。', evidence: '價值與時點：已保存發票和補件時間，未把時間接近當成定罪依據。' },
  { id: 'mentor', title: '聯署 · 與蓉姐整理利益邊界', story: '蓉姐說：「拒收、登記、保存訊息，案件照程序辦。既不能以人情放寬，也不能因拒禮報復拖延。」你把來源、價值、收件人和審批關聯分開整理。', evidence: '處理：登記拒收，保全材料，審批繼續按同一標準進行，交主管核實。' },
] as const;

export function completeThirdActStep(completed: string[], id: string): string[] {
  return thirdActSteps[completed.length]?.id === id ? [...completed, id] : completed;
}
export function thirdActComplete(completed: string[]): boolean {
  return thirdActSteps.every(step => completed.includes(step.id));
}
