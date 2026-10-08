// 「AIで細部を書く」の画面の部品。差し込むのは画面の担当 (ここは部品を作って返すだけ)。
// AI の文は必ず textContent で出す (innerHTML に入れない)。キーは入力欄に出さない。
import { AiError, chat, parseJson } from '../ai/client';
import { aiReady, aiSettings, LOCAL_URL_EXAMPLE, OPENROUTER_MODEL_EXAMPLE, saveAiSettings, type AiSettings, type Provider } from '../ai/settings';
import { deathPrompt, speakers, yearPrompt } from '../ai/prompts';
import { sanitizeDeath, sanitizeYear, type AiDeath, type AiEntry } from '../ai/apply';
import type { Hero } from '../engine';
import { L } from '../i18n';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}
const errText = (e: unknown) => (e instanceof AiError ? e.message : L('うまくいかなかった', 'Something went wrong'));

// 設定の画面: 接続先・URL・キー・モデル名・接続を試す・キーを消す
export function aiSettingsPanel(): HTMLElement {
  const s = aiSettings();
  const provider = el('select', {}, el('option', { value: 'openrouter', textContent: 'OpenRouter' }),
    el('option', { value: 'local', textContent: L('手元のLLM(OpenAI 互換)', 'Local LLM (OpenAI-compatible)') }));
  provider.value = s.provider;
  const url = el('input', { value: s.baseUrl, placeholder: LOCAL_URL_EXAMPLE, autocomplete: 'off', spellcheck: false });
  const urlRow = el('label', { className: 'field' }, L('URL(…/v1 まで)', 'URL (up to …/v1)'), url);
  const key = el('input', { type: 'password', autocomplete: 'off', spellcheck: false });
  const model = el('input', { value: s.model, autocomplete: 'off', spellcheck: false });
  const out = el('span', { className: 'note' });
  const keyNote = () => (aiSettings().apiKey ? L('(保存済み。変えるときだけ入力)', '(saved; enter only to change)') : provider.value === 'local' ? L('(手元のLLMなら空でよい)', '(may be empty for a local LLM)') : '');
  const keyHint = el('small', { textContent: keyNote() });
  const sync = () => {
    urlRow.hidden = provider.value !== 'local';
    model.placeholder = provider.value === 'openrouter' ? `${L('例', 'e.g.')}: ${OPENROUTER_MODEL_EXAMPLE}` : '';
    keyHint.textContent = keyNote();
  };
  const read = (): AiSettings => ({
    provider: provider.value as Provider,
    baseUrl: url.value.trim(),
    apiKey: key.value.trim() || aiSettings().apiKey,
    model: model.value.trim(),
  });
  const saveNow = () => {
    saveAiSettings(read());
    key.value = '';
    sync();
  };
  provider.onchange = sync;
  sync();

  const saveBtn = el('button', { type: 'button', className: 'primary', textContent: L('保存', 'Save') });
  saveBtn.onclick = () => {
    saveNow();
    out.textContent = aiReady() ? L('保存した。', 'Saved.') : L('保存した(まだ足りない項目がある)。', 'Saved (something is still missing).');
  };
  const testBtn = el('button', { type: 'button', textContent: L('接続を試す', 'Test connection') });
  testBtn.onclick = async () => {
    saveNow();
    out.textContent = L('問い合わせ中…', 'Asking…');
    testBtn.disabled = true;
    const t0 = performance.now();
    try {
      const text = await chat([
        { role: 'system', content: L('出力は JSON だけ。', 'Output JSON only.') },
        { role: 'user', content: L('日本語で、ある村の朝の様子を一文で。{"text": "…"} の形で。', 'In English, describe a morning in a village in one sentence. Use the form {"text": "…"}.') },
      ], aiSettings(), { maxTokens: 200 });
      const said = String((parseJson(text) as { text?: unknown }).text ?? '').slice(0, 80);
      const sec = ((performance.now() - t0) / 1000).toFixed(1);
      out.textContent = L(`つながった(${sec}秒): 「${said}」`, `Connected (${sec}s): "${said}"`);
    } catch (e) {
      out.textContent = `${L('失敗', 'Failed')}: ${errText(e)}`;
    } finally {
      testBtn.disabled = false;
    }
  };
  const clearBtn = el('button', { type: 'button', textContent: L('キーを消す', 'Forget key') });
  clearBtn.onclick = () => {
    saveAiSettings({ ...aiSettings(), apiKey: '' });
    key.value = '';
    sync();
    out.textContent = L('キーを消した。', 'Key removed.');
  };

  return el('details', { className: 'panel aipanel' },
    el('summary', {}, el('b', { textContent: L('AIで細部を書く', 'Write details with AI') }), ' ', el('small', { textContent: L('(任意)', '(optional)') })),
    el('p', { className: 'note', textContent: L('生死・出来事・職業・人の輪はゲームが決める。AIはその年の細部と、最後の言葉・墓碑銘を書き足すだけ。書いた文は検査を通ったものだけを使う。', 'The game decides life and death, events, jobs and the people around you. AI only adds detail to a year, last words and an epitaph. Only text that passes the checks is used.') }),
    el('label', { className: 'field' }, L('接続先', 'Provider'), provider),
    urlRow,
    el('label', { className: 'field' }, L('モデル名', 'Model'), model),
    el('label', { className: 'field' }, L('APIキー', 'API key'), ' ', keyHint, key),
    el('div', { className: 'choices' }, saveBtn, testBtn, clearBtn, out),
    el('p', { className: 'note', textContent: L('APIキーはこのブラウザにだけ保存され、接続先にだけ送られる。手元のLLMにつなぐには、LLM側でCORSの許可が要る。', 'The API key is stored only in this browser and sent only to the provider. A local LLM must allow CORS.') }),
  );
}

