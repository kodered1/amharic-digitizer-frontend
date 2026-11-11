import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Viewer({ id, onClose }) {
  const [doc, setDoc] = useState(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setDoc(null);
    setNote("");
    supabase.from("documents").select("id,doc_name,tag,image_url,ocr_text").eq("id", id).single()
      .then(({ data, error }) => {
        if (error) setNote(error.message);
        else { setDoc(data); setText(data.ocr_text || ""); }
      });
  }, [id]);

  async function save() {
    setNote("Saving…");
    const { error } = await supabase.from("documents").update({ ocr_text: text }).eq("id", id);
    setNote(error ? error.message : "Changes saved.");
  }

  if (!doc) return <section className="viewer card">{note || "Loading…"}</section>;
  return (
    <section className="viewer">
      <button className="link" onClick={onClose}>Close document</button>
      <h2>{doc.doc_name}</h2>
      {doc.tag && <span className="tag">{doc.tag}</span>}
      <a href={doc.image_url} target="_blank" rel="noreferrer"><img src={doc.image_url} alt={doc.doc_name} /></a>
      <label className="f">Extracted text (editable)</label>
      <textarea lang="am" rows={12} value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn" style={{ marginTop: 12 }} onClick={save}>Save changes</button>
      <p className="muted small">{note} Edits are stored with the document but do not change how it is matched in search.</p>
    </section>
  );
}
