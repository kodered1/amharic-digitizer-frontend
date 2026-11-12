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
  const [searched, setSearched] = useState("");
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [hist, setHist] = useState([]);
  const [sort, setSort] = useState("best");
  const [hidePoor, setHidePoor] = useState(false);

  const loadHist = () => supabase.from("query_logs").select("query_text,tag").order("created_at", { ascending: false }).limit(30)
    .then(({ data }) => {
      const seen = new Set();
      setHist((data || []).filter((h) => { const k = h.query_text + "|" + (h.tag || ""); return seen.has(k) ? false : seen.add(k); }).slice(0, 8));
    });

  useEffect(() => {
    supabase.from("documents").select("tag").not("tag", "is", null)
      .then(({ data }) => setTags([...new Set((data || []).map((d) => d.tag))].sort()));
    loadHist();
  }, []);

  async function run(text, t) {
    setBusy(true); setErr(null); setResults(null); setParams({}); setSearched(text);
    try {
      // Inserting this row logs the query AND triggers the search.
      const { data: log, error } = await supabase.from("query_logs").insert({ query_text: text, tag: t || null }).select("id").single();
      if (error) throw error;
      const r = await waitFor("query_logs", log.id, "status,results,error_message", (x) => x.status !== "searching");
      if (r.status === "failed") throw new Error(r.error_message || "Search failed.");
      setResults(r.results || []);
      loadHist();
    } catch (e) { setErr({ t: "err", m: e.message }); }
    setBusy(false);
  }
  const submit = (e) => { e.preventDefault(); if (q.trim()) run(q.trim(), tag); };
  const again = (h) => { setQ(h.query_text); setTag(h.tag || ""); run(h.query_text, h.tag || ""); };

  let shown = results;
  if (shown) {
    if (hidePoor) shown = shown.filter((r) => simLevel(r.similarity).c !== "red");
    shown = [...shown].sort(sort === "name" ? (a, b) => a.docName.localeCompare(b.docName) : (a, b) => b.similarity - a.similarity);
  }

  return (
    <>
      <h1>Search</h1>
      <div className={"split" + (docId ? " has-doc" : "")}>
        <section className="list">
          <form className="card" onSubmit={submit}>
            <label className="f" style={{ marginTop: 0 }}>Tag</label>
            <select value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">All tags</option>
              {tags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="f">What are you looking for?</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type Amharic words" lang="am" />
            <button className="btn" disabled={busy || !q.trim()} style={{ marginTop: 16 }}>{busy ? "Searching…" : "Search"}</button>
            {hist.length > 0 && (
              <>
                <label className="f">Recent searches</label>
                <div className="chips">
                  {hist.map((h, i) => <button type="button" className="chip" key={i} onClick={() => again(h)}>{h.query_text}{h.tag ? ` · ${h.tag}` : ""}</button>)}
                </div>
              </>
            )}
          </form>

          <Msg m={err} />
          {busy && <p className="status"><span className="spin" />Searching your documents…</p>}
          {shown && results.length === 0 && <p className="muted">No matching documents. Try other words or a different tag.</p>}
          {shown && results.length > 0 && (
            <>
              <div className="bar">
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
                  <option value="best">Best match first</option><option value="name">Name A to Z</option>
                </select>
                <label className="chk"><input type="checkbox" checked={hidePoor} onChange={(e) => setHidePoor(e.target.checked)} /> Hide poor matches</label>
              </div>
              <div className="legend">{LEVELS.map((l) => <span className="sim" key={l.c}><i className={l.c} />{l.t}</span>)}</div>
              {shown.map((r) => (
                <button key={r.docId} className={"result " + simLevel(r.similarity).c + (String(r.docId) === docId ? " on" : "")} onClick={() => setParams({ doc: r.docId })}>
                  <strong>{r.docName}</strong>
                  <span className="snip">{r.content}</span>
                  <Sim value={r.similarity} />
                </button>
              ))}
              {shown.length === 0 && <p className="muted">Everything was hidden. Untick "Hide poor matches" to see all results.</p>}
            </>
          )}
        </section>
        {docId
          ? <Viewer id={docId} q={searched} onClose={() => setParams({})}
              onGone={() => { setResults((r) => r && r.filter((x) => String(x.docId) !== docId)); setParams({}); }} />
          : <div className="empty card">Select a result or a document to preview it here.</div>}
      </div>
    </>
  );
}
