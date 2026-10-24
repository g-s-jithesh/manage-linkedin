import fs from "fs";
import path from "path";
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
type Saved = Scheduled & { token: string; fileMeta: { name: string; type: string }[] };

// Persisted under DATA_DIR (the desktop app points it at its user-data folder) so scheduled posts survive restarts.
// The access token is stored in plain text there, so keep that folder private.
const dir = path.join(process.env.DATA_DIR || path.join(process.cwd(), ".data"), "scheduled");
const dbFile = path.join(dir, "posts.json");

// Kept on globalThis so dev hot-reload doesn't re-arm timers twice.
const g = globalThis as unknown as { __scheduled?: Map<string, Entry> };
// setTimeout overflows past ~24.8 days, so cap the horizon.
export const MAX_DELAY_MS = 24 * 24 * 3600 * 1000;
// Posts overdue by more than this when the app starts are marked missed instead of published late.
const GRACE_MS = 5 * 60 * 1000;

function persist() {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const saved: Saved[] = [...store.values()].map(({ files, timer: _t, ...e }) => ({ ...e, fileMeta: files.map((f) => ({ name: f.name, type: f.type })) })); // eslint-disable-line @typescript-eslint/no-unused-vars
    fs.writeFileSync(dbFile, JSON.stringify(saved));
  } catch (e) {
    console.error("scheduler persist failed:", e);
  }
}

const blobPath = (id: string, i: number) => path.join(dir, `${id}.${i}`);

function dropBlobs(id: string, count: number) {
  for (let i = 0; i < count; i++) fs.rm(blobPath(id, i), { force: true }, () => {});
}

function arm(entry: Entry) {
  entry.timer = setTimeout(async () => {
    const r = await publishPost(entry.token, entry.sub, entry.text, entry.files).catch((e) => ({ ok: false as const, error: String(e), status: 500 }));
    entry.status = r.ok ? "posted" : "failed";
    entry.detail = r.ok ? (r.id ?? undefined) : r.error;
    dropBlobs(entry.id, entry.files.length);
    entry.files = [];
    entry.token = ""; // no need to keep the token once finished
    persist();
  }, Math.max(0, entry.at - Date.now()));
}

function load(): Map<string, Entry> {
  const map = new Map<string, Entry>();
  try {
    const saved: Saved[] = JSON.parse(fs.readFileSync(dbFile, "utf8"));
    for (const { fileMeta, ...e } of saved) {
      const files = e.status === "pending" ? fileMeta.map((m, i) => new File([fs.readFileSync(blobPath(e.id, i))], m.name, { type: m.type })) : [];
      const entry: Entry = { ...e, files };
      map.set(e.id, entry);
      if (e.status !== "pending") continue;
      if (Date.now() - e.at > GRACE_MS) {
        entry.status = "failed";
        entry.detail = "Missed: the app was closed at the scheduled time.";
        dropBlobs(e.id, fileMeta.length);
        entry.files = [];
        entry.token = "";
      } else {
        arm(entry);
      }
    }
  } catch {
    // no saved posts yet, or unreadable file: start empty
  }
  return map;
}

const store = (g.__scheduled ??= load());
persist();

export function schedulePost(sub: string, token: string, text: string, files: File[], at: number) {
  const id = crypto.randomUUID();
  fs.mkdirSync(dir, { recursive: true });
  return Promise.all(files.map(async (f, i) => fs.writeFileSync(blobPath(id, i), Buffer.from(await f.arrayBuffer())))).then(() => {
    const entry: Entry = { id, sub, at, text, fileCount: files.length, status: "pending", token, files };
    store.set(id, entry);
    arm(entry);
    persist();
    return id;
  });
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
  dropBlobs(id, e.fileCount);
  store.delete(id);
  persist();
  return true;
}
