import protagonistExpressions from '../assets/character-protagonist-expressions.png';
import yongqiExpressions from '../assets/character-yongqi-expressions.png';
import huigeExpressions from '../assets/character-huige-expressions.png';
import baixiExpressions from '../assets/character-baixi-expressions.png';
import changshuExpressions from '../assets/character-changshu-expressions.png';
import weigeExpressions from '../assets/character-weige-expressions.png';
import chenboExpressions from '../assets/character-chenbo-expressions.png';

export const CHARACTER_DOSSIER = [
  { id: 'protagonist', name: '见习调查员', traditional: '見習調查員', role: '玩家主角 · 记录者', roleTraditional: '玩家主角 · 記錄者', texture: 'portrait-protagonist', image: protagonistExpressions },
  { id: 'yongqi', name: '詠琪', traditional: '詠琪', role: '第二幕 · 社团经手人', roleTraditional: '第二幕 · 社團經手人', texture: 'portrait-yongqi', image: yongqiExpressions },
  { id: 'huige', name: '辉哥', traditional: '輝哥', role: '第二幕 · 茶馆线人', roleTraditional: '第二幕 · 茶館線人', texture: 'portrait-huige', image: huigeExpressions },
  { id: 'baixi', name: '柏熹', traditional: '柏熹', role: '第三幕 · 地产开发商', roleTraditional: '第三幕 · 地產開發商', texture: 'portrait-baixi', image: baixiExpressions },
  { id: 'changshu', name: '昌叔', traditional: '昌叔', role: '第四幕 · 翻修工地负责人', roleTraditional: '第四幕 · 翻修工地負責人', texture: 'portrait-changshu', image: changshuExpressions },
  { id: 'weige', name: '威哥', traditional: '威哥', role: '第五幕 · 招聘中介', roleTraditional: '第五幕 · 招聘中介', texture: 'portrait-weige', image: weigeExpressions },
  { id: 'chenbo', name: '陈伯', traditional: '陳伯', role: '第六幕 · 申请人', roleTraditional: '第六幕 · 申請人', texture: 'portrait-chenbo', image: chenboExpressions },
] as const;

export const PORTRAIT_FRAMES = { neutral: 0, concerned: 1, resolved: 2 } as const;
