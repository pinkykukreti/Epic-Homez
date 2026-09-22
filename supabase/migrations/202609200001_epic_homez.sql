-- Epic Homez: no purchases, payments or customer accounts.
begin;
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
create policy admin_self on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
grant select on public.admin_users to authenticated;

create table public.categories (slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), name text not null unique, position integer not null default 0);
insert into public.categories(slug,name,position) values
('bedsheets','Bedsheets',1),('comforters','Comforters',2),('rajai','Rajai',3),('cushion-covers','Cushion Covers',4),
('throws-blankets','Throws & Blankets',5),('carpet','Carpet',6),('sofa-covers','Sofa Covers',7),('table-linen','Table Linen',8),('home-accessories','Home Accessories',9),('bedcovers','Bedcovers',10);

create table public.products (
 id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) between 1 and 180),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), sku text,
 category_slug text not null references public.categories(slug), short_description text not null default '', description text not null default '',
 size text not null default '', material text not null default '', colour text not null default '',
 specifications jsonb not null default '{}' check (jsonb_typeof(specifications) = 'object'),
 variants jsonb not null default '[]' check (jsonb_typeof(variants) = 'array'), tags text[] not null default '{}',
 public_price numeric(12,2) check (public_price >= 0), sale_price numeric(12,2),
 featured boolean not null default false, new_arrival boolean not null default false, published boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (sale_price is null or (public_price is not null and sale_price >= 0 and sale_price <= public_price)),
 effective_price numeric(12,2) generated always as (coalesce(sale_price,public_price)) stored,
 search_text text generated always as (lower(name || ' ' || coalesce(sku,'') || ' ' || short_description || ' ' || description || ' ' || material || ' ' || colour || ' ' || size)) stored
);
create unique index products_sku_unique on public.products(lower(sku)) where sku is not null and trim(sku) <> '';
create index products_catalogue on public.products(published,category_slug,created_at desc);
create index products_featured on public.products(featured,new_arrival) where published;
create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=now(); return new; end $$;
create trigger product_updated before update on public.products for each row execute function public.touch_updated_at();

create table public.product_images (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 storage_path text, external_url text, alt text not null default '', position integer not null default 0,
 check ((storage_path is not null) <> (external_url is not null)),
 check (external_url is null or external_url ~ '^https://'), unique(product_id,position)
);
create index product_images_path on public.product_images(storage_path);
create table public.site_settings (id boolean primary key default true check(id), data jsonb not null default '{}' check(jsonb_typeof(data)='object'));
insert into public.site_settings(data) values ('{"brand_name":"Epic Homez","logo_url":"/logo.png","hero_title":"A softer way to come home.","hero_text":"Explore home furnishings for the spaces you make your own.","story_title":"Your home. Your own expression.","story_text":"Discover the Epic Homez catalogue, explore the details, and get in touch for prices and availability.","footer_text":"Home furnishings, thoughtfully explored.","show_prices":false,"show_featured":true,"show_new":true,"announcement":"Explore the collection · Enquire for prices and availability"}');
create table public.private_settings (key text primary key, value jsonb not null);
create table public.enquiries (
 id uuid primary key default gen_random_uuid(), customer_name text not null check(length(customer_name) between 2 and 100),
 phone text not null check(length(phone) between 7 and 30), email text check(length(email)<=254),
 product_id uuid references public.products(id) on delete set null, product_name text, product_sku text, product_url text,
 quantity integer check(quantity between 1 and 100000), message text not null default '' check(length(message)<=3000),
 status text not null default 'New' check(status in ('New','Contacted','Follow-up Required','Closed')),
 internal_notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index enquiries_status_date on public.enquiries(status,created_at desc);
create trigger enquiry_updated before update on public.enquiries for each row execute function public.touch_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.site_settings enable row level security;
alter table public.private_settings enable row level security;
alter table public.enquiries enable row level security;
create policy category_read on public.categories for select to anon,authenticated using(true);
create policy category_admin on public.categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy product_read on public.products for select to anon,authenticated using(published or public.is_admin());
create policy product_admin on public.products for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy image_read on public.product_images for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id and (p.published or public.is_admin())));
create policy image_admin on public.product_images for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy settings_read on public.site_settings for select to anon,authenticated using(true);
create policy settings_admin on public.site_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy private_settings_admin on public.private_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy enquiry_admin on public.enquiries for all to authenticated using(public.is_admin()) with check(public.is_admin());
revoke all on public.products, public.categories, public.product_images, public.site_settings, public.private_settings, public.enquiries, public.admin_users from anon,authenticated;
grant select on public.products, public.categories, public.product_images, public.site_settings to anon,authenticated;
grant insert,update,delete on public.products,public.categories,public.product_images,public.site_settings to authenticated;
grant select,insert,update,delete on public.private_settings,public.enquiries to authenticated;
grant select on public.admin_users to authenticated;
grant all on public.enquiries to service_role;
grant select on public.products to service_role;

