import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("PostgreSQL migration, RLS, storage policies and atomic operations", async (t) => {
  const db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security; grant usage on schema storage to anon,authenticated; grant select,insert,update,delete on storage.objects to anon,authenticated; grant usage on schema public to anon,authenticated,service_role;`,
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202609200001_epic_homez.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const admin = "11111111-1111-4111-8111-111111111111",
    outsider = "22222222-2222-4222-8222-222222222222",
    pub = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    draft = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await db.exec(
    `insert into auth.users values('${admin}'),('${outsider}');insert into public.admin_users values('${admin}');insert into public.products(id,name,slug,sku,category_slug,published) values('${pub}','Published Test','published-test','TEST-1','bedsheets',true),('${draft}','Private Test','private-test','TEST-2','bedsheets',false);insert into public.product_images(product_id,storage_path) values('${pub}','published/file.webp'),('${draft}','draft/file.webp');insert into storage.objects(bucket_id,name) values('product-images','published/file.webp'),('product-images','draft/file.webp');insert into public.enquiries(customer_name,phone,product_id,product_name,internal_notes) values('Private Customer','9876543210','${pub}','Published Test','PRIVATE NOTE');`,
  );
  async function as(role, user = "") {
    await db.exec(
      `reset role;set role ${role};set request.jwt.claim.sub='${user}';`,
    );
  }
  await t.test(
    "Anonymous users read published products and their images only",
    async () => {
      await as("anon");
      assert.equal(
        (await db.query("select * from public.products")).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select * from public.product_images")).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select * from storage.objects")).rows.length,
        1,
      );
    },
  );
  await t.test(
    "Anonymous users cannot read or submit enquiries directly",
    async () => {
      await as("anon");
      await assert.rejects(
        db.query("select * from public.enquiries"),
        /permission denied/,
      );
      await assert.rejects(
        db.query(
          "insert into public.enquiries(customer_name,phone) values('Attacker','9876543210')",
        ),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select * from public.admin_users"),
        /permission denied/,
      );
    },
  );
  await t.test(
    "Authenticated non-admin cannot read private records or become an admin",
    async () => {
      await as("authenticated", outsider);
      assert.equal(
        (await db.query("select * from public.enquiries")).rows.length,
        0,
      );
      assert.equal(
        (await db.query("select * from public.products")).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select * from public.private_settings")).rows.length,
        0,
      );
      await assert.rejects(
        db.query(`insert into public.admin_users values('${outsider}')`),
        /permission denied/,
      );
      await assert.rejects(
        db.query(
          "insert into public.products(name,slug,category_slug) values('Bad','bad','bedsheets')",
        ),
        /row-level security/,
      );
      assert.equal(
        (
          await db.query(
            "update public.site_settings set data='{}' returning *",
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values('product-images','attack.webp')",
        ),
        /row-level security/,
      );
    },
  );
  await t.test(
    "Admin can manage private records and draft images",
    async () => {
      await as("authenticated", admin);
      assert.equal(
        (await db.query("select public.is_admin() as yes")).rows[0].yes,
        true,
      );
      assert.equal(
        (await db.query("select * from public.enquiries")).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select * from storage.objects")).rows.length,
        2,
      );
      assert.equal(
        (
          await db.query(
            "update public.enquiries set status='Contacted',internal_notes='Updated private note' returning *",
          )
        ).rows.length,
        1,
      );
    },
  );
  await t.test(
    "Product and gallery save is atomic and duplicate SKUs rejected",
    async () => {
      await as("authenticated", admin);
      const payload = {
        id: pub,
        name: "Changed",
        slug: "published-test",
        sku: "TEST-1",
        category_slug: "bedsheets",
        published: true,
      };
      await assert.rejects(
        db.query("select public.save_product($1,$2)", [
          payload,
          [{ external_url: "http://invalid.test" }],
        ]),
      );
      assert.equal(
        (await db.query("select name from public.products where id=$1", [pub]))
          .rows[0].name,
        "Published Test",
      );
      await assert.rejects(
        db.query(
          "insert into public.products(name,slug,sku,category_slug) values('Duplicate','duplicate','test-1','bedsheets')",
        ),
        /unique/,
      );
      await db.query("select public.save_product($1,$2)", [
        payload,
        [{ storage_path: "published/new.webp", alt: "Updated image" }],
      ]);
      assert.equal(
        (await db.query("select name from public.products where id=$1", [pub]))
          .rows[0].name,
        "Changed",
      );
    },
  );
  await t.test("Unpublishing immediately removes public access", async () => {
    await as("authenticated", admin);
    await db.query("update public.products set published=false where id=$1", [
      pub,
    ]);
    await as("anon");
    assert.equal(
      (await db.query("select * from public.products")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.product_images")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
  });
  await t.test("Enquiry snapshots survive product deletion", async () => {
    await as("authenticated", admin);
    await db.query("delete from public.products where id=$1", [pub]);
    const row = (await db.query("select * from public.enquiries")).rows[0];
    assert.equal(row.product_id, null);
    assert.equal(row.product_name, "Published Test");
  });
  await t.test(
    "Throttle denies sixth submission and cannot be invoked publicly",
    async () => {
      await as("anon");
      await assert.rejects(
        db.query("select public.consume_enquiry_limit('key')"),
        /permission denied/,
      );
      await as("service_role");
      for (let i = 0; i < 5; i++)
        assert.equal(
          (
            await db.query(
              "select public.consume_enquiry_limit('key') as allowed",
            )
          ).rows[0].allowed,
          true,
        );
      assert.equal(
        (
          await db.query(
            "select public.consume_enquiry_limit('key') as allowed",
          )
        ).rows[0].allowed,
        false,
      );
    },
  );
  await db.close();
});
