import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { configured, requireDb } from "../lib/api";
import { Field, Notice } from "./UI";
import { useSite } from "../lib/context";
let scriptPromise;
function loadCaptcha() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise)
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(
          new Error("Verification could not load. Please refresh to retry."),
        );
      };
      document.head.append(script);
    });
  return scriptPromise;
}
function Captcha({ onToken, reset }) {
  const ref = useRef(),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true,
      id;
    loadCaptcha()
      .then(() => {
        if (alive)
          id = window.turnstile.render(ref.current, {
            sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
            action: "enquiry",
            size: "flexible",
            callback: onToken,
            "expired-callback": () => onToken(""),
            "error-callback": () => {
              onToken("");
              setError("Verification failed. Please retry.");
            },
          });
      })
      .catch((e) => setError(e.message));
    return () => {
      alive = false;
      if (id !== undefined) window.turnstile?.remove(id);
    };
  }, [reset]);
  return (
    <>
      <div ref={ref} />
      {error && <Notice error>{error}</Notice>}
    </>
  );
}
export function EnquiryForm({ product, onDone }) {
  const { settings } = useSite();
  const [draft, setDraft] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [id, setId] = useState(""),
    [token, setToken] = useState(""),
    [reset, setReset] = useState(0);
  const available =
    configured && Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = Object.fromEntries(new FormData(e.currentTarget));
      if (!available) {
        const text = ['Name: ' + body.customer_name, 'Phone: ' + body.phone, 'Email: ' + (body.email || 'Not provided'), 'Product: ' + (product?.name || 'General enquiry'), 'Quantity: ' + (body.quantity || 'Not specified'), '', body.message || ''].join('\n');
        window.location.href = 'mailto:' + encodeURIComponent(settings.email || 'epichomezstore@gmail.com') + '?subject=' + encodeURIComponent('Epic Homez product enquiry') + '&body=' + encodeURIComponent(text);
        setDraft(true);
        return;
      }
      body.product_id = product?.id || null;
      body.captcha_token = token;
      const { data, error: err } = await requireDb().functions.invoke(
        "submit-enquiry",
        { body },
      );
      if (err) {
        let message = err.message;
        try {
          message = (await err.context.json()).error || message;
        } catch {}
        throw new Error(message);
      }
      if (!data?.id)
        throw new Error(data?.error || "Your enquiry could not be saved.");
      setId(data.id);
    } catch (err) {
      setError(err.message);
      setToken("");
      setReset((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }
  if (id)
    return (
      <Notice>
        <h3>Thank you. Your enquiry has been saved.</h3>
        <p>
          Epic Homez can now review your request and contact you using the
          details you provided.
        </p>
        <small>Reference: {id}</small>
        {onDone && (
          <p>
            <button onClick={onDone}>Close</button>
          </p>
        )}
      </Notice>
    );
  return (
    <form onSubmit={submit} className="form-grid">
      {product && (
        <div className="form-full selected-product">
          <small>YOU’RE ENQUIRING ABOUT</small>
          <h3>{product.name}</h3>
          {product.sku && <span>SKU {product.sku}</span>}
        </div>
      )}
      <Field
        label="Your name *"
        name="customer_name"
        required
        minLength={2}
        maxLength={100}
        autoComplete="name"
      />
      <Field
        label="Phone / WhatsApp number *"
        name="phone"
        type="tel"
        required
        minLength={7}
        maxLength={30}
        pattern="[+0-9\s\(\)\.\-]{7,30}"
        autoComplete="tel"
      />
      <Field
        label="Email (optional)"
        name="email"
        type="email"
        maxLength={254}
        autoComplete="email"
      />
      <Field
        label="Quantity (optional)"
        name="quantity"
        type="number"
        min="1"
        max="100000"
        step="1"
      />
      <label className="field form-full">
        Message (optional)
        <textarea name="message" rows="4" maxLength={3000} />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="form-full">
        <p className="fine-print">
          We’ll use these details to respond to your enquiry. Read our{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
        {available ? (
          <Captcha onToken={setToken} reset={reset} />
        ) : (
          <Notice>
            Direct submission is being set up. This form opens a draft in your email app; you must send it there.
          </Notice>
        )}
        {draft && <Notice>Your email draft was requested. If your email app did not open, please email {settings.email} directly. Nothing has been submitted by this website.</Notice>}
        {error && <Notice error>{error}</Notice>}
        <button className="primary" disabled={(available && !token) || busy}>
          {busy ? "Sending your enquiry…" : available ? "Send enquiry →" : "Open email draft →"}
        </button>
        <p className="fine-print">
          {available ? "Your details are saved securely for our team. This does not place an order." : "Prefer a direct conversation? Our WhatsApp contact is available too."}
        </p>
      </div>
    </form>
  );
}
export default function EnquiryDialog({ product, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const focus = document.activeElement;
    ref.current.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      focus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="enquiry-dialog"
      aria-labelledby="enquiry-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-content">
        <button
          className="close-button"
          aria-label="Close enquiry"
          onClick={onClose}
        >
          ✕
        </button>
        <p className="section-label">Let’s find your favourite</p>
        <h2 id="enquiry-title">Request a price</h2>
        <EnquiryForm product={product} onDone={onClose} />
      </div>
    </dialog>
  );
}