-- Atomic product + gallery write, so a failed image record cannot partially publish a product.
create function public.save_product(payload jsonb, images jsonb) returns uuid language plpgsql security invoker set search_path = '' as $$
declare p public.products; saved_id uuid; item jsonb; n integer=0;
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 p := jsonb_populate_record(null::public.products,payload);
 saved_id := coalesce(p.id,gen_random_uuid());
 if jsonb_typeof(images) <> 'array' or jsonb_array_length(images)>20 then raise exception 'Maximum 20 images'; end if;
 insert into public.products(id,name,slug,sku,category_slug,short_description,description,size,material,colour,specifications,variants,tags,public_price,sale_price,featured,new_arrival,published)
 values(saved_id,p.name,p.slug,nullif(trim(p.sku),''),p.category_slug,coalesce(p.short_description,''),coalesce(p.description,''),coalesce(p.size,''),coalesce(p.material,''),coalesce(p.colour,''),coalesce(p.specifications,'{}'),coalesce(p.variants,'[]'),coalesce(p.tags,'{}'),p.public_price,p.sale_price,coalesce(p.featured,false),coalesce(p.new_arrival,false),coalesce(p.published,false))
 on conflict(id) do update set name=excluded.name,slug=excluded.slug,sku=excluded.sku,category_slug=excluded.category_slug,short_description=excluded.short_description,description=excluded.description,size=excluded.size,material=excluded.material,colour=excluded.colour,specifications=excluded.specifications,variants=excluded.variants,tags=excluded.tags,public_price=excluded.public_price,sale_price=excluded.sale_price,featured=excluded.featured,new_arrival=excluded.new_arrival,published=excluded.published;
 delete from public.product_images where product_id=saved_id;
 for item in select value from jsonb_array_elements(images) loop
  insert into public.product_images(product_id,storage_path,external_url,alt,position) values(saved_id,item->>'storage_path',item->>'external_url',coalesce(item->>'alt',''),n);
  n:=n+1;
 end loop;
 return saved_id;
end $$;
revoke all on function public.save_product(jsonb,jsonb) from public;
grant execute on function public.save_product(jsonb,jsonb) to authenticated;

create function public.catalogue_facets() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('sizes',coalesce(jsonb_agg(distinct size) filter(where size<>''),'[]'),'materials',coalesce(jsonb_agg(distinct material) filter(where material<>''),'[]'),'colours',coalesce(jsonb_agg(distinct colour) filter(where colour<>''),'[]'),'has_prices',coalesce(bool_or(public_price is not null),false)) from public.products where published;
$$;
revoke all on function public.catalogue_facets() from public;
grant execute on function public.catalogue_facets() to anon,authenticated;

-- Private bucket: draft images cannot be fetched anonymously. Public signed links expire in 10 minutes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',false,8388608,array['image/jpeg','image/png','image/webp']);
create policy image_storage_read on storage.objects for select to anon,authenticated using(bucket_id='product-images' and (public.is_admin() or exists(select 1 from public.product_images i join public.products p on p.id=i.product_id where i.storage_path=storage.objects.name and p.published)));
create policy image_storage_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.is_admin());
create policy image_storage_update on storage.objects for update to authenticated using(bucket_id='product-images' and public.is_admin()) with check(bucket_id='product-images' and public.is_admin());
create policy image_storage_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and public.is_admin());

-- Only the server function can use this atomic throttle; raw IP addresses are not stored.
create table public.enquiry_rate_limits (key text primary key, window_start timestamptz not null, hits integer not null);
alter table public.enquiry_rate_limits enable row level security;
revoke all on public.enquiry_rate_limits from anon,authenticated;
create function public.consume_enquiry_limit(rate_key text) returns boolean language plpgsql security definer set search_path='' as $$
declare count_hits integer;
begin
 delete from public.enquiry_rate_limits where window_start < now()-interval '1 day';
 insert into public.enquiry_rate_limits(key,window_start,hits) values(rate_key,now(),1)
 on conflict(key) do update set hits=case when public.enquiry_rate_limits.window_start < now()-interval '15 minutes' then 1 else public.enquiry_rate_limits.hits+1 end,window_start=case when public.enquiry_rate_limits.window_start < now()-interval '15 minutes' then now() else public.enquiry_rate_limits.window_start end returning hits into count_hits;
 return count_hits<=5;
end $$;
revoke all on function public.consume_enquiry_limit(text) from public,anon,authenticated;
grant execute on function public.consume_enquiry_limit(text) to service_role;
commit;


