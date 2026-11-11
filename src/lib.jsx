import { supabase } from "./supabase";

// Similarity colour markers. Change the "min" numbers to make matching stricter or looser.
export const LEVELS = [
  { c: "green", t: "High match", min: 0.5 },
  { c: "orange", t: "Fair match", min: 0.05},
  { c: "red", t: "Poor match", min: 0 },
];
export const simLevel = (s) => LEVELS.find((l) => (s ?? 0) >= l.min) || LEVELS[2];

export const Sim = ({ value }) => {
  const l = simLevel(value);
  return (
    <span className="sim">
      <i className={l.c} />
      {l.t}
    </span>
  );
};

export const Msg = ({ m }) => (m ? <div className={"msg " + m.t}>{m.m}</div> : null);

const PATHS = {
  camera: "M4 8h3l2-3h6l2 3h3v11H4z M12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
  upload: "M12 16V4 M7 9l5-5 5 5 M4 20h16",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14z M21 21l-4.3-4.3",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c0-4 3.6-6 8-6s8 2 8 6",
};
export const Icon = ({ n }) => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
    <path d={PATHS[n]} />
  </svg>
);

// Checks a row every 2 seconds until isDone(row) is true (works even if Realtime is off).
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
