import { createBrowserPrologueSpeech, type PrologueSpeaker } from './prologue-voice';

const KEY = 'under-shadow-dialogue-voice-enabled';
export function isDialogueVoiceEnabled(): boolean {
  try { return localStorage.getItem(KEY) !== 'false'; } catch { return true; }
}
export function setDialogueVoiceEnabled(enabled: boolean): void {
  try { localStorage.setItem(KEY, String(enabled)); } catch { /* Session control still works. */ }
}

/** A real DOM gesture gives blocked mobile speech an explicit replay path. */
export function createDialogueVoiceControls() {
  const speech = createBrowserPrologueSpeech();
  const controls = document.createElement('div');
  controls.id = 'dialogue-voice-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', '對話語音');
  const replay = document.createElement('button');
  const toggle = document.createElement('button');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  replay.type = toggle.type = 'button';
  replay.textContent = '▶ 朗讀／重播';
  let text = '', speaker: PrologueSpeaker = 'rong-jie', enabled = isDialogueVoiceEnabled();
  let serial = 0;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { serial++; clearTimeout(watchdog); speech?.cancel(); };
  const play = () => {
    stop();
    if (!speech) { status.textContent = '此瀏覽器不支援語音'; return; }
    const current = serial;
    status.textContent = '正在準備語音…';
    watchdog = setTimeout(() => { if(current === serial) status.textContent = '語音未開始，請點朗讀／重播；也請檢查分頁是否靜音'; }, 6000);
    speech.speak(text, () => { clearTimeout(watchdog); if(current === serial) status.textContent = '朗讀完畢'; },
      () => { clearTimeout(watchdog); if(current === serial) status.textContent = '未能播放：請點重播，或確認裝置有中文語音及音量'; }, speaker,
      () => { clearTimeout(watchdog); if(current === serial) status.textContent = '正在朗讀'; });
  };
  const label = () => { toggle.textContent = enabled ? '語音：開' : '語音：關'; toggle.setAttribute('aria-pressed', String(enabled)); };
  replay.onclick = () => { enabled = true; setDialogueVoiceEnabled(true); label(); play(); };
  toggle.onclick = () => { enabled = !enabled; setDialogueVoiceEnabled(enabled); label(); if(enabled)play();else{stop();status.textContent='語音已關閉';} };
  label();controls.append(replay, toggle, status);controls.hidden = true;document.body.append(controls);
  return {
    show(body: string, actor: PrologueSpeaker) { text=body;speaker=actor;controls.hidden=false;if(enabled)play();else{stop();status.textContent='點朗讀即可播放這句對話';} },
    hide() { stop();controls.hidden=true; },
    destroy() { stop();controls.remove(); },
  };
}
