import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";
import { Icon, Msg, deleteDoc } from "../lib";

export default function Library() {
  const [docs, setDocs] = useState(null);
  const [tag, setTag] = useState("");
  const [err, setErr] = useState(null);

  const load = () => supabase.from("documents").select("id,doc_name,tag,image_url,status,created_at")
    .order("created_at", { ascending: false }).then(({ data }) => setDocs(data || []));
  useEffect(() => { load(); }, []);

  async function del(d) {
    if (!confirm(`Delete "${d.doc_name}"? This cannot be undone.`)) return;
    try { await deleteDoc(d.id); setDocs(docs.filter((x) => x.id !== d.id)); }
    catch (e) { setErr({ t: "err", m: e.message }); }
  }

  if (!docs) return <p className="muted">Loading…</p>;
  const tags = [...new Set(docs.map((d) => d.tag).filter(Boolean))].sort();
  const shown = tag ? docs.filter((d) => d.tag === tag) : docs;

  return (
    <>
      <h1>Library</h1>
      <Msg m={err} />
      {tags.length > 0 && (
        <div className="chips" style={{ marginBottom: 14 }}>
          <button className={"chip" + (!tag ? " on" : "")} onClick={() => setTag("")}>All</button>
          {tags.map((t) => <button key={t} className={"chip" + (t === tag ? " on" : "")} onClick={() => setTag(t)}>{t}</button>)}
        </div>
      )}
      {shown.length === 0 && <p className="muted">No documents yet. Scan your first page to see it here.</p>}
      <div className="grid">
        {shown.map((d) => (
          <div className="doc" key={d.id}>
            <Link to={`/query?doc=${d.id}`}>
              <img src={d.image_url} alt="" loading="lazy" />
              <div className="b">
                <strong>{d.doc_name}</strong>
                <div className="meta">
                  {d.tag && <span className="tag">{d.tag}</span>}
                  {d.status !== "done" && <span className="badge">{d.status}</span>}
                  <span className="muted small">{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
            <button className="del" onClick={() => del(d)} aria-label={`Delete ${d.doc_name}`}><Icon n="trash" /></button>
          </div>
        ))}
      </div>
    </>
  );
}
