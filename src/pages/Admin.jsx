import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Msg } from "../lib";

export default function Admin() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    supabase.rpc("admin_stats").then(({ data, error }) => (error ? setErr({ t: "err", m: error.message }) : setS(data)));
  }, []);
  if (err) return <><h1>Admin</h1><Msg m={err} /></>;
  if (!s) return <p className="muted">Loading…</p>;
  const cards = [["Users", s.users], ["Documents", s.documents], ["Pages", s.pages], ["Failed scans", s.failed], ["Searches", s.searches], ["Searches today", s.searches_today]];
  return (
    <>
      <h1>Admin</h1>
      <div className="stats">{cards.map(([k, v]) => <div className="card stat" key={k}><b>{v}</b><span className="muted">{k}</span></div>)}</div>
      <div className="two">
        <div className="card"><h2>Recent failed scans</h2>
          {s.recent_failed.length === 0 && <p className="muted">None. Nice.</p>}
          {s.recent_failed.map((d) => <p key={d.id} className="small"><strong>{d.doc_name}</strong><br /><span className="muted">{d.error_message}</span></p>)}
        </div>
        <div className="card"><h2>Newest users</h2>
          {s.recent_users.map((u) => <p key={u.username} className="small"><strong>{u.full_name}</strong> <span className="muted">@{u.username} · {new Date(u.created_at).toLocaleDateString()}</span></p>)}
        </div>
      </div>
    </>
  );
}
