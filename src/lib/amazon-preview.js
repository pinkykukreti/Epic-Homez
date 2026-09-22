import { categoryMatches, hiddenCategories } from "./collections";
import data from '../../imports/amazon-products-2026-09-20.json';
import local from '../../imports/local-products.json';
export const products = [...local.products, ...data.products.filter(p => p.asin !== "B0HFK4SGPD").map(p => ({
  id: p.asin, name: p.name, slug: p.slug, category_slug: 'bedsheets',
  public_price: null, sale_price: null, specifications: {}, variants: [],

  images: p.images.map((url, position) => ({url, alt: p.name, position})),
  tags: [p.asin], size: '', material: '', colour: '',
}))];
export function list(filters = {}, page = 1, pageSize = 12) {
  let items = products.filter(p => (!hiddenCategories.includes(p.category_slug) && categoryMatches(p.category_slug, filters.category)) &&
    (!filters.q || (p.name+' '+p.tags.join(' ')).toLowerCase().includes(filters.q.toLowerCase())) &&
    ['size','material','colour'].every(k => !filters[k] || p[k] === filters[k]));
  if (filters.featured) items = items.filter(p=>p.featured);
  if (filters.new_arrival) items = items.filter(p=>p.new_arrival);
  if (filters.sort === 'name') items = [...items].sort((a,b)=>a.name.localeCompare(b.name));
  return {items: items.slice((page-1)*pageSize,page*pageSize),count:items.length};
}
