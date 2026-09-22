import { useEffect, useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { configured, requireDb, result, supabase } from "../lib/api";
import Meta from "../components/Meta";
import { Field, Notice } from "../components/UI";
export default function Admin() {
  const [session, setSession] = useState(null),
    [admin, setAdmin] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let alive = true,
      version = 0;
    const check = async (next) => {
      const current = ++version;
      if (!alive) return;
      setSession(next);
      setAdmin(false);
      setLoading(true);
      try {
        const authorized = next
          ? await result(supabase.rpc("is_admin"))
          : false;
        if (alive && current === version) setAdmin(authorized);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive && current === version) setLoading(false);
      }
    };
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setError(error.message);
        setLoading(false);
      } else check(data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setTimeout(() => check(next), 0);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const { error } = await requireDb().auth.signInWithPassword({
        email: form.get("email"),
        password: form.get("password"),
      });
      if (error) throw error;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setError("");
    const { error } = await requireDb().auth.signOut();
    if (error) setError(error.message);
    else {
      setSession(null);
      setAdmin(false);
    }
  }
  return (
    <>
      <Meta title="Private administration" noindex />
      {loading ? (
        <Notice>Checking your access…</Notice>
      ) : !session ? (
        <main className="admin-login">
          <Link to="/" className="footer-brand">
            Epic Homez
          </Link>
          <p className="section-label">Private studio</p>
          <h1>Welcome back.</h1>
          <p>Sign in to manage your catalogue and enquiries.</p>
          {!configured && (
            <Notice>
              The admin service is not configured yet. Follow the Supabase setup
              instructions in the project README.
            </Notice>
          )}
          <form onSubmit={login} className="form-stack">
            <Field
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="username"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
            {error && <Notice error>{error}</Notice>}
            <button className="primary" disabled={busy || !configured}>
              {busy ? "Signing in…" : "Sign in →"}
            </button>
          </form>
          <p className="fine-print">
            Access is invitation-only. Contact the project owner if you need an
            account or password reset.
          </p>
        </main>
      ) : !admin ? (
        <main className="admin-login">
          <h1>Access restricted</h1>
          <p>This account is not an authorized administrator.</p>
          {error && <Notice error>{error}</Notice>}
          <button onClick={logout}>Sign out</button>
        </main>
      ) : (
        <div className="admin-shell">
          <aside className="admin-sidebar">
            <Link to="/" className="footer-brand">
              Epic Homez
            </Link>
            <p className="section-label">Private studio</p>
            <nav aria-label="Admin navigation">
              {[
                ["/admin", "Overview"],
                ["/admin/products", "Products"],
                ["/admin/enquiries", "Enquiries"],
                ["/admin/settings", "Settings"],
              ].map(([to, label]) => (
                <NavLink end key={to} to={to}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <Link to="/">View public website ↗</Link>
            <button onClick={logout}>Sign out</button>
          </aside>
          <main className="admin-main" id="main">
            {error && <Notice error>{error}</Notice>}
            <Outlet />
          </main>
        </div>
      )}
    </>
  );
}
