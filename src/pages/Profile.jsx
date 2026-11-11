import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Msg } from "../lib";

export default function Profile() {
  const [p, setP] = useState(null);
  const [email, setEmail] = useState("");
  const [orig, setOrig] = useState("");
  const [pw, setPw] = useState("");
  const [m1, setM1] = useState(null);
  const [m2, setM2] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user.email);
      setOrig(user.email);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data && data.email !== user.email) await supabase.from("profiles").update({ email: user.email }).eq("id", user.id);
      setP(data);
    })();
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setM1(null);
    const { error } = await supabase.from("profiles")
      .update({ full_name: p.full_name.trim(), username: p.username.trim().toLowerCase() }).eq("id", p.id);
    if (error) return setM1({ t: "err", m: error.code === "23505" ? "That username is already taken." : error.message });
    if (email !== orig) {
      const { error: e2 } = await supabase.auth.updateUser({ email });
      if (e2) return setM1({ t: "err", m: e2.message });
      return setM1({ t: "ok", m: "Saved. Check your inbox to confirm the new email address." });
    }
    setM1({ t: "ok", m: "Profile saved." });
  }

  async function changePw(e) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setM2(error ? { t: "err", m: error.message } : { t: "ok", m: "Password updated." });
    if (!error) setPw("");
  }

  if (!p) return <p className="muted">Loading…</p>;
  return (
    <div className="narrow">
      <h1>Profile</h1>
      <form className="card" onSubmit={saveProfile}>
        <div className="avatar">{Array.from(p.full_name || "?")[0]}</div>
        <label className="f">Full name</label>
        <input required value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} />
        <label className="f">Username</label>
        <input required value={p.username} onChange={(e) => setP({ ...p, username: e.target.value })} />
        <label className="f">Email</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Msg m={m1} />
        <button className="btn" style={{ marginTop: 16 }}>Save profile</button>
      </form>

      <form className="card" onSubmit={changePw}>
        <label className="f" style={{ marginTop: 0 }}>New password</label>
        <input required type="password" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <Msg m={m2} />
        <button className="btn" style={{ marginTop: 16 }}>Change password</button>
      </form>

      <button className="btn alt" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  );
}
