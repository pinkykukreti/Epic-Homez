# Epic Homez — setup and handover

Epic Homez is a React + Vite enquiry catalogue. It has no cart, checkout, payment gateway, purchase account or ordering system. The existing framework, logo, original CSS foundation, original photography URLs and legacy product source have been retained. No framework migration was needed.

## Current status

The source implementation is in your existing folder:

`C:\Users\Pinky Kukreti\Documents\Projects-Practice\Epic-Handloom-React\Epic-Handloom-React`

The frontend, admin screens, Supabase migration, secure enquiry function and storage integration are implemented. **A live Supabase project and Turnstile configuration have not been supplied or connected.** Until setup is completed, the public site shows an empty/unavailable catalogue, admin sign-in is disabled, and website enquiries cannot be submitted. It never silently stores customer data in the browser or pretends a submission succeeded.

The folder did not contain Git metadata when inspected. No commits, branches or remote deployment have been created.

## Start the project locally

Use Node.js 22.12 or newer (Node 24 was used for verification).

```powershell
cd 'C:\Users\Pinky Kukreti\Documents\Projects-Practice\Epic-Handloom-React\Epic-Handloom-React'
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

Open `http://127.0.0.1:5174/`. Admin is `http://127.0.0.1:5174/admin`.

```powershell
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

The preview command serves the production `dist` directory after building. A server must remain running for localhost links to work.

## 1. Create and configure Supabase

1. Create a Supabase project under your own account.
2. In its SQL Editor, run the complete file `supabase/migrations/202609200001_epic_homez.sql` once on the new project. It is an initial migration, not a script to rerun against already-created tables.
3. Alternatively, use Supabase CLI migrations: `supabase login`, `supabase link --project-ref YOUR_PROJECT_REF`, then `supabase db push`. Do not paste database passwords into chat or frontend files.
4. Copy `.env.example` to `.env.local`. Enter your project URL and **publishable key**. The legacy anon key is also supported. Never use a service-role key here.
5. Restart Vite after changing environment variables.

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
VITE_TURNSTILE_SITE_KEY=YOUR_PUBLIC_TURNSTILE_SITE_KEY
SITE_URL=https://YOUR_REAL_WEBSITE_DOMAIN
```

Vite exposes all `VITE_` variables to visitors. Only the three public values belong there. The public key is safe only with the provided permissions and RLS policies applied.

## 2. Create your private administrator

1. In Supabase Authentication settings, disable new public user sign-ups. The website has no registration screen.
2. In Authentication → Users, create your administrator using a real email and strong password. Use the dashboard to reset the password if needed; do not enter credentials into repository files.
3. Copy that user's UUID and run this in the SQL Editor, replacing the UUID:

```sql
insert into public.admin_users(user_id)
values ('YOUR_AUTH_USER_UUID'::uuid)
on conflict do nothing;
```

4. Visit `/admin` and sign in. Only allowlisted users pass database checks; an ordinary authenticated user cannot read enquiries, manage products or grant themselves admin privileges.
5. To revoke access, remove that user's row from `public.admin_users` in the SQL Editor. Manage administrator membership through the trusted Supabase dashboard, not a public signup flow.
6. Configure Supabase Auth's Site URL and approved redirect URLs for your actual local/deployed domains. The implemented login uses email/password and does not require email links.

## 3. Configure image storage

The migration creates a **private** `product-images` bucket:

- JPEG, PNG and WebP only.
- Maximum 8 MB per uploaded object, enforced by the bucket.
- Only authorized admins can upload, update or remove objects.
- Visitors can request signed URLs only for images attached to published products.
- URLs expire after 10 minutes. An already-issued URL may continue to work until expiry after unpublishing; it is not an instant revocation mechanism for cached images.
- The browser verifies input type/size, decodes the image, resizes its longest edge to at most 2,200 pixels and encodes WebP before upload.

Do not change the bucket to public. Do not add a broad anonymous storage policy.

The first gallery image is the main image. Removing/replacing images and deleting products attempts to delete files only after checking whether another product still references them. Interrupted uploads may leave orphan files: periodically review storage paths against `public.product_images.storage_path` and remove only confirmed unreferenced files. Product IDs form the first folder in upload paths. Never bulk-delete the bucket.

Existing Cloudinary images can be retained as external HTTPS URLs by the legacy import. Their availability is governed by Cloudinary rather than the new Supabase bucket.

## 4. Configure the enquiry endpoint and spam protection

