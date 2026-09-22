import { useState } from "react";
import { useSite } from "../lib/context";
import { requireDb, result, safeUrl, defaults } from "../lib/api";
import { Field, Notice, LoadState } from "../components/UI";
import { useLoad } from "../lib/hooks";
export default function AdminSettings() {
  const state = useLoad(
    () =>
      result(
        requireDb()
          .from("site_settings")
          .select("data")
          .eq("id", true)
          .single(),
      ),
    [],
  );
  return (
    <LoadState state={state}>
      {state.data && <SettingsForm initial={state.data.data} />}
    </LoadState>
  );
}
function SettingsForm({ initial }) {
  const { setSettings } = useSite();
  const [form, setForm] = useState({ ...defaults, ...initial }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved("");
    try {
      for (const key of ["instagram", "facebook", "pinterest", "logo_url"])
        if (form[key] && !safeUrl(form[key]))
          throw new Error("Use an HTTPS URL for " + key + ".");
      if (form.whatsapp && !/^\d{7,15}$/.test(form.whatsapp.replace(/\D/g, "")))
        throw new Error("Enter a WhatsApp number with country code.");
      await result(
        requireDb().from("site_settings").upsert({ id: true, data: form }),
      );
      setSettings(form);
      setSaved("Settings saved. Public pages use these settings.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Website settings</h1>
      <p>
        These fields are public website content. Never enter passwords, secret
        keys or private notes here.
      </p>
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <div className="form-grid">
            {[
              ["brand_name", "Brand name", "text"],
              ["logo_url", "Logo URL (existing logo: /logo.png)", "text"],
              ["email", "Contact email", "email"],
              ["phone", "Contact phone", "tel"],
              ["whatsapp", "WhatsApp number including country code", "tel"],
              ["instagram", "Instagram URL", "url"],
              ["facebook", "Facebook URL", "url"],
              ["pinterest", "Pinterest URL", "url"],
            ].map(([k, label, type]) => (
              <Field
                key={k}
                label={label}
                type={type}
                required={k === "brand_name"}
                value={form[k] || ""}
                onChange={(e) => set(k, e.target.value)}
              />
            ))}
            {[
              ["address", "Business address"],
              ["announcement", "Announcement bar"],
              ["hero_title", "Homepage headline"],
              ["hero_text", "Homepage introduction"],
              ["story_title", "Our Story headline"],
              ["story_text", "Our Story content — verified information only"],
              ["footer_text", "Footer content"],
              [
                "whatsapp_template",
                "WhatsApp message — placeholders: {brand}, {product}, {sku}, {url}",
              ],
              ["privacy_text", "Privacy Policy — owner-reviewed text"],
              ["terms_text", "Terms & Conditions — owner-reviewed text"],
            ].map(([k, label]) => (
              <label className="field form-full" key={k}>
                {label}
                <textarea
                  rows={
                    ["story_text", "privacy_text", "terms_text"].includes(k)
                      ? 6
                      : 2
                  }
                  value={form[k] || ""}
                  onChange={(e) => set(k, e.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="check-row">
            {[
              ["show_prices", "Display configured public prices"],
              ["show_featured", "Show featured products on home"],
              ["show_new", "Show new arrivals on home"],
            ].map(([k, label]) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={!!form[k]}
                  onChange={(e) => set(k, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {error && <Notice error>{error}</Notice>}
        {saved && <Notice>{saved}</Notice>}
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save website settings"}
        </button>
      </form>
    </>
  );
}
