# Epic Homez — verification record

Date: 20 September 2026.

## Checks actually completed

- `npm run build`: passed after correcting the JSX runtime configuration found during browser testing. Admin screens are split into lazy-loaded bundles.
- `npm test`: 20 passing tests, zero failures. Tests use a local PostgreSQL engine (PGlite), with minimal Supabase Auth/Storage schema fixtures. The actual migration is executed; policy behavior is not mocked.
- Database checks cover published/draft visibility, image metadata and storage read permissions, blocked anonymous enquiry reads/inserts, non-admin writes and privilege escalation, admin access, atomic product/gallery rollback, case-insensitive SKU uniqueness, unpublishing, retained enquiry history after deletion, and rate-limit function permissions/counts.
- Validation checks reject missing name, invalid phone/email, fractional/excess quantity, invalid product ID, honeypot content, absent CAPTCHA and excessive message length. Allowed fields are selected explicitly so injected internal notes/status/snapshot/timestamp values are ignored.
- `deno check supabase/functions/submit-enquiry/index.ts`: passed after fixing nullable-result narrowing.
- Dependency audit: zero vulnerabilities after updating the affected dependency; final production audit also returned zero vulnerabilities.
- Normal local site returned HTTP 200 at `http://127.0.0.1:5174/`.
- Desktop homepage was visually inspected at 1440px.
- Our Story, Contact, Privacy, Terms, custom 404 and private admin-login pages rendered with their own titles at 768px, with no measured horizontal overflow and no console errors in that verification pass.
- Mobile product detail was visually inspected at 390px using a test product, with no measured horizontal overflow.

## Isolated browser workflow checks

A disposable loopback API in `tests/fixture-server.mjs` supplied clearly labelled TEST FIXTURE records to a separate Vite instance on port 5175. This data was never connected to the normal site, saved in a real Supabase account or included in the production catalogue.

Verified through the browser against this fixture:

- Pagination from 12 displayed records to the remaining record on page 2.
- Category + material + colour + size + minimum price filtering together.
- Descending price sorting and SKU search reducing results to the matching product.
- Dynamic detail route, provided attributes, variants and related products.
- Product auto-selection in the Request Price dialog and form field entry.
- Prefilled WhatsApp link includes product name, SKU and product URL. No message was sent.
- Admin sign-in response handling, dashboard counts and private product listing.
- Creating a product, selecting the existing logo file as a disposable upload, local image optimization/preview, upload request, saving/publishing, and viewing the new public detail route.
- The uploaded image subsequently loaded from the fixture storage URL with its saved alt text.
- Enquiry detail display, saving Follow-up Required status and private internal notes.
- Saving website settings and signing out.

These checks validate interface behavior, not real Supabase Auth, hosted Storage or the deployed Edge Function.

## Not completed / requires configured external services

- Real Supabase Auth login and role membership in your hosted project.
- Real persistent image uploads, signed URLs and permission checks against hosted storage.
- Browser-to-server enquiry submission: Turnstile did not complete in the test browser; no successful browser submission is claimed. The server validator and SQL access rules were tested separately.
- Live function CORS, real CAPTCHA verification, hosting-proxy rate limiting and remote database insertion.
- Full image reorder/remove/replace and duplicate/delete workflows in a live Supabase project.
- Production deployment, custom domain, generated sitemap with the real domain and all product URLs.
- All legacy external product-image URLs, real email/phone links and brand content verification.
- Full keyboard/screen-reader audit and exhaustive responsive testing across all devices.

## Required acceptance checks after setup

1. Apply the migration to a new Supabase project and verify RLS remains enabled on all application tables.
2. Confirm signed-out and non-admin clients cannot read enquiries, internal notes, drafts or draft images, and cannot mutate products/settings or self-assign an admin role.
3. Create an authorized administrator and test real sign-in/sign-out, including direct navigation to `/admin/enquiries` after logout.
4. Add a draft with several images; set/reorder its main image and alt text, replace/remove an image, publish it, and confirm it appears publicly. Check its draft version was not public beforehand.
5. Submit a real test enquiry with your own contact details through Turnstile; confirm one saved record and its product snapshot. Verify invalid CAPTCHA and excessive repeated requests are rejected.
6. Change enquiry status and internal notes, then verify those notes never appear in public responses.
7. Test no-price and public-price products, sale-price ordering, combined filters, empty results and pagination on your actual catalogue.
8. Unpublish/delete a test product and confirm public access is removed and existing enquiry snapshots are preserved. Signed image URLs may remain valid for up to ten minutes.
9. Review contact/WhatsApp/social information and policies, regenerate the sitemap, deploy, and verify deep links, robots headers, images and the 404 presentation on your real host.

## Local fixture reproduction (optional developer check)

Run the fixture API separately:

```powershell
node tests/fixture-server.mjs
```

In a second temporary terminal session:

```powershell
$env:VITE_SUPABASE_URL='http://127.0.0.1:5180'
$env:VITE_SUPABASE_PUBLISHABLE_KEY='fixture-public-key'
$env:VITE_TURNSTILE_SITE_KEY='1x00000000000000000000AA'
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

The fixture accepts the disposable login `admin@example.test` with an arbitrary test password. It is not an authentication implementation. Never deploy it or point production builds at it. Close both test processes and the temporary terminal when finished. The normal site uses its real `.env.local`, not these test-only process variables.