1. Create a Cloudflare Turnstile widget. Add your deployed hostname and the local hostnames you actually use for testing (`127.0.0.1` and/or `localhost`).
2. Put the widget's public site key in `VITE_TURNSTILE_SITE_KEY`.
3. Copy `.env.server.example` to `.env.server.local` and fill it privately. Generate a long random `RATE_LIMIT_SALT` (for example using a password manager). Set `ALLOWED_ORIGINS` to the exact comma-separated origins, including scheme and local port, with no trailing slash.
4. Set server secrets and deploy:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set --env-file .env.server.local
supabase functions deploy submit-enquiry --no-verify-jwt
```

Example server configuration (replace the domain; no production secret values are included):

```dotenv
ALLOWED_ORIGINS=https://YOUR_REAL_WEBSITE_DOMAIN,http://127.0.0.1:5174
SITE_URL=https://YOUR_REAL_WEBSITE_DOMAIN
TURNSTILE_SECRET_KEY=YOUR_PRIVATE_TURNSTILE_SECRET
RATE_LIMIT_SALT=YOUR_LONG_RANDOM_PRIVATE_VALUE
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` inside the deployed function. Do not copy them into frontend environment variables. `verify_jwt=false` is intentional because customers have no account: the function validates the origin, body size, field values, honeypot, Turnstile token, hostname and action before inserting. Direct anonymous table inserts are prohibited.

The server applies an atomic limit of five validated submissions per 15 minutes per salted IP identifier and normalized phone identifier. It does not save raw IPs in the rate-limit table. Old rate-limit records are pruned on subsequent submissions. CAPTCHA remains the primary defense against forged client requests; the IP limit also depends on the hosting proxy's forwarded-IP behavior.

The function reads product name/SKU from the database, verifies the product is published, and constructs its URL from server configuration. Visitors cannot inject status, internal notes, snapshot fields or timestamps.

There are no email or WhatsApp notifications implemented. Admins receive enquiries in the private dashboard. WhatsApp links open WhatsApp and do **not** save database enquiries.

## 5. Set up your public content

Visit Admin → Settings to configure:

- Brand name and logo URL (the existing `/logo.png` is the default).
- Verified email, phone, WhatsApp number including country code, and business address.
- Instagram, Facebook and Pinterest URLs.
- Announcement, homepage headline/introduction, Our Story and footer text.
- Featured and new-arrival section visibility.
- Whether configured public product prices are displayed.
- WhatsApp message format using `{brand}`, `{product}`, `{sku}` and `{url}`.
- Owner-reviewed privacy and terms text.

Unconfigured contact and social links are omitted. Settings are public content, not a place to store secrets. Public price fields are public database fields even if the display preference is off. Leave prices blank if you do not intend to disclose them; no private cost-price field is included.

The default policy text describes the implemented website flow. Review it against your actual business, retention practices and service configuration before launch. No unverified history, certifications, testimonials, materials or contact details were added.

## Daily product workflow

1. Open `/admin/products` and choose **Add product**.
2. Enter its name, unique URL slug, category and optional unique SKU. The slug is suggested from the name and can be edited.
3. Add only verified descriptions, size, material, colour, specifications and variants. Specifications use named detail/value fields; variants are one per line.
4. Choose multiple images from your laptop. Review previews, edit alt text, reorder images with arrows, select the main image, and remove/replace images as needed.
5. Leave optional prices blank for “Price available on request”. If you want public pricing, enter a price and enable the display preference in Settings. A sale price cannot exceed its regular public price.
6. Mark **Featured on home** and/or **New arrival** if desired.
7. Save a draft, or check **Published** and choose **Save and publish**.
8. Open the public catalogue or reload an existing public tab. Published products appear from the database without code changes. Drafts stay private.
9. Use **Edit**, **Publish/Unpublish**, **Duplicate**, or **Delete** in the product list. Duplicates start unpublished with a new slug and blank SKU; existing image files can be shared safely until replaced.

Deletion requires confirmation and cannot be undone through this UI. Enquiry product IDs become null after deletion while product name, SKU and original URL snapshots remain. Prefer unpublishing when you may want the product again.

## Daily enquiry workflow

1. Open `/admin/enquiries`.
2. Search by customer contact information or product name; filter by status or local date range; choose newest or oldest.
3. Open a record to see the contact details, original product snapshot, optional quantity/message and current product information.
4. Change its status to **New**, **Contacted**, **Follow-up Required**, or **Closed**.
5. Add private internal notes and save.
6. Use the telephone, email or WhatsApp links to contact the customer yourself. No automatic message is sent by opening the enquiry record.

The public site never reads enquiry records. Only the server's success response confirms that a website enquiry was saved.

## Existing product data

`src/data/products.js` is preserved but is no longer imported into the production catalogue. It contains 18 original records, some placeholder images, unverified claims/prices and inconsistent descriptions. Nothing from it was automatically published.

An optional, repeat-safe draft import is provided. Set `IMPORT_ADMIN_EMAIL` and `IMPORT_ADMIN_PASSWORD` temporarily in your own terminal session, then run:

```powershell
node --env-file=.env.local scripts/import-legacy.mjs
```

The script imports only unpublished drafts, retains valid HTTPS image URLs, skips image placeholders, leaves prices blank, adds a review tag and skips records already imported by its `legacy-...` slug. Review every field and photograph before publishing. Clear the temporary credential environment variables afterward. Do not commit credentials or put them into a `VITE_` variable.

Your original extra **Bedcovers** category is retained in addition to the nine requested categories.

## Deployment

1. Complete the Supabase, admin and Turnstile steps above.
2. Put the three public `VITE_` variables into your host's build environment.
3. Set `SITE_URL` to the actual public origin. Generate the sitemap against published database products:

```powershell
node --env-file=.env.local scripts/sitemap.mjs
npm run build
```

In CI with environment variables already supplied: `npm run sitemap && npm run build`.

4. Deploy the `dist` folder to a static host. Vercel rewrites/headers are in `vercel.json`; Netlify-style SPA fallback and headers are in `public/_redirects` and `public/_headers`. Other hosts must route application URLs to `index.html` while serving real asset files normally.
5. Set the exact production origin in the Edge Function's `ALLOWED_ORIGINS`, its canonical `SITE_URL`, and Turnstile's hostname settings.
6. Test the checklist in `QA.md` using your real project before sharing the site publicly.
7. Regenerate/redeploy `sitemap.xml` after product URL/publication changes, or schedule the build in your hosting service. Products themselves appear dynamically without rebuilding; the sitemap is a build artifact.

Admin pages have a robots `noindex,nofollow` meta tag and supported hosts also add `X-Robots-Tag`. This is an indexing instruction, not authorization; RLS provides the actual protection.

Page titles, descriptions, canonical URLs and Open Graph tags update on the client. Non-JavaScript social crawlers may see the initial homepage metadata. Static SPA fallback serves a 200 response for client-rendered 404 pages; true HTTP 404 and crawler-specific product previews would require server rendering/prerendering. These are known deployment limitations, not claimed features.

## Folder map

```text
src/
  App.jsx                     Routes and enquiry dialog
  App.css                     Preserved original styling foundation
  catalogue.css               New responsive public/admin styles
  lib/                        Supabase queries, settings, hooks, uploads
  components/                 Header, footer, cards, gallery, forms, metadata
  pages/                      Public pages and private admin screens
  data/products.js            Original data; optional draft import only
