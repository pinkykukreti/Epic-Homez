import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { requireDb, result, searchTerm } from "../lib/api";
import { useLoad, useDebounce } from "../lib/hooks";
import { Field, Notice, LoadState, Pagination, Empty } from "../components/UI";
const statuses = ["New", "Contacted", "Follow-up Required", "Closed"];
function EnquiryDetail({ id, onClose, onSaved }) {
  const state = useLoad(
    () =>
      result(
        requireDb()
          .from("enquiries")
          .select("*,products(name,slug,sku,published)")
          .eq("id", id)
          .single(),
      ),
    [id],
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("");
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      await result(requireDb().from("enquiries").update(data).eq("id", id));
      setSaved("Enquiry updated.");
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const item = state.data;
  return (
    <section>
      <button onClick={onClose}>← All enquiries</button>
      <h2>Enquiry details</h2>
      <LoadState state={state}>
        {item && (
          <>
            <div className="enquiry-summary">
              <h3>{item.customer_name}</h3>
              <p>
                <a href={"tel:" + item.phone.replace(/[^\d+]/g, "")}>
                  {item.phone}
                </a>
                {" · "}
                <a
                  href={"https://wa.me/" + item.phone.replace(/\D/g, "")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open WhatsApp ↗
                </a>
              </p>
              {item.email && (
                <p>
                  <a href={"mailto:" + item.email}>{item.email}</a>
                </p>
              )}
              <p>Received {new Date(item.created_at).toLocaleString()}</p>
              <p>Reference: {item.id}</p>
              <h3>{item.product_name || "General enquiry"}</h3>
              {item.product_sku && <p>SKU at enquiry: {item.product_sku}</p>}
              {item.products && (
                <p>
                  Current product: {item.products.name} · {item.products.sku} ·{" "}
                  {item.products.published ? "Published" : "Draft"}
                </p>
              )}
              {item.products?.published && (
                <Link to={"/products/" + item.products.slug}>
                  View current product ↗
                </Link>
              )}
              {item.product_url && (
                <p className="fine-print">
                  Original product URL: {item.product_url}
                </p>
              )}
              {item.quantity && <p>Quantity: {item.quantity}</p>}
              <p className="preserve-lines">
                {item.message || "No message provided."}
              </p>
            </div>
            <form onSubmit={save} key={item.id} className="form-stack">
              <Field label="Enquiry status">
                <select name="status" defaultValue={item.status}>
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <label className="field">
                Internal notes — private
                <textarea
                  name="internal_notes"
                  rows="7"
                  maxLength={20000}
                  defaultValue={item.internal_notes}
                />
              </label>
              {error && <Notice error>{error}</Notice>}
              {saved && <Notice>{saved}</Notice>}
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </form>
          </>
        )}
      </LoadState>
    </section>
  );
}
export default function AdminEnquiries() {
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1);
  const q = useDebounce(search);
  const state = useLoad(async () => {
    let query = requireDb()
      .from("enquiries")
      .select("id,customer_name,phone,email,product_name,created_at,status", {
        count: "exact",
      });
    if (status) query = query.eq("status", status);
    if (q) {
      const term = searchTerm(q);
      if (term)
        query = query.or(
          `customer_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,product_name.ilike.%${term}%`,
        );
    }
    if (from)
      query = query.gte(
        "created_at",
        new Date(from + "T00:00:00").toISOString(),
      );
    if (to)
      query = query.lte(
        "created_at",
        new Date(to + "T23:59:59.999").toISOString(),
      );
    const { data, count, error } = await query
      .order("created_at", { ascending: sort === "oldest" })
      .order("id")
      .range((page - 1) * 20, page * 20 - 1);
    if (error) throw error;
    return { items: data, count };
  }, [q, status, from, to, sort, page]);
  if (id)
    return (
      <EnquiryDetail
        id={id}
        onClose={() => setParams({})}
        onSaved={state.reload}
      />
    );
  return (
    <>
      <h1>Customer enquiries</h1>
      <div className="admin-filters">
        <Field
          label="Search enquiries"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field
          label="From date"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <Field
          label="To date"
          type="date"
          min={from || undefined}
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
        <Field label="Sort">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </Field>
      </div>
      <LoadState state={state}>
        <p>{state.data?.count || 0} enquiries</p>
        <div className="admin-list">
          {state.data?.items.map((e) => (
            <button
              className="list-row enquiry-row"
              key={e.id}
              onClick={() => setParams({ id: e.id })}
            >
              <span className="list-title">
                <strong>{e.customer_name}</strong>
                <small>
                  {e.product_name || "General enquiry"} · {e.phone}
                </small>
              </span>
              <span className="badge">{e.status}</span>
              <time>{new Date(e.created_at).toLocaleString()}</time>
              <span>Open →</span>
            </button>
          ))}
        </div>
        {!state.data?.items.length && <Empty title="No enquiries found." />}
        <Pagination
          size={20}
          page={page}
          count={state.data?.count || 0}
          onChange={setPage}
        />
      </LoadState>
    </>
  );
}
