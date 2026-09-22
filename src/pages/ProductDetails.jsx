import { Link, useParams } from "react-router-dom";
import {
  localPreview,
  requireDb,
  result,
  hydrateImages,
  listProducts,
  whatsappUrl,
} from "../lib/api";
import { useLoad } from "../lib/hooks";
import { useSite } from "../lib/context";
import Meta from "../components/Meta";
import ProductGallery from "../components/ProductGallery";
import ProductCard, { Price } from "../components/ProductCard";
import { LoadState } from "../components/UI";
import { NotFound } from "./StaticPages";
export default function ProductDetails({ onEnquire }) {
  const { slug } = useParams();
  const { settings, categories } = useSite();
  const state = useLoad(async () => {
    if (localPreview) return (await import("../lib/amazon-preview")).products.find(p => p.slug === slug) || null;
    const p = await result(
      requireDb()
        .from("products")
        .select("*,product_images(*)")
        .eq("published", true)
        .eq("slug", slug)
        .maybeSingle(),
    );
    if (!p) return null;
    return (await hydrateImages([p]))[0];
  }, [slug]);
  const p = state.data;
  const related = useLoad(
    () =>
      p
        ? listProducts({ category: p.category_slug }, 1, false, 5)
        : Promise.resolve({ items: [] }),
    [p?.id],
  );
  const wa = p && whatsappUrl(settings, p);
  return (
    <LoadState state={state}>
      {p ? (
        <>
          <Meta
            title={p.name}
            description={
              p.short_description ||
              p.description?.slice(0, 155) ||
              `Explore ${p.name} from Epic Homez. Enquire for details and availability.`
            }
            image={p.images?.[0]?.url}
          />
          <div className="breadcrumbs">
            <Link to="/products">The Collection</Link>
            <span>/</span>
            <Link to={"/collections/" + p.category_slug}>
              {categories.find((c) => c.slug === (p.category_slug === "comforters" ? "bedcovers" : p.category_slug))?.name}
            </Link>
            <span>/</span>
            {p.name}
          </div>
          <section className="product-detail">
            <ProductGallery key={p.id} product={p} />
            <div className="product-information">
              <p className="section-label">
                {categories.find((c) => c.slug === (p.category_slug === "comforters" ? "bedcovers" : p.category_slug))?.name}
              </p>
              <h1>{p.name}</h1>
              <Price product={p} />
              {p.short_description && <p>{p.short_description}</p>}
              <dl className="product-details">
                {[
                  ["SKU", p.sku],
                  ["Size", p.size],
                  ["Material", p.material],
                  ["Colour", p.colour],
                  ...Object.entries(p.specifications || {}),
                ]
                  .filter(([, v]) => v !== "" && v != null)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </dd>
                    </div>
                  ))}
              </dl>
              {p.variants?.length > 0 && (
                <div>
                  <h3>Available variants</h3>
                  <ul>
                    {p.variants.map((v, i) => (
                      <li key={i}>
                        {typeof v === "string"
                          ? v
                          : Object.entries(v)
                              .map(([k, value]) => `${k}: ${value}`)
                              .join(" · ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {wa ? <a className="primary full" href={wa} target="_blank" rel="noopener noreferrer">Request price on WhatsApp ↗</a> : <button className="primary full" disabled>Request price on WhatsApp ↗</button>}
              <p className="fine-print">{wa ? "Opens a WhatsApp conversation about this product." : "WhatsApp contact will be available once the business number is configured."}</p>
              {p.description && (
                <div className="description">
                  <h2>All in the details</h2>
                  <p>{p.description}</p>
                </div>
              )}
            </div>
          </section>
          {related.data?.items.some((x) => x.id !== p.id) && (
            <section className="products-section">
              <div className="section-heading">
                <p className="section-label">A little more to explore</p>
                <h2>You might also like</h2>
              </div>
              <div className="products-grid four">
                {related.data.items
                  .filter((x) => x.id !== p.id)
                  .slice(0, 4)
                  .map((x) => (
                    <ProductCard key={x.id} product={x} onEnquire={onEnquire} />
                  ))}
              </div>
            </section>
          )}
        </>
      ) : (
        !state.loading && !state.error && <NotFound />
      )}
    </LoadState>
  );
}
