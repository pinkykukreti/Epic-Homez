import { createClient } from "@supabase/supabase-js";
export const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
// The approved bundled catalogue is also available in the public static build.
export const localPreview = !configured;
export const supabase = configured
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    )
  : null;
export const defaults = {
  brand_name: "Epic Homez",
  whatsapp: import.meta.env.VITE_WHATSAPP_NUMBER || "919717037355",
  phone: "+91 97170 37355",
  email: "epichomezstore@gmail.com",
  logo_url: "/logo.png",
  hero_title: "A softer way to come home.",
  hero_text: "Explore home furnishings for the spaces you make your own.",
  story_title: "Your home. Your own expression.",
  story_text:
    "Discover the Epic Homez catalogue, explore the details, and get in touch for prices and availability.",
  footer_text: "Home furnishings, thoughtfully explored.",
  announcement: "Explore the collection · Enquire for prices and availability",
  show_prices: false,
  show_featured: true,
  show_new: true,
};
export const categories = [
  "Bedsheets",
  "Comforters",
  "Rajai",
  "Cushion Covers",
  "Throws & Blankets",
  "Carpet",
  "Sofa Covers",
  "Table Linen",
  "Home Accessories",
  "Bedcovers",
].map((name, i) => ({
  name,
  slug: [
    "bedsheets",
    "comforters",
    "rajai",
    "cushion-covers",
    "throws-blankets",
    "carpet",
    "sofa-covers",
    "table-linen",
    "home-accessories",
    "bedcovers",
  ][i],
}));
export function requireDb() {
  if (!supabase)
    throw new Error(
      "The catalogue service is not connected yet. Please try again later.",
    );
  return supabase;
}
export async function result(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export function safeUrl(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const u = new URL(value);
    return u.protocol === "https:" ||
      (import.meta.env.DEV &&
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname))
      ? u.href
      : fallback;
  } catch {
    return fallback;
  }
}
export async function hydrateImages(products) {
  const paths = [
    ...new Set(
      products.flatMap((p) =>
        (p.product_images || []).map((i) => i.storage_path).filter(Boolean),
      ),
    ),
  ];
  let signed = {};
  if (paths.length) {
    const { data, error } = await requireDb()
      .storage.from("product-images")
      .createSignedUrls(paths, 600);
    if (error) throw error;
    signed = Object.fromEntries(data.map((i) => [i.path, i.signedUrl]));
  }
  return products.map((p) => ({
    ...p,
    images: (p.product_images || [])
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        ...i,
        url: safeUrl(i.external_url || signed[i.storage_path], "/fallback.svg"),
      })),
  }));
}
export function searchTerm(text) {
  return text
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .slice(0, 120);
}
export function productQuery(
  filters = {},
  page = 1,
  admin = false,
  pageSize = 12,
) {
  let q = requireDb()
    .from("products")
    .select("*,product_images(*)", { count: "exact" });
  if (!admin) q = q.eq("published", true).not("category_slug", "in", "(rajai,sofa-covers,home-accessories)");
  if (filters.q) {
    const term = searchTerm(filters.q);
    if (term) q = q.or(`search_text.ilike.%${term}%,tags.cs.{${term}}`);
  }
  if (filters.category) q = !admin && ["bedcovers", "comforters"].includes(filters.category) ? q.in("category_slug", ["bedcovers", "comforters"]) : q.eq("category_slug", filters.category);
  for (const k of ["size", "material", "colour"])
    if (filters[k]) q = q.eq(k, filters[k]);
  if (filters.featured) q = q.eq("featured", true);
  if (filters.new_arrival) q = q.eq("new_arrival", true);
  if (filters.status) q = q.eq("published", filters.status === "published");
  if (filters.min !== "" && filters.min != null)
    q = q.gte("effective_price", Number(filters.min));
  if (filters.max !== "" && filters.max != null)
    q = q.lte("effective_price", Number(filters.max));
  const sort = filters.sort || "newest";
  q =
    sort === "name"
      ? q.order("name")
      : sort === "price-low"
        ? q.order("effective_price", { ascending: true, nullsFirst: false })
        : sort === "price-high"
          ? q.order("effective_price", { ascending: false, nullsFirst: false })
          : q.order("created_at", { ascending: false });
  return q.order("id").range((page - 1) * pageSize, page * pageSize - 1);
}
export async function listProducts(
  filters,
  page,
  admin = false,
  pageSize = 12,
) {
  if (localPreview && !admin) return (await import("./amazon-preview")).list(filters, page, pageSize);
  const { data, error, count } = await productQuery(
    filters,
    page,
    admin,
    pageSize,
  );
  if (error) throw error;
  return { items: await hydrateImages(data), count };
}
export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
export function whatsappUrl(settings, product) {
  const number = (settings.whatsapp || "").replace(/\D/g, "");
  if (!/^\d{7,15}$/.test(number)) return "";
  const url = product
    ? `${window.location.origin}/products/${product.slug}`
    : window.location.origin;
  const template =
    settings.whatsapp_template ||
    "Hello {brand}, I am interested in {product}. Please share the price, availability, and product details. {sku} Product link: {url}";
  const values = {
    brand: settings.brand_name || "Epic Homez",
    product: product?.name || "your home furnishings",
    sku: product?.sku ? `SKU: ${product.sku}.` : "",
    url,
  };
  return `https://wa.me/${number}?text=${encodeURIComponent(template.replace(/\{(brand|product|sku|url)\}/g, (_, key) => values[key]))}`;
}
