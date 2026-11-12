import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";
import { Icon, Msg, waitFor } from "../lib";

export default function Scan() {
  const [files, setFiles] = useState([]); // [{file, url}]
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState([]);
  const [step, setStep] = useState("idle"); // idle | uploading | reading | done | failed
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [docId, setDocId] = useState(null);
  const busy = step === "uploading" || step === "reading";

  useEffect(() => {
    supabase.from("documents").select("tag").not("tag", "is", null)
      .then(({ data }) => setTags([...new Set((data || []).map((d) => d.tag))].sort()));
  }, []);

  function pick(e) {
    const add = [...e.target.files].map((file) => ({ file, url: URL.createObjectURL(file) }));
    setFiles((f) => [...f, ...add]);
    setStep("idle");
    e.target.value = "";
  }

  async function scan() {
    try {
      setStep("uploading");
      const { data: { user } } = await supabase.auth.getUser();
      const up = [];
      for (const [i, { file }] of files.entries()) {
        setInfo(`Uploading image ${i + 1} of ${files.length}…`);
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
        if (error) throw error;
        up.push({ path, name: file.name, url: supabase.storage.from("documents").getPublicUrl(path).data.publicUrl });
      }
      const { data: doc, error } = await supabase.from("documents")
        .insert({ doc_name: title.trim() || files[0].file.name, title: title.trim() || null, tag: tag.trim() || null, image_path: up[0].path, image_url: up[0].url })
        .select("id").single();
      if (error) throw error;
      // Inserting the pages is what triggers the OCR (one webhook call per page).
      const { error: pe } = await supabase.from("pages").insert(
        up.map((u, i) => ({ document_id: doc.id, page_no: i + 1, file_name: u.name, image_path: u.path, image_url: u.url })));
      if (pe) throw pe;

      setDocId(doc.id);
      setStep("reading");
      const row = await waitFor("documents", doc.id, "status,error_message", (r) => r.status !== "processing", 150000 * files.length);
      if (row.status === "failed") throw new Error(row.error_message || "Text extraction failed.");
      setStep("done");
      setFiles([]); setTitle(""); setTag("");
    } catch (e) {
      setErr(e.message);
      setStep("failed");
    }
  }

  return (
    <>
      <h1>Scan</h1>
      <div className="two">
        <div className="card">
          <div className="pick">
            <label className="btn"><Icon n="camera" /> Take picture
              <input hidden type="file" accept="image/*" capture="environment" onChange={pick} disabled={busy} /></label>
            <label className="btn alt"><Icon n="upload" /> Upload pictures
              <input hidden type="file" accept="image/*" multiple onChange={pick} disabled={busy} /></label>
          </div>
          {files.length === 0 && <p className="muted small">Pick one image, or several to make one multi-page document.</p>}
          <div className="thumbs">
            {files.map((f, i) => (
              <div className="thumb" key={f.url}>
                <img src={f.url} alt={`Page ${i + 1}`} />
                <span className="pn">{i + 1}</span>
                {!busy && <button className="x" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remove">×</button>}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <label className="f" style={{ marginTop: 0 }}>Title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Saudi Arabia notes" />
          <label className="f">Tag (optional)</label>
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. geography" />
          {tags.length > 0 && (
            <div className="chips" style={{ marginTop: 8 }}>
              {tags.map((t) => <button type="button" key={t} className={"chip" + (t === tag ? " on" : "")} onClick={() => setTag(t)}>{t}</button>)}
            </div>
          )}
          <button className="btn" style={{ marginTop: 16 }} disabled={!files.length || busy} onClick={scan}>
            {busy ? "Working…" : files.length > 1 ? `Scan ${files.length} pages` : "Scan page"}
          </button>
          {step === "uploading" && <p className="status"><span className="spin" />{info}</p>}
          {step === "reading" && <p className="status"><span className="spin" />Reading the Amharic text.</p>}
          {step === "done" && <div className="msg ok">Text extracted. <Link to={`/query?doc=${docId}`}>Open document</Link></div>}
          {step === "failed" && <Msg m={{ t: "err", m: err }} />}
        </div>
      </div>
    </>
  );
}
