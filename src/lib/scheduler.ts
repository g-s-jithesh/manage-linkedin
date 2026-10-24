import { publishPost } from "@/lib/linkedin-publish";

export type Scheduled = {
  id: string;
  sub: string;
  at: number;
  text: string;
  fileCount: number;
  status: "pending" | "posted" | "failed";
  detail?: string;
};

type Entry = Scheduled & { token: string; files: File[]; timer?: ReturnType<typeof setTimeout> };

// ponytail: in-memory, so pending posts are lost if the server/app restarts and the app must stay open.
// Persist to a file or DB if that matters. Kept on globalThis so dev hot-reload doesn't drop them.
const g = globalThis as unknown as { __scheduled?: Map<string, Entry> };
const store = (g.__scheduled ??= new Map<string, Entry>());

// setTimeout overflows past ~24.8 days, so cap the horizon.
export const MAX_DELAY_MS = 24 * 24 * 3600 * 1000;

export function schedulePost(sub: string, token: string, text: string, files: File[], at: number) {
  const id = crypto.randomUUID();
  const entry: Entry = { id, sub, at, text, fileCount: files.length, status: "pending", token, files };
  entry.timer = setTimeout(async () => {
    const r = await publishPost(token, sub, text, files).catch((e) => ({ ok: false as const, error: String(e), status: 500 }));
    entry.status = r.ok ? "posted" : "failed";
    entry.detail = r.ok ? (r.id ?? undefined) : r.error;
    entry.files = []; // free memory
  }, Math.max(0, at - Date.now()));
  store.set(id, entry);
  return id;
}

export function listScheduled(sub: string): Scheduled[] {
  return [...store.values()]
    .filter((e) => e.sub === sub)
    .map(({ token: _t, files: _f, timer: _timer, ...pub }) => pub) // eslint-disable-line @typescript-eslint/no-unused-vars
    .sort((a, b) => a.at - b.at);
}

export function cancelScheduled(sub: string, id: string) {
  const e = store.get(id);
  if (!e || e.sub !== sub) return false;
  clearTimeout(e.timer);
  store.delete(id);
  return true;
}
