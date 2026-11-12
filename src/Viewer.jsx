import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Icon, Highlight, deleteDoc } from "./lib";

export default function Viewer({ id, q, onClose, onGone }) {
  const [doc, setDoc] = useState(null);
  const [imgs, setImgs] = useState([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState(q ? "hl" : "edit");
  const [note, setNote] = useState("");
  const [ed, setEd] = useState(false);
  const [t, setT] = useState("");
  const [g, setG] = useState("");

  useEffect(() => {
    setDoc(null); setNote(""); setEd(false);
    (async () => {
      const { data, error } = await supabase.from("documents").select("id,doc_name,title,tag,image_url,ocr_text").eq("id", id).single();
      if (error) return setNote(error.message);
      const { data: pg } = await supabase.from("pages").select("image_url").eq("document_id", id).order("page_no");
      setDoc(data); setText(data.ocr_text || ""); setT(data.doc_name); setG(data.tag || "");
      setImgs(pg?.length ? pg.map((p) => p.image_url) : [data.image_url]);
    })();
  }, [id]);

  async function saveText() {
    setNote("Saving…");
    const { error } = await supabase.from("documents").update({ ocr_text: text }).eq("id", id);
    setNote(error ? error.message : "Changes saved.");
  }
  async function saveDetails() {
    const name = t.trim() || doc.doc_name;
    const { error } = await supabase.from("documents").update({ doc_name: name, title: name, tag: g.trim() || null }).eq("id", id);
    if (error) return setNote(error.message);
    setDoc({ ...doc, doc_name: name, tag: g.trim() || null });
    setEd(false); setNote("Details saved.");
  }
  async function copy() { await navigator.clipboard.writeText(text); setNote("Copied to clipboard."); }
  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    a.download = (doc.doc_name.replace(/[^\p{L}\p{N}_-]+/gu, "_") || "document") + ".txt";
    a.click();
  }
  async function remove() {
    if (!confirm(`Delete "${doc.doc_name}"? This cannot be undone.`)) return;
    try { await deleteDoc(id); onGone(); } catch (e) { setNote(e.message); }
  }

  if (!doc) return <section className="viewer card">{note || "Loading…"}</section>;
  return (
    <section className="viewer">
      <div className="vhead">
        <button className="link" onClick={onClose}>Close document</button>
        <button className="link danger" onClick={remove}><Icon n="trash" /> Delete</button>
      </div>
      {ed ? (
        <div className="card">
          <label className="f" style={{ marginTop: 0 }}>Title</label>
          <input value={t} onChange={(e) => setT(e.target.value)} />
          <label className="f">Tag</label>
          <input value={g} onChange={(e) => setG(e.target.value)} />
          <div className="row"><button className="btn" onClick={saveDetails}>Save details</button><button className="btn alt" onClick={() => setEd(false)}>Cancel</button></div>
        </div>
      ) : (
        <div className="vtitle"><h2>{doc.doc_name}</h2>{doc.tag && <span className="tag">{doc.tag}</span>}<button className="link" onClick={() => setEd(true)}>Edit title and tag</button></div>
      )}
      <div className="vgrid">
        <div className="imgs">{imgs.map((u, i) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt={`Page ${i + 1}`} /></a>)}</div>
        <div>
          <div className="tabs">
            <button className={mode === "edit" ? "on" : ""} onClick={() => setMode("edit")}>Edit text</button>
            <button className={mode === "hl" ? "on" : ""} onClick={() => setMode("hl")}>Highlight matches</button>
          </div>
          {mode === "edit"
            ? <textarea lang="am" rows={14} value={text} onChange={(e) => setText(e.target.value)} />
            : <div className="hl" lang="am"><Highlight text={text} q={q} /></div>}
          <div className="row">
            <button className="btn" onClick={saveText}>Save changes</button>
            <button className="btn alt" onClick={copy}><Icon n="copy" /> Copy</button>
            <button className="btn alt" onClick={download}><Icon n="download" /> .txt</button>
          </div>
          <p className="muted small">{note} Edits are stored with the document but do not change how it is matched in search.</p>
        </div>
      </div>
    </section>
  );
}
