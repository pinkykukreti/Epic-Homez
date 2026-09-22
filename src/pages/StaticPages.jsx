import { Link } from "react-router-dom";
import { useSite } from "../lib/context";
import { configured, safeUrl, whatsappUrl } from "../lib/api";
import { EnquiryForm } from "../components/EnquiryForm";
import Meta from "../components/Meta";
export function Story() {
  const { settings: s } = useSite();
  return (
    <>
      <Meta title="Our Story" />
      <section className="page-heading">
        <p className="section-label">Meet {s.brand_name}</p>
        <h1>{s.story_title}</h1>
      </section>
      <section className="story-page">
        <div className="story-image" />
        <div>
          <h2>A home is personal.</h2>
          <p className="preserve-lines">{s.story_text}</p>
          <p>
            Our website gives you space to browse. When something catches your
            eye, send a request for its price, availability and details.
          </p>
          <Link className="primary" to="/products">
            Explore the collection ↗
          </Link>
        </div>
      </section>
    </>
  );
}
export function Contact() {
  const { settings: s } = useSite();
  const wa = whatsappUrl(s);
  return (
    <>
      <Meta title="Contact Us" />
      <section className="page-heading">
        <p className="section-label">We’d love to hear from you</p>
        <h1>Let’s make it feel like home.</h1>
        <p>Ask about a product, a price, or the details that matter to you.</p>
      </section>
      <section className="contact-layout">
        <div>
          <h2>Start a conversation</h2>
          <p>Contact us for prices, availability and product details.</p>
          {s.email && (
            <p>
              <a href={"mailto:" + s.email}>{s.email}</a>
            </p>
          )}
          {s.phone && (
            <p>
              <a href={"tel:" + s.phone.replace(/[^\d+]/g, "")}>{s.phone}</a>
            </p>
          )}
          {s.address && <p className="preserve-lines">{s.address}</p>}
          {wa && (
            <>
              <a
                className="secondary"
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open WhatsApp ↗
              </a>
              <p className="fine-print">
                This opens WhatsApp. It does not save a website enquiry.
              </p>
            </>
          )}
          {safeUrl(s.instagram) && (
            <p>
              <a
                href={safeUrl(s.instagram)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram ↗
              </a>
            </p>
          )}
        </div>
        <div className="contact-form-panel"><p className="section-label">A personal enquiry</p><h2>Tell us what you have in mind.</h2><EnquiryForm /></div>
      </section>
    </>
  );
}
export function Policy({ type }) {
  const { settings: s } = useSite();
  const privacy = type === "privacy",
    title = privacy ? "Privacy Policy" : "Terms & Conditions";
  return (
    <>
      <Meta title={title} />
      <section className="page-heading">
        <p className="section-label">{s.brand_name}</p>
        <h1>{title}</h1>
      </section>
      <article className="prose">
        {s[privacy ? "privacy_text" : "terms_text"] ? (
          <p className="preserve-lines">
            {s[privacy ? "privacy_text" : "terms_text"]}
          </p>
        ) : privacy ? (
          <>
            <h2>Information you provide</h2>
            <p>
              When you submit an enquiry, the website stores your name, phone
              number, optional email, message, quantity and associated product
              details so Epic Homez can respond.
            </p>
            <h2>How enquiries are handled</h2>
            <p>
              Enquiry records are available to authorized administrators. The
              website uses Supabase for database and image services, and
              Cloudflare Turnstile to help prevent automated submissions. When enabled, Resend sends enquiry details to our company inbox so our team can respond. A
              hashed rate-limit identifier is used to limit repeated
              submissions.
            </p>
            <h2>Other services</h2>
            <p>
              WhatsApp and social links open external services with their own
              privacy practices. Enquiries sent through WhatsApp are not
              automatically stored by this website. Product and interior
              photographs may load from external image hosts.
            </p>
            <h2>Your information</h2>
            <p>
              Contact Epic Homez through the contact page to ask about your
              enquiry information or request correction or deletion.
            </p>
            <h2>Browser storage</h2>
            <p>
              The administrator login uses browser storage to maintain a
              session. Public visitors do not need an account.
            </p>
          </>
        ) : (
          <>
            <h2>Catalogue and enquiries</h2>
            <p>
              This website is a product catalogue. Submitting an enquiry does
              not place an order, reserve a product or create a purchase
              contract. The website does not collect payments.
            </p>
            <h2>Product information</h2>
            <p>
              Availability, specifications and any displayed prices should be
              confirmed directly with Epic Homez. Screen settings may affect the
              appearance of colours. Ask for any additional details you need
              before agreeing to a purchase separately.
            </p>
            <h2>Appropriate use</h2>
            <p>
              Provide accurate contact details and use the enquiry form for
              genuine product or business enquiries. Do not submit abusive
              content or attempt to access private administrative records.
            </p>
            <h2>Contact</h2>
            <p>
              For questions about this catalogue,{" "}
              <Link to="/contact">contact Epic Homez</Link>.
            </p>
          </>
        )}
      </article>
    </>
  );
}
export function NotFound() {
  return (
    <>
      <Meta title="Page not found" noindex />
      <section className="not-found">
        <p className="section-label">404 · A small detour</p>
        <h1>This corner is still empty.</h1>
        <p>The page may have moved, or the product is no longer published.</p>
        <Link className="primary" to="/products">
          Back to the collection →
        </Link>
      </section>
    </>
  );
}
