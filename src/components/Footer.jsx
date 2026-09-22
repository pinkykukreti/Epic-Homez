import { Link } from "react-router-dom";
import { useSite } from "../lib/context";
import { safeUrl, whatsappUrl } from "../lib/api";
export default function Footer() {
  const { settings: s, categories } = useSite();
  const wa = whatsappUrl(s);
  return (
    <footer className="site-footer">
      <div>
        <Link to="/" className="footer-brand">
          <img src={safeUrl(s.logo_url, "/logo.png")} alt={s.brand_name} />
        </Link>
        <p>{s.footer_text}</p>
        <small>
          A catalogue to explore.
          <br />A conversation to find your favourites.
        </small>
      </div>
      <div>
        <h3>Explore</h3>
        <Link to="/products">All Products</Link>
        {categories.map((c) => (
          <Link key={c.slug} to={"/collections/" + c.slug}>
            {c.name}
          </Link>
        ))}
      </div>
      <div>
        <h3>Make yourself at home</h3>
        <Link to="/our-story">Our Story</Link>
        <Link to="/contact">Contact Us</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms & Conditions</Link>
      </div>
      <div>
        <h3>Stay connected</h3>
        {s.email && <a href={"mailto:" + s.email}>{s.email}</a>}
        {s.phone && (
          <a href={"tel:" + s.phone.replace(/[^\d+]/g, "")}>{s.phone}</a>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer">
            Enquire on WhatsApp ↗
          </a>
        )}
        {["instagram", "facebook", "pinterest"]
          .filter((k) => safeUrl(s[k]))
          .map((k) => (
            <a
              key={k}
              href={safeUrl(s[k])}
              target="_blank"
              rel="noopener noreferrer"
            >
              {k.charAt(0).toUpperCase() + k.slice(1)} ↗
            </a>
          ))}
        {s.address && <p>{s.address}</p>}
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} {s.brand_name}
        <span>Browse. Discover. Enquire.</span>
      </div>
    </footer>
  );
}
