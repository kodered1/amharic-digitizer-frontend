import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";
import { Icon, Msg, waitFor } from "../lib";

export default function Scan() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [step, setStep] = useState("idle"); // idle | uploading | reading | done | failed
  const [err, setErr] = useState("");
  const [docId, setDocId] = useState(null);
  const busy = step === "uploading" || step === "reading";

  function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep("idle");
    e.target.value = "";
  }

  async function scan() {
    try {
      setStep("uploading");
      const { data: { user } } = await supabase.auth.getUser();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);

      // Inserting this row is what triggers the OCR (database webhook -> Edge Function -> Flask).
      // Search results only return docName, so the title (if given) is used as the name.
      const { data: doc, error } = await supabase
        .from("documents")
        .insert({ doc_name: title.trim() || file.name, title: title.trim() || null, tag: tag.trim() || null, image_path: path, image_url: publicUrl })
        .select("id")
        .single();
      if (error) throw error;

      setDocId(doc.id);
      setStep("reading");
      const row = await waitFor("documents", doc.id, "status,error_message", (r) => r.status !== "processing");
      if (row.status === "failed") throw new Error(row.error_message || "Text extraction failed.");
      setStep("done");
      setFile(null);
      setPreview(null);
      setTitle("");
      setTag("");
    } catch (e) {
      setErr(e.message);
      setStep("failed");
    }
  }

  return (
    <div className="narrow">
      <h1>Scan a page</h1>
      <div className="card">
        <div className="pick">
          <label className="btn">
            <Icon n="camera" /> Take picture
            <input hidden type="file" accept="image/*" capture="environment" onChange={pick} disabled={busy} />
          </label>
          <label className="btn alt">
            <Icon n="upload" /> Upload picture
            <input hidden type="file" accept="image/*" onChange={pick} disabled={busy} />
          </label>
        </div>
        {preview && <img className="prev" src={preview} alt="Selected page" />}
      </div>

      <div className="card">
        <label className="f">Title (optional)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Saudi Arabia notes" />
        <label className="f">Tag (optional)</label>
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. geography" />
        <button className="btn" style={{ marginTop: 16 }} disabled={!file || busy} onClick={scan}>
          {busy ? "Working…" : "Scan page"}
        </button>
        {step === "uploading" && <p className="status"><span className="spin" /> Uploading image…</p>}
        {step === "reading" && (
          <p className="status"><span className="spin" /> Reading the Amharic text. The first scan can take a minute while the server wakes up.</p>
        )}
        {step === "done" && (
          <div className="msg ok">Text extracted. <Link to={`/query?doc=${docId}`}>Open document</Link></div>
        )}
        {step === "failed" && <Msg m={{ t: "err", m: err }} />}
      </div>
    </div>
  );
}
