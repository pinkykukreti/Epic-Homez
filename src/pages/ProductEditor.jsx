import { useEffect, useRef, useState } from "react";
import { useSite } from "../lib/context";
import { requireDb, result } from "../lib/api";
import { prepareImage, uploadImage, removeUnusedImages } from "../lib/uploads";
import { Field, Notice, ProductImage } from "../components/UI";
const slugify = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export default function ProductEditor({ product, onClose, onSaved }) {
  const { categories } = useSite();
  const [form, setForm] = useState(() => ({
    ...{
      id: crypto.randomUUID(),
      name: "",
      slug: "",
      sku: "",
      category_slug: categories[0]?.slug || "bedsheets",
      short_description: "",
      description: "",
      size: "",
      material: "",
      colour: "",
      public_price: "",
      sale_price: "",
      featured: false,
      new_arrival: false,
      published: false,
    },
    ...product,
    public_price: product?.public_price ?? "",
    sale_price: product?.sale_price ?? "",
    tags: (product?.tags || []).join(", "),
    specifications: JSON.stringify(product?.specifications || {}, null, 2),
    variants: JSON.stringify(product?.variants || [], null, 2),
  }));
  const [specRows, setSpecRows] = useState(
    Object.entries(product?.specifications || {}),
  );
  const [variantText, setVariantText] = useState(
    (product?.variants || [])
      .map((v) =>
        typeof v === "string"
          ? v
          : Object.entries(v)
              .map(([k, value]) => k + ": " + value)
              .join(" · "),
      )
      .join("\n"),
  );
  const [images, setImages] = useState(product?.images || []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(""),
    [dirty, setDirty] = useState(false);
  const urls = useRef(new Set());
  useEffect(
    () => () => {
      urls.current.forEach(URL.revokeObjectURL);
    },
    [],
  );
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const set = (key, value) => {
    setDirty(true);
    setForm((f) => ({ ...f, [key]: value }));
  };
  async function addFiles(files, replaceIndex) {
    setError("");
    setBusy(true);
    try {
      if (replaceIndex === undefined && images.length + files.length > 20)
        throw new Error("Use a maximum of 20 images per product.");
      const prepared = [];
      for (const file of files) {
        const processed = await prepareImage(file);
        const url = URL.createObjectURL(processed);
        urls.current.add(url);
        prepared.push({ file: processed, url, alt: form.name });
      }
      setImages((current) => {
        if (replaceIndex !== undefined) {
          const copy = [...current];
          copy[replaceIndex] = prepared[0];
          return copy;
        }
        return [...current, ...prepared];
      });
      setDirty(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function move(from, to) {
    setImages((current) => {
      const list = [...current];
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      return list;
    });
    setDirty(true);
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const uploaded = [];
    let committed = false;
    try {
      const rows = specRows.filter(
        ([key, value]) => key.trim() || String(value).trim(),
      );
      if (rows.some(([key]) => !key.trim()))
        throw new Error("Give each specification a name.");
      if (
        new Set(rows.map(([key]) => key.trim().toLowerCase())).size !==
        rows.length
      )
        throw new Error("Specification names must be unique.");
      const specifications = Object.fromEntries(
          rows.map(([key, value]) => [key.trim(), String(value).trim()]),
        ),
        variants = variantText
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean);
      const gallery = [];
      for (let n = 0; n < images.length; n++) {
        const img = images[n];
        let path = img.storage_path;
        if (img.file) {
          path = `${form.id}/${crypto.randomUUID()}.webp`;
          await uploadImage(img.file, path, (p) =>
            setProgress(`Uploading image ${n + 1} of ${images.length}: ${p}%`),
          );
          uploaded.push(path);
        }
        gallery.push({
          storage_path: path || null,
          external_url: path ? null : img.external_url,
          alt: img.alt || form.name,
        });
      }
      const fields = [
        "id",
        "name",
        "slug",
        "sku",
        "category_slug",
        "short_description",
        "description",
        "size",
        "material",
        "colour",
        "featured",
        "new_arrival",
        "published",
      ];
      const payload = Object.fromEntries(fields.map((k) => [k, form[k]]));
      Object.assign(payload, {
        specifications,
        variants,
        tags: form.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        public_price:
          form.public_price === "" ? null : Number(form.public_price),
        sale_price: form.sale_price === "" ? null : Number(form.sale_price),
      });
      await result(
        requireDb().rpc("save_product", { payload, images: gallery }),
      );
      committed = true;
      setDirty(false);
      let warning = "";
      try {
        await removeUnusedImages(
          (product?.images || [])
            .map((i) => i.storage_path)
            .filter((p) => !gallery.some((i) => i.storage_path === p)),
        );
      } catch {
        warning =
          "Product saved. Some unused image files could not be removed; see the storage cleanup instructions.";
      }
      onSaved(warning || "Product saved successfully.");
    } catch (e) {
      if (!committed && uploaded.length) {
        try {
          await removeUnusedImages(uploaded);
        } catch {}
      }
      setError(
        e.code === "23505"
          ? "That slug or SKU is already in use. Please choose a unique value."
          : e.message,
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  return (
    <section className="admin-editor">
      <div className="row-heading">
        <div>
          <p className="section-label">Product studio</p>
          <h2>{product ? "Edit product" : "Add a product"}</h2>
        </div>
        <button
          disabled={busy}
          onClick={() => {
            if (!dirty || window.confirm("Discard your unsaved changes?"))
              onClose();
          }}
        >
          Cancel
        </button>
      </div>
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <div className="form-grid">
            <Field
              label="Product name *"
              required
              maxLength={180}
              value={form.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (
                  !product &&
                  (!form.slug || form.slug === slugify(form.name))
                )
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
              }}
            />
            <Field
              label="URL slug *"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              onBlur={() => set("slug", slugify(form.slug))}
            />
            <Field
              label="SKU"
              value={form.sku || ""}
              onChange={(e) => set("sku", e.target.value)}
            />
            <Field label="Category *">
              <select
                required
                value={form.category_slug}
                onChange={(e) => set("category_slug", e.target.value)}
              >
                {categories.map((c) => (
                  <option value={c.slug} key={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="field form-full">
              Short description
              <textarea
                rows="2"
                maxLength={500}
                value={form.short_description}
                onChange={(e) => set("short_description", e.target.value)}
              />
            </label>
            <label className="field form-full">
              Full description
              <textarea
                rows="6"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
            {["size", "material", "colour"].map((key) => (
              <Field
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            ))}
            <Field
              label="Tags (comma separated)"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
            />
            <Field
              label="Optional public price (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.public_price}
              onChange={(e) => {
                set("public_price", e.target.value);
                if (e.target.value === "") set("sale_price", "");
              }}
            />
            <Field
              label="Optional sale price (₹)"
              type="number"
              min="0"
              max={form.public_price || undefined}
              step="0.01"
              disabled={form.public_price === ""}
              value={form.sale_price}
              onChange={(e) => set("sale_price", e.target.value)}
            />
            <p className="fine-print form-full">
              Only enter prices you intend to make public. Enable public price
              display in Settings to show them on the website.
            </p>
            <div className="form-full specification-editor">
              <h3>Specifications</h3>
              <p className="fine-print">
                Add only details you have verified, such as dimensions or care
                instructions.
              </p>
              {specRows.map(([key, value], index) => (
                <div className="specification-row" key={index}>
                  <Field
                    label={`Detail ${index + 1} name`}
                    value={key}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSpecRows((rows) =>
                        rows.map((row, i) =>
                          i === index ? [value, row[1]] : row,
                        ),
                      );
                      setDirty(true);
                    }}
                  />
                  <Field
                    label={`Detail ${index + 1} value`}
                    value={String(value)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSpecRows((rows) =>
                        rows.map((row, i) =>
                          i === index ? [row[0], value] : row,
                        ),
                      );
                      setDirty(true);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSpecRows((rows) => rows.filter((_, i) => i !== index));
                      setDirty(true);
                    }}
                  >
                    Remove detail
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSpecRows((rows) => [...rows, ["", ""]]);
                  setDirty(true);
                }}
              >
                + Add specification
              </button>
            </div>
            <label className="field form-full">
              Available variants — one per line
              <textarea
                rows="4"
                placeholder={"Single\nDouble"}
                value={variantText}
                onChange={(e) => {
                  setVariantText(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
          </div>
          <section className="image-editor">
            <h3>Product images</h3>
            <p>
              JPEG, PNG or WebP. Up to 8 MB each, maximum 20 images. Images are
              resized to 2,200 pixels and optimized before upload. The first
              image is the main image.
            </p>
            <label className="upload-zone">
              Choose images from your laptop
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  addFiles([...e.target.files]);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="image-editor-grid">
              {images.map((img, n) => (
                <div className="image-edit-card" key={img.url || n}>
                  <ProductImage
                    src={img.url}
                    alt={img.alt || `Image ${n + 1}`}
                  />
                  <strong>{n === 0 ? "Main image" : `Image ${n + 1}`}</strong>
                  <Field
                    label="Alternative text"
                    value={img.alt || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setImages((items) =>
                        items.map((x, i) =>
                          i === n ? { ...x, alt: value } : x,
                        ),
                      );
                      setDirty(true);
                    }}
                  />
                  <div className="small-actions">
                    <button
                      type="button"
                      disabled={n === 0}
                      onClick={() => move(n, 0)}
                    >
                      Set main
                    </button>
                    <button
                      type="button"
                      disabled={n === 0}
                      aria-label="Move image earlier"
                      onClick={() => move(n, n - 1)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={n === images.length - 1}
                      aria-label="Move image later"
                      onClick={() => move(n, n + 1)}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImages((items) => items.filter((_, i) => i !== n));
                        setDirty(true);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <label className="field">
                    Replace image
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        if (e.target.files[0]) addFiles([e.target.files[0]], n);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>
          <div className="check-row">
            {[
              ["featured", "Featured on home"],
              ["new_arrival", "New arrival"],
              ["published", "Published — visible to everyone"],
            ].map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => set(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
          {product && (
            <p className="fine-print">
              Created {new Date(product.created_at).toLocaleString()} · Updated{" "}
              {new Date(product.updated_at).toLocaleString()}
            </p>
          )}
        </fieldset>
        {progress && <Notice>{progress}</Notice>}
        {error && <Notice error>{error}</Notice>}
        <button className="primary" disabled={busy}>
          {busy
            ? "Saving…"
            : form.published
              ? "Save and publish"
              : "Save draft"}
        </button>
      </form>
    </section>
  );
}
