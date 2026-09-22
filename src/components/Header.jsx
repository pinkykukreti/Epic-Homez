import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useSite } from "../lib/context";
import { safeUrl } from "../lib/api";
export default function Header() {
  const [open, setOpen] = useState(false);
  const { settings } = useSite();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {settings.announcement && (
        <div className="announcement">{settings.announcement}</div>
      )}
      <header className="site-header">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <img
            src={safeUrl(settings.logo_url, "/logo.png")}
            alt={settings.brand_name}
          />
          <span>HOME, BEAUTIFULLY YOURS</span>
        </Link>
        <button
          className="menu-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">{open ? <path d="M6 6l12 12M18 6L6 18"/> : <path d="M4 7h16M4 12h16M4 17h16"/>}</svg>
        </button>
        <nav
          id="main-nav"
          className={`site-navigation ${open ? "open" : ""}`}
          aria-label="Main navigation"
        >
          {[
            ["/", "Home"],
            ["/products", "The Collection"],
            ["/our-story", "Our Story"],
            ["/contact", "Contact"],
          ].map(([to, label]) => (
            <NavLink key={to} to={to} end onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
          <Link
            className="nav-cta"
            to="/contact"
            onClick={() => setOpen(false)}
          >
            Let’s talk ↗
          </Link>
        </nav>
      </header>
    </>
  );
}
