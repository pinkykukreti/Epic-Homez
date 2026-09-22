// Local, disposable UI test fixture. NEVER used by production application code.
// Run with node tests/fixture-server.mjs; bind is loopback only.
import http from "node:http";
import { randomUUID } from "node:crypto";
const now = new Date().toISOString();
const categories = [
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
  position: i,
}));
let settings = {
  brand_name: "Epic Homez · TEST FIXTURE",
  show_prices: true,
  whatsapp: "919876543210",
};
let products = Array.from({ length: 14 }, (_, i) => ({
  id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(i + 1).padStart(12, "0")}`,
  name: `Test ${String(i + 1).padStart(2, "0")} ${i % 2 ? "Linen" : "Cotton"} Bedsheet`,
  slug: `test-product-${i + 1}`,
  sku: `TEST-${i + 1}`,
  category_slug: i === 13 ? "rajai" : "bedsheets",
  short_description:
    "Disposable browser test product. Never published to production.",
  description: "Test description for catalogue verification.",
  size: i % 2 ? "King" : "Double",
  material: i % 2 ? "Linen" : "Cotton",
  colour: i % 2 ? "Blue" : "Ivory",
  specifications: { Dimensions: "Test dimensions" },
  variants: ["Single", "Double"],
  tags: ["test"],
  public_price: 1000 + i * 100,
  sale_price: null,
  effective_price: 1000 + i * 100,
  featured: i < 4,
  new_arrival: i < 3,
  published: i !== 12,
  created_at: now,
  updated_at: now,
  product_images: [],
}));
let enquiries = [
  {
    id: randomUUID(),
    customer_name: "Test Visitor",
    phone: "919876543210",
    email: "visitor@example.test",
    product_id: products[0].id,
    product_name: products[0].name,
    product_sku: "TEST-1",
    product_url: "http://127.0.0.1:5175/products/test-product-1",
    quantity: 2,
    message: "Test enquiry for UI verification.",
    status: "New",
    internal_notes: "Private test note",
    created_at: now,
  },
];
const files = new Map();
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "admin@example.test",
};
const token =
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  ) +
  "." +
  Buffer.from(
    JSON.stringify({
      sub: user.id,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 86400,
    }),
  ).toString("base64url") +
  ".fixture-signature";
http
  .createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5175");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,DELETE,OPTIONS,HEAD",
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Range");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
    const url = new URL(req.url, "http://127.0.0.1:5180"),
      path = url.pathname;
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    let body;
    try {
      body = raw.length ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }
    const send = (data, status = 200, headers = {}) => {
      res.writeHead(status, { "Content-Type": "application/json", ...headers });
      res.end(req.method === "HEAD" ? "" : JSON.stringify(data));
    };
    const admin = req.headers.authorization === `Bearer ${token}`;
    if (path === "/test-state")
      return send({ products, enquiries, settings, uploaded: files.size });
    if (path === "/auth/v1/token")
      return send({
        access_token: token,
        refresh_token: "fixture-refresh",
        expires_in: 86400,
        token_type: "bearer",
        user,
      });
    if (path === "/auth/v1/user") return send(user);
    if (path === "/auth/v1/logout") return send({});
    if (path === "/rest/v1/rpc/is_admin") return send(admin);
    if (path === "/rest/v1/rpc/catalogue_facets")
      return send({
        sizes: ["Double", "King"],
        materials: ["Cotton", "Linen"],
        colours: ["Ivory", "Blue"],
        has_prices: true,
      });
    if (path === "/rest/v1/rpc/save_product") {
      if (!admin) return send({ message: "Forbidden" }, 403);
      const p = body.payload;
      let old = products.find((x) => x.id === p.id);
      const saved = {
        ...old,
        ...p,
        effective_price: p.sale_price ?? p.public_price,
        created_at: old?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        product_images: body.images.map((img, i) => ({
          ...img,
          id: randomUUID(),
          product_id: p.id,
          position: i,
        })),
      };
      products = products.filter((x) => x.id !== p.id);
      products.push(saved);
      return send(p.id);
    }
    if (path.startsWith("/storage/v1/object/product-images/")) {
      if (!admin) return send({ message: "Forbidden" }, 403);
      files.set(path.split("/product-images/")[1], raw);
      return send({ Key: path }, 200);
    }
    if (path === "/storage/v1/object/sign/product-images")
      return send(
        body.paths.map((p) => ({
          path: p,
          signedURL: "/object/sign/product-images/" + p + "?token=fixture",
        })),
      );
    if (path.startsWith("/storage/v1/object/sign/product-images/")) {
      const data = files.get(path.split("/product-images/")[1]);
      res.writeHead(data ? 200 : 404, { "Content-Type": "image/webp" });
      return res.end(data);
    }
    if (path === "/functions/v1/submit-enquiry") {
      const p = products.find((x) => x.id === body.product_id);
      const record = {
        id: randomUUID(),
        ...body,
        product_name: p?.name,
        product_sku: p?.sku,
        product_url: p ? "http://127.0.0.1:5175/products/" + p.slug : null,
        internal_notes: "",
        status: "New",
        created_at: new Date().toISOString(),
      };
      enquiries.push(record);
      return send({ id: record.id }, 201);
    }
    if (!path.startsWith("/rest/v1/")) return send({}, 404);
    const table = path.split("/").at(-1);
    let rows =
      table === "products"
        ? products.filter((p) => admin || p.published)
        : table === "categories"
          ? categories
          : table === "site_settings"
            ? [{ id: true, data: settings }]
            : table === "enquiries"
              ? admin
                ? enquiries
                : []
              : table === "product_images"
                ? products.flatMap((p) => p.product_images)
                : [];
    for (const [key, value] of url.searchParams) {
      if (["select", "order", "offset", "limit", "or"].includes(key)) continue;
      const dot = value.indexOf("."),
        op = value.slice(0, dot),
        v = value.slice(dot + 1);
      rows = rows.filter((r) =>
        op === "eq"
          ? String(r[key]) === v
          : op === "gte"
            ? r[key] >= Number(v)
            : op === "lte"
              ? r[key] <= Number(v)
              : true,
      );
    }
    const or = url.searchParams.get("or");
    if (or) {
      const match = or.match(/ilike\.%([^%]+)%/);
      if (match) {
        const term = match[1].toLowerCase();
        rows = rows.filter((r) =>
          Object.values(r)
            .filter((v) => typeof v === "string")
            .join(" ")
            .toLowerCase()
            .includes(term),
        );
      }
    }
    if (req.method === "PATCH") {
      if (!admin) return send({ message: "Forbidden" }, 403);
      rows.forEach((r) => Object.assign(r, body));
      return send(rows);
    }
    if (req.method === "DELETE") {
      if (!admin) return send({ message: "Forbidden" }, 403);
      if (table === "products")
        products = products.filter((p) => !rows.includes(p));
      return send({});
    }
    if (req.method === "POST" && table === "site_settings") {
      if (!admin) return send({ message: "Forbidden" }, 403);
      settings = body.data;
      return send([body]);
    }
    const order = url.searchParams.get("order")?.split(",")[0];
    if (order) {
      const [key, direction] = order.split(".");
      rows.sort(
        (a, b) =>
          (typeof a[key] === "number"
            ? a[key] - b[key]
            : String(a[key]).localeCompare(String(b[key]))) *
          (direction === "desc" ? -1 : 1),
      );
    }
    const count = rows.length,
      start = Number(url.searchParams.get("offset") || 0),
      limit = Number(url.searchParams.get("limit") || 1000);
    rows = rows.slice(start, start + limit);
    if (
      table === "enquiries" &&
      url.searchParams.get("select")?.includes("products(")
    )
      rows = rows.map((r) => ({
        ...r,
        products: products.find((p) => p.id === r.product_id) || null,
      }));
    const single = req.headers.accept?.includes("vnd.pgrst.object");
    return send(single ? rows[0] || null : rows, 200, {
      "Content-Range": `${start}-${Math.max(start, start + rows.length - 1)}/${count}`,
    });
  })
  .listen(5180, "127.0.0.1", () =>
    console.log("Disposable UI fixture API: http://127.0.0.1:5180"),
  );
