import { supabase } from "./supabase";

// Similarity colour markers. Change "min" to make matching stricter or looser.
export const LEVELS = [
  { c: "green", t: "High match", min: 0.4 },
  { c: "orange", t: "Fair match", min: 0.05 },
  { c: "red", t: "Poor match", min: 0 },
];
export const simLevel = (s) => LEVELS.find((l) => (s ?? 0) >= l.min) || LEVELS[2];
export const Sim = ({ value }) => {
  const l = simLevel(value);
  return <span className="sim"><i className={l.c} />{l.t}</span>;
};
export const Msg = ({ m }) => (m ? <div className={"msg " + m.t}>{m.m}</div> : null);

const PATHS = {
  camera: "M4 8h3l2-3h6l2 3h3v11H4z M12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
  upload: "M12 16V4 M7 9l5-5 5 5 M4 20h16",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14z M21 21l-4.3-4.3",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c0-4 3.6-6 8-6s8 2 8 6",
  library: "M4 5h7v14H4z M13 5h7v14h-7z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  moon: "M20 14A8 8 0 1110 4a7 7 0 0010 10z",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13",
  copy: "M8 8h11v12H8z M5 16V4h11",
  download: "M12 4v12 M7 11l5 5 5-5 M4 20h16",
};
export const Icon = ({ n }) => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true"><path d={PATHS[n]} /></svg>
);

export async function waitFor(table, id, cols, isDone, max = 150000) {
  const t0 = Date.now();
  while (Date.now() - t0 < max) {
    const { data, error } = await supabase.from(table).select(cols).eq("id", id).single();
    if (error) throw error;
    if (isDone(data)) return data;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("This is taking too long. The server may be waking up, so try again in a minute.");
}

// Deletes a document: its images in Storage, then the row (pages are removed automatically).
export async function deleteDoc(id) {
  const { data: pg } = await supabase.from("pages").select("image_path").eq("document_id", id);
  const { data: d } = await supabase.from("documents").select("image_path").eq("id", id).single();
  const paths = [...new Set([...(pg || []).map((p) => p.image_path), d?.image_path].filter(Boolean))];
  if (paths.length) await supabase.storage.from("documents").remove(paths);
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}

export function Highlight({ text, q }) {
  const words = (q || "").split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return <>{text}</>;
  return <>{text.split(new RegExp("(" + words.join("|") + ")", "gi")).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</>;
}
