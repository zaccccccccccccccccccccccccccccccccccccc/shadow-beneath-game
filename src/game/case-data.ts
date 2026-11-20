import type { Classification } from './domain';

export interface ActEvent {
  id: string;
  caseCategory: 'ordinary-courtesy' | 'academic-integrity';
  title: string;
  witness: string;
  description: string;
  correctClassification: Classification;
  correctConsequence: string;
  incorrectConsequence: string;
  x: number;
  y: number;
  palette: number;
}

export const actOneEvents: ActEvent[] = [
  {
    id: 'soda-gift',
    caseCategory: 'ordinary-courtesy',
    title: '一支汽水',
    witness: '家俊 · 新同事',
    description: '「新手頭一日嘛，請你飲。」他遞來一支仍帶水珠的汽水。',
    correctClassification: 'courtesy',
    correctConsequence: '普通的人情往來，不涉及職權與利益交換。',
    incorrectConsequence: '可疑不等於違規；先把事情看清，才下判斷。',
    x: 420,
    y: 510,
    palette: 0xf3bf64,
  },
  {
    id: 'student-card',
    caseCategory: 'academic-integrity',
    title: '借出的學生證',
    witness: '家俊與一名應考學生',
    description: '走廊轉角，家俊把自己的學生證交給一名神色匆忙的同學。你聽見對方低聲說：「我只差這一次。」',
    correctClassification: 'declaration',
    correctConsequence: '這不是受賄，但借證代考屬於嚴重的學術不誠實。應完整記錄事實，並交由學校按程序處理。',
    incorrectConsequence: '看見一張學生證，不等於已掌握全部事實；記錄與判斷都要有依據。',
    x: 1110,
    y: 485,
    palette: 0xe1846b,
  },
];