public/                       Original logo, fallback image, robots and host rules
supabase/
  migrations/                 Tables, permissions, RLS, storage and atomic RPCs
  functions/submit-enquiry/   Validated, throttled enquiry endpoint
scripts/                      Sitemap generation and legacy draft import
tests/                        Validation, PostgreSQL policy tests, local UI fixture
.env.example                  Public environment template
.env.server.example           Server-secret template (no real secrets)
README.md                     This setup and operating guide
QA.md                         Test evidence and remaining live checks
```

`ProductsSection.jsx`, `ProductModal.jsx` and `styles.css` are retained legacy files, not active production entry points. No dummy catalogue fallback or cart code is imported by the active application.

## Reference documentation

The access model follows [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), and the [Turnstile Edge Function example](https://supabase.com/docs/guides/functions/examples/cloudflare-turnstile).

## Amazon collection import

`imports/amazon-products-2026-09-20.json` contains 13 products observed on your Amazon seller page on 20 September 2026: one main photo URL, ASIN, source link, displayed price and displayed MRP per listing. Prices are a snapshot, not an automated feed. ASIN is not your seller SKU. Source titles were shortened to descriptive product names; unverified specifications and marketing claims were not imported.

After completing database/storage setup and creating an authorized administrator, use the same temporary admin environment variables described for the legacy importer. First run `node scripts/import-amazon.mjs` to validate the file without changing the database. Then run `node scripts/import-amazon.mjs --apply` to copy each listing photo to private Supabase image storage and create unpublished drafts. Existing matching slugs are skipped; the importer does not overwrite products. It uses the public project key plus an authenticated administrator, never a service-role key. Clear the temporary password environment variable after use.

In Admin → Products, review each imported draft, replace listing-sized images with your original high-resolution photos where available, fill in accurate SKU/size/material/colour, confirm the price and publish. The public catalogue shows newly published products automatically. Public prices remain hidden unless enabled in Settings. The Amazon MRP is retained only in the source JSON, not converted to an advertised discount. This importer has been syntax-checked and its preview mode validated; a live import requires your Supabase configuration and has not been run.
