import { useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { supabase } from "./supabase";
import { Icon } from "./lib";
import Auth from "./pages/Auth";
import Scan from "./pages/Scan";
import Query from "./pages/Query";
import Profile from "./pages/Profile";

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="center">Loading…</div>;
  if (!session) return <Auth />;

  return (
    <div className="app">
      <header>
        <span className="brand">Amharic Digitizer</span>
        <nav>
          <NavLink to="/scan"><Icon n="camera" />Scan</NavLink>
          <NavLink to="/query"><Icon n="search" />Search</NavLink>
          <NavLink to="/profile"><Icon n="user" />Profile</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/scan" element={<Scan />} />
          <Route path="/query" element={<Query />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/scan" replace />} />
        </Routes>
      </main>
    </div>
  );
}
