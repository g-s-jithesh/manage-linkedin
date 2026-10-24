"use client";

import { useEffect, useState } from "react";

type Entry = { id: string; snippet: string; at: number; attachments: number };
type Stats = { likes: number; comments: number } | { error: string };

const KEY = "postHistory";
const EVT = "post-history-updated";

const read = (): Entry[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
};

// Call after a successful post.
export function savePost(id: string | null | undefined, text: string, attachments: number) {
  if (!id) return;
  try {
    const entry: Entry = { id, snippet: text.slice(0, 80), at: Date.now(), attachments };
    localStorage.setItem(KEY, JSON.stringify([entry, ...read()].slice(0, 20)));
    window.dispatchEvent(new Event(EVT));
  } catch {}
}

export default function PostHistory() {
  const [items, setItems] = useState<Entry[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});

  useEffect(() => {
    const load = () => setItems(read());
    load();
    window.addEventListener(EVT, load);
    return () => window.removeEventListener(EVT, load);
  }, []);

  const check = async (id: string) => {
    const res = await fetch(`/api/linkedin/stats?id=${encodeURIComponent(id)}`).catch(() => null);
    const d = await res?.json().catch(() => null);
    setStats((s) => ({ ...s, [id]: d && !d.error ? d : { error: d?.error ?? "Could not fetch stats." } }));
  };

  if (!items.length) return null;
  return (
    <section className="mt-4 text-sm text-gray-700">
      <h3 className="font-bold mb-2">Posted</h3>
      <ul className="space-y-2">
        {items.map((p) => {
          const s = stats[p.id];
          return (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="truncate">
                {p.snippet || "(media only)"}
                <span className="text-xs text-gray-500">
                  {" "}
                  {new Date(p.at).toLocaleString()}
                  {p.attachments ? ` · ${p.attachments} file(s)` : ""}
                </span>
              </span>
              <span className="text-xs shrink-0">
                {!s ? (
                  <button onClick={() => check(p.id)} className="underline">
                    Stats
                  </button>
                ) : "error" in s ? (
                  s.error
                ) : (
                  `${s.likes} likes · ${s.comments} comments`
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
