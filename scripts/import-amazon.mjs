import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const data = JSON.parse(await readFile(new URL('../imports/amazon-products-2026-09-20.json', import.meta.url), 'utf8'));
const seen = new Set();
for (const p of data.products) {
  if (!/^[A-Z0-9]{10}$/.test(p.asin) || seen.has(p.asin) || !p.name || p.name.length > 180 || !/^amazon-[a-z0-9]{10}$/.test(p.slug) || !Number.isFinite(p.amazon_price_inr) || p.amazon_price_inr < 0 || !p.images.length) throw new Error('Invalid import record');
  seen.add(p.asin);
  for (const image of p.images) {
    const u = new URL(image);
    if (u.protocol !== 'https:' || u.hostname !== 'm.media-amazon.com' || !u.pathname.startsWith('/images/I/')) throw new Error('Unexpected image source');
  }
}
console.log(`${data.products.length} validated Amazon records, observed ${data.observed_on}.`);
if (!process.argv.includes('--apply')) {
  console.log('Preview only. No database changes. Pass --apply with authorized admin environment variables to import unpublished drafts and copy photos into your Supabase storage.');
  process.exit(0);
}
const { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key, IMPORT_ADMIN_EMAIL: email, IMPORT_ADMIN_PASSWORD: password } = process.env;
if (!url || !key || !email || !password) throw new Error('Set Supabase public configuration and temporary IMPORT_ADMIN_EMAIL / IMPORT_ADMIN_PASSWORD environment variables. Never use a service-role key.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const session = await db.auth.signInWithPassword({ email, password });
if (session.error) throw session.error;
async function photoBytes(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok || !response.body) throw new Error('Could not retrieve listing photo');
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > 8388608) { await response.body.cancel().catch(() => {}); throw new Error('Photo exceeds 8 MB'); }
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp = bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
  if (!jpeg && !png && !webp) throw new Error('Photo must be JPEG, PNG or WebP');
  return { bytes, mime: jpeg ? 'image/jpeg' : png ? 'image/png' : 'image/webp', extension: jpeg ? 'jpg' : png ? 'png' : 'webp' };
}
try {
  const admin = await db.rpc('is_admin');
  if (admin.error || !admin.data) throw new Error('An authorized administrator is required');
  for (const p of data.products) {
    const existing = await db.from('products').select('id').eq('slug',p.slug).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) { console.log(`Skipped existing product: ${p.name}`); continue; }
    const paths = [];
    let saved = false;
    try {
      const id = randomUUID();
      const images = [];
      for (const source of p.images) {
        const { bytes, mime, extension } = await photoBytes(source);
        const path = `${id}/${randomUUID()}.${extension}`;
        const upload = await db.storage.from('product-images').upload(path, bytes, { contentType: mime, upsert: false });
        if (upload.error) throw upload.error;
        paths.push(path);
        images.push({ storage_path: path, alt: p.name });
      }
      const result = await db.rpc('save_product', { payload: {
        id, name: p.name, slug: p.slug, category_slug: 'bedsheets', sku: null,
        short_description: '', description: '', size: '', material: '', colour: '',
        specifications: {}, variants: [], tags: ['amazon-import-review',p.asin,`price-observed-${data.observed_on}`],
        public_price: p.amazon_price_inr, sale_price: null, published: false, featured: false, new_arrival: false,
      }, images });
      if (result.error) throw result.error;
      saved = true;
      console.log(`Imported draft: ${p.name}`);
    } catch (error) {
      // Resolve an uncertain RPC response before deleting uploaded files.
      const check = await db.from('products').select('id').eq('slug',p.slug).maybeSingle();
      if (!saved && !check.error && !check.data && paths.length) {
        const cleanup = await db.storage.from('product-images').remove(paths);
        if (cleanup.error) console.error('Photo cleanup failed; review storage paths:', paths);
      }
      throw error;
    }
  }
} finally { await db.auth.signOut(); }
