import { createClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";
const raw = process.env.SITE_URL;
if (!raw)
  throw new Error(
    "Set SITE_URL to your real website origin before generating the sitemap.",
  );
const origin = new URL(raw);
if (!["https:", "http:"].includes(origin.protocol))
  throw new Error("Invalid SITE_URL.");
const paths = [
  "/",
  "/products",
  "/our-story",
  "/contact",
  "/privacy",
  "/terms",
];
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key)
  throw new Error(
    "Set the public Supabase URL and publishable key so the sitemap can include published products.",
  );
const db = createClient(url, key, { auth: { persistSession: false } });
const { data: categories, error } = await db.from("categories").select("slug");
if (error) throw error;
paths.push(...categories.map((c) => "/collections/" + c.slug));
for (let start = 0; ; start += 1000) {
  const { data, error } = await db
    .from("products")
    .select("slug")
    .eq("published", true)
    .order("id")
    .range(start, start + 999);
  if (error) throw error;
  paths.push(...data.map((p) => "/products/" + p.slug));
  if (data.length < 1000) break;
}
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
await writeFile(
  "public/sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    paths
      .map(
        (p) => "<url><loc>" + escape(new URL(p, origin).href) + "</loc></url>",
      )
      .join("") +
    "</urlset>",
);
await writeFile(
  "public/robots.txt",
  `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${new URL("/sitemap.xml", origin).href}\n`,
);
console.log(`Generated sitemap with ${paths.length} public URLs.`);
