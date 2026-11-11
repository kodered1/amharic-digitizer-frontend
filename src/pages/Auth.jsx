import { useState } from "react";
import { supabase } from "../supabase";
import { Msg } from "../lib";

export default function Auth() {
  const [mode, setMode] = useState("in");
  const [f, setF] = useState({ fullName: "", username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) setMsg({ t: "err", m: error.message });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: f.email,
        password: f.password,
        options: { data: { full_name: f.fullName.trim(), username: f.username.trim().toLowerCase() } },
      });
      if (error)
        setMsg({ t: "err", m: /database error/i.test(error.message) ? "That username is already taken." : error.message });
      else if (!data.session) setMsg({ t: "ok", m: "Account created. Confirm your email, then sign in." });
    }
    setBusy(false);
  }

  return (
    <div className="auth">
      <div className="card">
        <h1>Amharic Digitizer</h1>
        <p className="muted">Turn scanned Amharic pages into searchable text.</p>
        <div className="tabs">
          <button className={mode === "in" ? "on" : ""} onClick={() => setMode("in")}>Sign in</button>
          <button className={mode === "up" ? "on" : ""} onClick={() => setMode("up")}>Sign up</button>
        </div>
        <form onSubmit={submit}>
          {mode === "up" && (
            <>
              <label className="f">Full name</label>
              <input required value={f.fullName} onChange={set("fullName")} autoComplete="name" />
              <label className="f">Username</label>
              <input required value={f.username} onChange={set("username")} autoComplete="username" />
            </>
          )}
          <label className="f">Email</label>
          <input required type="email" value={f.email} onChange={set("email")} autoComplete="email" />
          <label className="f">Password</label>
          <input required type="password" minLength={6} value={f.password} onChange={set("password")}
            autoComplete={mode === "in" ? "current-password" : "new-password"} />
          <Msg m={msg} />
          <button className="btn" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
