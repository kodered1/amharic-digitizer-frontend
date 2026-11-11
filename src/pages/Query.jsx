import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../supabase";
import { LEVELS, Sim, simLevel, Msg, waitFor } from "../lib";
import Viewer from "../Viewer";

export default function Query() {
  const [params, setParams] = useSearchParams();
  const docId = params.get("doc");
  const [tags, setTags] = useState([]);
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    supabase.from("documents").select("tag").not("tag", "is", null)
      .then(({ data }) => setTags([...new Set((data || []).map((d) => d.tag))].sort()));
  }, []);

  async function search(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setErr(null);
    setResults(null);
    setParams({});
    try {
      // Inserting this row logs the query AND triggers the search (webhook -> Edge Function -> Flask).
      const { data: log, error } = await supabase
        .from("query_logs").insert({ query_text: q.trim(), tag: tag || null }).select("id").single();
      if (error) throw error;
      const r = await waitFor("query_logs", log.id, "status,results,error_message", (x) => x.status !== "searching");
      if (r.status === "failed") throw new Error(r.error_message || "Search failed.");
      setResults(r.results || []);
    } catch (e2) {
      setErr({ t: "err", m: e2.message });
    }
    setBusy(false);
  }

  return (
    <div className={"split" + (docId ? " has-doc" : "")}>
      <section className="list">
        <h1>Search</h1>
        <form className="card" onSubmit={search}>
          <label className="f">Tag</label>
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">All tags</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="f">What are you looking for?</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type Amharic words" lang="am" />
          <button className="btn" disabled={busy || !q.trim()} style={{ marginTop: 16 }}>
            {busy ? "Searching…" : "Search"}
          </button>
        </form>

        <Msg m={err} />
        {busy && <p className="status"><span className="spin" /> Searching your documents…</p>}
        {results && results.length === 0 && <p className="muted">No matching documents. Try other words or a different tag.</p>}
        {results && results.length > 0 && (
          <>
            <div className="legend">{LEVELS.map((l) => <span className="sim" key={l.c}><i className={l.c} />{l.t}</span>)}</div>
            {results.map((r) => (
              <button key={r.docId} className={"result " + simLevel(r.similarity).c + (String(r.docId) === docId ? " on" : "")}
                onClick={() => setParams({ doc: r.docId })}>
                <strong>{r.docName}</strong>
                <span className="snip">{r.content}</span>
                <Sim value={r.similarity} />
              </button>
            ))}
          </>
        )}
      </section>
      {docId && <Viewer id={docId} onClose={() => setParams({})} />}
    </div>
  );
}
