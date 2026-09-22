import { Link } from "react-router-dom";
import { useSite } from "../lib/context";
import { money, whatsappUrl } from "../lib/api";
import { ProductImage } from "./UI";
export function Price({ product }) {
  const { settings } = useSite();
  return (
    <p className="price">
      {settings.show_prices && product.public_price != null ? (
        <>
          {product.sale_price != null && (
            <del>{money(product.public_price)} </del>
          )}
          {money(product.sale_price ?? product.public_price)}
        </>
      ) : (
        "Price available on request"
      )}
    </p>
  );
}
export default function ProductCard({ product, onEnquire }) {
  const { settings, categories } = useSite();
  const wa = whatsappUrl(settings, product);
  return (
    <article className="product-card">
      <Link
        to={"/products/" + product.slug}
        className="product-card-image-button"
      >
        <ProductImage
          src={product.images?.[0]?.url}
          alt={product.images?.[0]?.alt || product.name}
          className="product-card-image"
          loading="lazy"
          decoding="async"
        />
        {product.new_arrival && (
          <span className="product-badge">New arrival</span>
        )}
        <span className="image-hover">Discover the details ↗</span>
      </Link>
      <div className="product-card-content">
        <p className="product-category">
          {categories.find((c) => c.slug === (product.category_slug === "comforters" ? "bedcovers" : product.category_slug))?.name}
        </p>
        <h3>
          <Link to={"/products/" + product.slug}>{product.name}</Link>
        </h3>
        {product.short_description && (
          <p className="product-craft">{product.short_description}</p>
        )}
        {product.sku && <small>SKU {product.sku}</small>}
        <Price product={product} />
        <div className="card-actions">
          <Link to={"/products/" + product.slug}>View Details</Link>

        </div>
        {wa ? (
          <a
            className="whatsapp-link"
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
          >
            Request price on WhatsApp ↗
          </a>
        ) : <button className="whatsapp-link" disabled title="WhatsApp number is not configured yet">Connect on WhatsApp for order ↗</button>}
      </div>
    </article>
  );
}

