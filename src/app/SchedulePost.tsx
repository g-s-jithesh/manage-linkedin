"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, X } from "lucide-react";

type Item = { id: string; at: number; text: string; fileCount: number; status: "pending" | "posted" | "failed"; detail?: string };

export default function SchedulePost({ text, files, enabled, onScheduled }: { text: string; files: File[]; enabled: boolean; onScheduled: () => void }) {
  const [when, setWhen] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await (await fetch("/api/linkedin/schedule")).json();
      if (d.success) setItems(d.items);
    } catch {}
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh(); // eslint-disable-line react-hooks/set-state-in-effect -- async fetch, state set after await
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [enabled, refresh]);

  const schedule = async () => {
    setMsg(null);
    const form = new FormData();
    form.append("text", text);
    form.append("at", String(new Date(when).getTime()));
    files.forEach((f) => form.append("files", f));
    const d = await (await fetch("/api/linkedin/schedule", { method: "POST", body: form })).json();
    if (!d.success) return setMsg(d.error);
    setMsg("Scheduled. Keep the app open until then.");
    setWhen("");
    onScheduled();
    refresh();
  };

  const cancel = async (id: string) => {
    await fetch(`/api/linkedin/schedule?id=${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <div className="flex flex-col gap-2 text-xs text-gray-700">
      <div className="flex gap-2 items-center">
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="flex-1 rounded px-2 py-2 bg-white/60" />
        <button onClick={schedule} disabled={!enabled || !when || (!text && !files.length)} className="skeuo-button px-4 py-2 font-bold text-blue-600 gap-1 disabled:opacity-50">
          <CalendarClock size={16} /> Schedule
        </button>
      </div>
      {msg && <p className="text-center">{msg}</p>}
      {items.map((i) => (
        <div key={i.id} className="flex items-center justify-between gap-2 bg-gray-200 rounded px-2 py-1">
          <span className="truncate">
            {new Date(i.at).toLocaleString()} · {i.text.slice(0, 40) || `${i.fileCount} file(s)`} ·{" "}
            <b>{i.status === "failed" ? `failed: ${i.detail}` : i.status}</b>
          </span>
          {i.status === "pending" && (
            <button onClick={() => cancel(i.id)} aria-label="Cancel scheduled post"><X size={14} /></button>
          )}
        </div>
      ))}
    </div>
  );
}
