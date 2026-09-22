import { createClient } from "@supabase/supabase-js";
import { products } from "../src/data/products.js";
const {
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_PUBLISHABLE_KEY: key,
  IMPORT_ADMIN_EMAIL: email,
  IMPORT_ADMIN_PASSWORD: password,
} = process.env;
if (!url || !key || !email || !password)
  throw new Error(
    "Set public Supabase config and temporary IMPORT_ADMIN_EMAIL / IMPORT_ADMIN_PASSWORD environment variables.",
  );
const db = createClient(url, key, { auth: { persistSession: false } });
const { error } = await db.auth.signInWithPassword({ email, password });
if (error) throw error;
try {
  const { data: admin, error } = await db.rpc("is_admin");
  if (error || !admin)
    throw new Error("An authorized administrator is required.");
  for (const p of products) {
    const slug =
      "legacy-" +
      p.id +
      "-" +
      p.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const existing = await db
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      console.log("Skipped existing draft: " + p.name);
      continue;
    }
    const group =
      { Throws: "throws-blankets", Bedcovers: "bedcovers" }[p.category] ||
      p.category.toLowerCase().replaceAll(" ", "-");
    const images = (p.images || [])
      .filter((url) => url.startsWith("https://"))
      .map((url) => ({ external_url: url, alt: p.name }));
    const { error } = await db.rpc("save_product", {
      payload: {
        name: p.name,
        slug,
        category_slug: group,
        description: p.description || "",
        material: p.material || "",
        size: p.size || "",
        tags: ["legacy-review-required"],
        published: false,
        featured: false,
        new_arrival: false,
        public_price: null,
        sale_price: null,
        specifications: {},
        variants: [],
      },
      images,
    });
    if (error) throw error;
    console.log("Imported unpublished draft: " + p.name);
  }
} finally {
  await db.auth.signOut();
}
