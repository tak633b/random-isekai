// アカウント (Google でログイン) と、遊びの積み重ね (Progress) の同期。サーバは server/account.mjs。
// ログインしなければ今までどおり localStorage だけ。VITE_GOOGLE_CLIENT_ID が無いビルドではログインそのものを出さない。
// ログインしたら: サーバの記録と端末の記録を合わせて両方に置く。以後は書くたびに少し待ってから送る (閉じるときにも送る)。
// 届かなくても遊びは止めない (次に書いたときにまた送る)。ログアウトしても端末の記録はそのまま
import { mergeProgress } from '../meta/merge';
import { loadProgress, onProgressReset, onProgressSaved, saveProgressQuietly } from '../meta/store';
import type { Progress } from '../meta/types';

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';
/** ログインを出すか (ビルドに Google のクライアント ID があるとき) */
export const accountEnabled = /^[\w.-]+\.apps\.googleusercontent\.com$/.test(CLIENT_ID);
export const googleClientId = CLIENT_ID;

const DEBOUNCE_MS = 3000;
type State = { signedIn: boolean; syncing: boolean; error: boolean };
let state: State = { signedIn: false, syncing: false, error: false };
let rev = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let dirty = false;
let resetting = false; // 「最初から」をまだサーバに届けていない
let inflight: Promise<void> | null = null;
const watchers = new Set<() => void>();

export const accountState = (): Readonly<State> => state;
/** 状態が変わったら呼ぶ (画面の作り直し用)。戻り値で外す */
export function watchAccount(f: () => void): () => void { watchers.add(f); return () => watchers.delete(f); }
const set = (s: Partial<State>): void => { state = { ...state, ...s }; for (const f of watchers) f(); };

type Res<T> = { ok: true; data: T } | { ok: false; status: number };
async function api<T>(method: string, path: string, body?: unknown, keepalive = false): Promise<Res<T>> {
  try {
    const r = await fetch(`/api${path}`, {
      method, keepalive, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...(keepalive ? {} : { signal: AbortSignal.timeout(10_000) }),
    });
    const j = await r.json().catch(() => null) as { success?: boolean; data?: T } | null;
    return r.ok && j?.success ? { ok: true, data: j.data as T } : { ok: false, status: r.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

type Remote = { data: Progress; rev: number };

// サーバの答えを端末に置く。送ってから端末で何か書いていたら、それも残して (チケットは端末の枚数) もう一度送る
function apply(r: Remote, sent: Progress): void {
  rev = r.rev;
  if (resetting) { schedule(); return; } // 送っている間に「最初から」: 古い記録を端末に戻さない
  const now = loadProgress();
  if (now === sent) { saveProgressQuietly(r.data); return; }
  saveProgressQuietly({ ...mergeProgress(r.data, now), tickets: now.tickets });
  schedule();
}

async function push(): Promise<void> {
  if (!state.signedIn) return;
  if (inflight) { dirty = true; return; }
  dirty = false;
  const sent = loadProgress();
  const reset = resetting;
  inflight = (async () => {
    const r = await api<Remote>('PUT', '/progress', { data: sent, baseRev: rev, ...(reset ? { reset } : {}) });
    inflight = null;
    if (r.ok) { if (reset) resetting = false; set({ error: false }); apply(r.data, sent); } else if (r.status === 401) signedOut(); else { dirty = true; set({ error: true }); }
    if (dirty && state.signedIn) schedule();
  })();
  return inflight;
}

function schedule(): void {
  dirty = true;
  clearTimeout(timer);
  timer = setTimeout(() => void push(), DEBOUNCE_MS);
}

// ログインした直後と、開いたときにログイン済みだったとき: サーバの記録と合わせる
async function pull(): Promise<void> {
  set({ syncing: true });
  const r = await api<{ data: Progress | null; rev: number }>('GET', '/progress');
  if (!r.ok) { set({ syncing: false, error: r.status !== 401 }); if (r.status === 401) signedOut(); return; }
  rev = r.data.rev;
  const local = loadProgress();
  saveProgressQuietly(r.data.data ? mergeProgress(r.data.data, local) : local);
  set({ syncing: false });
  await push();
}

// ログイン中に「最初から」: アカウントの記録も合わせずに置き換える (すぐ送る。届かなければ次の送信で)
function wipe(): void {
  resetting = true;
  clearTimeout(timer);
  void push();
}

function signedIn(): void {
  onProgressSaved(schedule);
  onProgressReset(wipe);
  set({ signedIn: true, error: false });
  void pull();
}

function signedOut(): void {
  onProgressSaved(null);
  onProgressReset(null);
  resetting = false;
  clearTimeout(timer);
  dirty = false;
  rev = 0;
  set({ signedIn: false, syncing: false, error: false });
}

/** 開いたときに1回。ログイン済みなら同期を始める */
export async function initAccount(): Promise<void> {
  if (!accountEnabled) return;
  addEventListener('pagehide', () => {
    if (!dirty || !state.signedIn) return;
    // ponytail: keepalive の本文は 64KB まで。何百も遊んだ記録は超えて送れないことがある (直前の送信で足りていることが多い)
    void api('PUT', '/progress', { data: loadProgress(), baseRev: rev }, true);
  });
  const r = await api<{ signedIn: boolean }>('GET', '/auth/me');
  if (r.ok && r.data.signedIn) signedIn();
}

/** Google から受け取った ID トークンでログイン */
export async function signIn(credential: string): Promise<boolean> {
  const r = await api('POST', '/auth/google', { credential });
  if (!r.ok) { set({ error: true }); return false; }
  signedIn();
  return true;
}

export async function signOut(): Promise<void> {
  if (dirty) await push();
  await api('POST', '/auth/logout', {});
  signedOut();
}

/** アカウントと、サーバの記録を消す (端末の記録は残る) */
export async function deleteAccount(): Promise<boolean> {
  const r = await api('DELETE', '/account', {});
  if (!r.ok) { set({ error: true }); return false; }
  signedOut();
  return true;
}
