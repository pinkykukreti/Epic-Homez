import { useState } from "react";
import ArrowIcon from "./ArrowIcon";
import { ProductImage } from "./UI";
export default function ProductGallery({ product }) {
  const [active, setActive] = useState(0);
  const images = product.images?.length
    ? product.images
    : [{ url: "/fallback.svg", alt: product.name }];
  const move = (delta) =>
    setActive((n) => (n + delta + images.length) % images.length);
  return (
    <div
      className="product-gallery-section"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") move(-1);
        if (e.key === "ArrowRight") move(1);
      }}
    >
      <div className="main-image-container">
        <ProductImage
          src={images[active]?.url}
          alt={images[active]?.alt || product.name}
          className="main-gallery-image"
        />
        {images.length > 1 && (
          <>
            <button
              className="gallery-arrow gallery-arrow-left"
              onClick={() => move(-1)}
              aria-label="Previous image"
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              className="gallery-arrow gallery-arrow-right"
              onClick={() => move(1)}
              aria-label="Next image"
            >
              <ArrowIcon />
            </button>
            <span className="gallery-counter">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      <div className="thumbnail-list">
        {images.map((i, n) => (
          <button
            key={i.id || n}
            className={`thumbnail-button ${n === active ? "active" : ""}`}
            onClick={() => setActive(n)}
            aria-label={"View image " + (n + 1)}
            aria-pressed={n === active}
          >
            <ProductImage src={i.url} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
