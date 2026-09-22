export const hiddenCategories = ['rajai','sofa-covers','home-accessories'];
export const categoryMatches = (productCategory, filter) => !filter || (['bedcovers','comforters'].includes(filter) ? ['bedcovers','comforters'].includes(productCategory) : productCategory===filter);
export function publicCategories(groups) {
  return groups.filter(c=>!hiddenCategories.includes(c.slug)&&c.slug!=='comforters').map(c=>c.slug==='bedcovers'?{...c,name:'Bedcovers & Comforters'}:c);
}
export const collectionImages = {
  bedsheets:'/products/bedsheets/ivory-stripe-bedsheet-1.jpeg',
  bedcovers:'/products/bedcovers/sage-floral-bedcover-1.jpeg',
  comforters:'/products/bedcovers/sage-floral-bedcover-1.jpeg',
  'cushion-covers':'/products/cushion-covers/gold-patchwork-cushion-cover-1.jpeg',
  'throws-blankets':'/products/throws-blankets/brown-quilted-blanket-1.jpeg',
  carpet:'/products/carpet/neutral-chevron-carpet-1.jpeg',
  'table-linen':'/products/table-linen/black-and-ivory-table-runner-1.jpeg'
};