// 「AIで書き足す」ボタン。押すと頼んで、検査を通った結果だけを onText に渡す。通らなければ理由を出して、もう一度押せる
function aiButton<R>(label: string, run: () => Promise<R | null>, onText: (r: R) => void): HTMLElement {
  const btn = el('button', { type: 'button', className: 'ai-btn', textContent: label });
  const note = el('small', { className: 'note' });
  btn.onclick = async () => {
    if (!aiReady()) { note.textContent = L('設定でAIをつないでください。', 'Connect an AI in the settings first.'); return; }
    btn.disabled = true;
    note.textContent = L('書いています…', 'Writing…');
    try {
      const r = await run();
      if (r === null) { note.textContent = L('使えない答えだった。もう一度どうぞ。', 'The answer could not be used. Try again.'); return; }
      note.textContent = '';
      btn.hidden = true;
      onText(r);
    } catch (e) {
      note.textContent = errText(e);
    } finally {
      btn.disabled = false;
    }
  };
  return el('span', { className: 'ai-action' }, btn, ' ', note);
}

// 人生の画面: その年 (省略 = 今の年) の細部を1つ。年表の、その年の後ろに足して出す
export function aiYearButton(h: Hero, onText: (e: AiEntry) => void, age = h.age): HTMLElement {
  return aiButton(L('AIで書き足す', 'Add detail with AI'), async () => {
    const ask = yearPrompt(h, age);
    const raw = parseJson(await chat(ask.msgs, aiSettings(), { maxTokens: 400 }));
    // 亡くなった年の色は 'death' なので、その年のほかの出来事の色に合わせる
    const kind = h.log.filter((e) => e.age === age && e.kind !== 'death').at(-1)?.kind ?? 'work';
    return sanitizeYear(raw, ask.check, age, kind);
  }, onText);
}

// 死亡記録: 最後にそばにいた人の一言と墓碑銘。どちらか1つでも通れば渡す
export function aiEpitaph(h: Hero, onText: (d: AiDeath) => void): HTMLElement {
  return aiButton(L('AIで最後の言葉を書く', 'Write last words with AI'), async () => {
    const ask = deathPrompt(h);
    const raw = parseJson(await chat(ask.msgs, aiSettings(), { maxTokens: 700 }));
    const d = sanitizeDeath(raw, ask.check, speakers(h));
    return d.words.length || d.epitaph ? d : null;
  }, onText);
}
