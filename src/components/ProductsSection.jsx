import { useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import ProductGallery from "./ProductGallery";
import { categories, products } from "../data/products";

function ProductsSection() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "All") {
      return products;
    }

    return products.filter(
      (product) => product.category === activeCategory
    );
  }, [activeCategory]);

  const getCategoryCount = (category) => {
    if (category === "All") {
      return products.length;
    }

    return products.filter(
      (product) => product.category === category
    ).length;
  };

  return (
    <section className="products-section" id="products">
      <div className="section-heading">
        <p className="section-label">Our Collection</p>
        <h2>Handcrafted textiles for thoughtful homes</h2>
        <p>
          Explore bedsheets, rajais, cushion covers, throws,
          table linen and bedcovers made using traditional crafts.
        </p>
      </div>

      <div className="category-filters">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className={
              activeCategory === category
                ? "category-button active"
                : "category-button"
            }
            onClick={() => setActiveCategory(category)}
          >
            {category}
            <span>{getCategoryCount(category)}</span>
          </button>
        ))}
      </div>

      {filteredProducts.length > 0 ? (
        <div className="products-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpen={setSelectedProduct}
            />
          ))}
        </div>
      ) : (
        <p className="empty-products-message">
          No products are available in this category.
        </p>
      )}

      {selectedProduct && (
        <ProductGallery
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  );
}

export default ProductsSection;