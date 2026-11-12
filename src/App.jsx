import { useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { supabase } from "./supabase";
import { Icon } from "./lib";
import Auth from "./pages/Auth";
import Scan from "./pages/Scan";
import Library from "./pages/Library";
import Query from "./pages/Query";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return setRole(null);
    supabase.from("profiles").select("role").eq("id", session.user.id).single().then(({ data }) => setRole(data?.role));
  }, [session]);

  if (session === undefined) return <div className="center">Loading…</div>;
  if (!session) return <Auth />;

  return (
    <div className="app">
      <aside>
        <span className="brand">Amharic Digitizer</span>
        <nav>
          <NavLink to="/scan"><Icon n="camera" /><span>Scan</span></NavLink>
          <NavLink to="/library"><Icon n="library" /><span>Library</span></NavLink>
          <NavLink to="/query"><Icon n="search" /><span>Search</span></NavLink>
          <NavLink to="/profile"><Icon n="user" /><span>Profile</span></NavLink>
          {role === "admin" && <NavLink to="/admin"><Icon n="shield" /><span>Admin</span></NavLink>}
        </nav>
        <button className="link theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <Icon n="moon" /><span>{theme === "dark" ? "Light" : "Dark"} mode</span>
        </button>
      </aside>
      <main>
        <Routes>
          <Route path="/scan" element={<Scan />} />
          <Route path="/library" element={<Library />} />
          <Route path="/query" element={<Query />} />
          <Route path="/profile" element={<Profile />} />
          {role === "admin" && <Route path="/admin" element={<Admin />} />}
          <Route path="*" element={<Navigate to="/scan" replace />} />
        </Routes>
      </main>
    </div>
  );
}
