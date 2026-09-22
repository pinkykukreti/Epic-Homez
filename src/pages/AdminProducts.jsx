import { useState } from "react";
import { Link } from "react-router-dom";
import { requireDb, result, listProducts, searchTerm } from "../lib/api";
import { useLoad, useDebounce } from "../lib/hooks";
import { removeUnusedImages } from "../lib/uploads";
import {
  Field,
  LoadState,
  Notice,
  Pagination,
  Empty,
  ProductImage,
} from "../components/UI";
import { useSite } from "../lib/context";
import ProductEditor from "./ProductEditor";
export function Overview() {
  const state = useLoad(async () => {
    const db = requireDb();
    const [all, published, drafts, newEnquiries, recent] = await Promise.all([
      db.from("products").select("id", { count: "exact", head: true }),
      db
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("published", true),
      db
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("published", false),
      db
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "New"),
      db
        .from("enquiries")
        .select("id,customer_name,product_name,created_at,status")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    for (const item of [all, published, drafts, newEnquiries, recent])
      if (item.error) throw item.error;
    return {
      stats: [all.count, published.count, drafts.count, newEnquiries.count],
      recent: recent.data,
    };
  }, []);
  return (
    <>
      <h1>Your catalogue, at a glance.</h1>
      <LoadState state={state}>
        <div className="stats-grid">
          {[
            "Total products",
            "Published products",
            "Draft products",
            "New enquiries",
          ].map((label, i) => (
            <div key={label}>
              <strong>{state.data?.stats[i] ?? 0}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="row-heading">
          <h2>Recent enquiries</h2>
          <Link to="/admin/enquiries">Manage enquiries →</Link>
        </div>
        {state.data?.recent.length ? (
          <div className="admin-list">
            {state.data.recent.map((e) => (
              <Link
                to={"/admin/enquiries?id=" + e.id}
                key={e.id}
                className="list-row"
              >
                <span>
                  <strong>{e.customer_name}</strong>
                  <small>{e.product_name || "General enquiry"}</small>
                </span>
                <span className="badge">{e.status}</span>
                <time>{new Date(e.created_at).toLocaleString()}</time>
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="No enquiries yet." />
        )}
      </LoadState>
    </>
  );
}
export function AdminProducts() {
  const { categories } = useSite();
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1),
    [editor, setEditor] = useState(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const q = useDebounce(search);
  const state = useLoad(
    () => listProducts({ q, category, status, sort }, page, true),
    [q, category, status, sort, page],
  );
  async function action(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      state.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (editor)
    return (
      <ProductEditor
        key={editor.id || "new"}
        product={editor.id ? editor : null}
        onClose={() => setEditor(null)}
        onSaved={(msg) => {
          setEditor(null);
          setMessage(msg);
          state.reload();
        }}
      />
    );
  return (
    <>
      <div className="row-heading">
        <h1>Products</h1>
        <button className="primary" onClick={() => setEditor({})}>
          + Add product
        </button>
      </div>
      <div className="admin-filters">
        <Field
          label="Search name or SKU"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </Field>
        <Field label="Sort">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </select>
        </Field>
      </div>
      {message && <Notice>{message}</Notice>}
      {error && <Notice error>{error}</Notice>}
      <LoadState state={state}>
        <p>{state.data?.count || 0} products</p>
        <div className="admin-list">
          {state.data?.items.map((p) => (
            <div className="list-row" key={p.id}>
              <ProductImage
                className="admin-thumb"
                src={p.images[0]?.url}
                alt=""
              />
              <div className="list-title">
                <strong>{p.name}</strong>
                <small>
                  {p.sku || "No SKU"} · {p.category_slug}
                </small>
              </div>
              <span className="badge">
                {p.published ? "Published" : "Draft"}
              </span>
              <div className="small-actions">
                <button onClick={() => setEditor(p)}>Edit</button>
                <button
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      await result(
                        requireDb()
                          .from("products")
                          .update({ published: !p.published })
                          .eq("id", p.id),
                      );
                      setMessage(
                        p.published
                          ? "Product unpublished."
                          : "Product published.",
                      );
                    })
                  }
                >
                  {p.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    const suffix = crypto.randomUUID().slice(0, 8);
                    setEditor({
                      ...p,
                      id: crypto.randomUUID(),
                      name: p.name + " (copy)",
                      slug: p.slug + "-" + suffix,
                      sku: "",
                      published: false,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    });
                  }}
                >
                  Duplicate
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete “${p.name}”? Enquiry history will be retained. This cannot be undone.`,
                      )
                    )
                      action(async () => {
                        await result(
                          requireDb().from("products").delete().eq("id", p.id),
                        );
                        try {
                          await removeUnusedImages(
                            p.images.map((i) => i.storage_path),
                          );
                          setMessage(
                            "Product deleted. Enquiry history retained.",
                          );
                        } catch {
                          setMessage(
                            "Product deleted. Unused storage files need cleanup.",
                          );
                        }
                        if (state.data.items.length === 1 && page > 1)
                          setPage(page - 1);
                      });
                  }}
                >
                  Delete
                </button>
                {p.published && <Link to={"/products/" + p.slug}>View ↗</Link>}
              </div>
            </div>
          ))}
        </div>
        {!state.data?.items.length && (
          <Empty title="Your products belong here.">
            Add your first product, upload its images and publish it when ready.
          </Empty>
        )}
        <Pagination
          page={page}
          count={state.data?.count || 0}
          onChange={setPage}
        />
      </LoadState>
    </>
  );
}
