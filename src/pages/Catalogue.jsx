import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useSite } from "../lib/context";
import { listProducts, requireDb, result, localPreview } from "../lib/api";
import { useDebounce, useLoad } from "../lib/hooks";
import { Empty, LoadState, Pagination, Field } from "../components/UI";
import ProductCard from "../components/ProductCard";
import Meta from "../components/Meta";
import { collectionImages } from "../lib/collections";
import { Navigate } from "react-router-dom";
import { NotFound } from "./StaticPages";
export default function Catalogue({ onEnquire }) {
  const { category } = useParams();
  const { categories, settings } = useSite();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  const q = useDebounce(search);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const selected = categories.find((c) => c.slug === category);
  const filters = Object.fromEntries(params);
  filters.q = q;
  filters.category = category || filters.category;
  if (!settings.show_prices) {
    delete filters.min;
    delete filters.max;
    if (filters.sort?.startsWith("price")) filters.sort = "newest";
  }
  const facets = useLoad(() => localPreview ? Promise.resolve({sizes:[],materials:[],colours:[],has_prices:false}) : result(requireDb().rpc("catalogue_facets")), []);
  const state = useLoad(
    () => listProducts(filters, page),
    [JSON.stringify(filters), page],
  );
  function change(key, value) {
    setParams((old) => {
      const p = new URLSearchParams(old);
      value ? p.set(key, value) : p.delete(key);
      p.delete("page");
      return p;
    });
  }
  useEffect(() => {
    if (q !== (params.get("q") || "")) change("q", q);
  }, [q]);
  useEffect(() => {
    setSearch(params.get("q") || "");
  }, [params.get("q")]);
  if (category === "comforters") return <Navigate to="/collections/bedcovers" replace />;
  if (category && !selected) return <NotFound />;
  const prices = settings.show_prices && facets.data?.has_prices;
  return (
    <>
      <Meta
        title={selected?.name || "All Products"}
        description={`Explore ${selected?.name?.toLowerCase() || "home furnishings"} from Epic Homez. View product details and request prices directly.`}
      />
      <section className="page-heading collection-heading" style={{backgroundImage: `linear-gradient(90deg,rgba(25,27,22,.82),rgba(25,27,22,.3)),url("${collectionImages[category] || "/images/luxury-home-hero.png"}")`}}>
        <p className="section-label">
          <Link to="/">Home</Link> / The collection
        </p>
        <h1>{selected?.name || "Objects for everyday living."}</h1>
        <p>Find the textures, colours and details that feel like home.</p>
      </section>
      <section className="catalogue-layout">
        <aside className="filter-panel">
          <div className="row-heading">
            <h2>Refine your collection</h2>
            <button
              className="text-button"
              onClick={() => {
                setSearch("");
                setParams({});
              }}
            >
              Clear all
            </button>
          </div>
          <Field
            label="Search products"
            type="search"
            placeholder="Name, SKU or keyword"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!category && (
            <Field label="Category">
              <select
                value={filters.category || ""}
                onChange={(e) => change("category", e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {[
            ["size", "Size", "sizes"],
            ["material", "Material", "materials"],
            ["colour", "Colour", "colours"],
          ].filter(([, , list]) => facets.data?.[list]?.length).map(([key, label, list]) => (
            <Field key={key} label={label}>
              <select
                value={filters[key] || ""}
                onChange={(e) => change(key, e.target.value)}
              >
                <option value="">All {label.toLowerCase()} options</option>
                {(facets.data?.[list] || []).sort().map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          ))}
          {prices && (
            <div className="price-filters">
              <Field
                label="Minimum price (₹)"
                type="number"
                min="0"
                value={filters.min || ""}
                onChange={(e) => change("min", e.target.value)}
              />
              <Field
                label="Maximum price (₹)"
                type="number"
                min="0"
                value={filters.max || ""}
                onChange={(e) => change("max", e.target.value)}
              />
            </div>
          )}
          <p className="fine-print">
            Looking for something specific?{" "}
            <Link to="/contact">Let’s talk.</Link>
          </p>
        </aside>
        <div className="catalogue-results">
          <div className="results-toolbar">
            <p aria-live="polite">
              {state.loading
                ? "Finding your collection…"
                : `${state.data?.count || 0} ${state.data?.count === 1 ? "product" : "products"}`}
            </p>
            <Field label="Sort by">
              <select
                value={filters.sort || "newest"}
                onChange={(e) => change("sort", e.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="name">Name A–Z</option>
                {prices && (
                  <>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                  </>
                )}
              </select>
            </Field>
          </div>
          <LoadState state={state}>
            {state.data?.items.length ? (
              <div className="products-grid">
                {state.data.items.map((p) => (
                  <ProductCard key={p.id} product={p} onEnquire={onEnquire} />
                ))}
              </div>
            ) : (
              <Empty title="Nothing here just yet.">
                Try adjusting your filters, or contact us about what you’re
                looking for.
              </Empty>
            )}
          </LoadState>
          <Pagination
            page={page}
            count={state.data?.count || 0}
            onChange={(n) => {
              setParams((p) => {
                p.set("page", n);
                return p;
              });
              window.scrollTo({ top: 200, behavior: "smooth" });
            }}
          />
        </div>
      </section>
    </>
  );
}
