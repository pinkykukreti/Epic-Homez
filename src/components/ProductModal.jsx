// import { useEffect, useState } from 'react';
// export default function ProductModal({product,onClose}){
//  const [active,setActive]=useState(0);
//  useEffect(()=>{setActive(0)},[product]);
//  useEffect(()=>{const fn=e=>{if(e.key==='Escape')onClose();if(e.key==='ArrowRight')setActive(v=>(v+1)%product.images.length);if(e.key==='ArrowLeft')setActive(v=>(v-1+product.images.length)%product.images.length)};document.addEventListener('keydown',fn);document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',fn);document.body.style.overflow=''}},[product,onClose]);
//  const move=d=>setActive(v=>(v+d+product.images.length)%product.images.length);
//  return <div className="modal-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
//   <div className="modal" onMouseDown={e=>e.stopPropagation()}>
//    <button className="modal-close" onClick={onClose}>×</button>
//    <div className="modal-gallery">
//     <div className="modal-main"><img src={product.images[active]} alt={`${product.name} view ${active+1}`}/><button className="arrow left" onClick={()=>move(-1)}>‹</button><button className="arrow right" onClick={()=>move(1)}>›</button><span className="counter">{active+1} / {product.images.length}</span></div>
//     <div className="thumbs">{product.images.map((img,i)=><button key={img} className={i===active?'active':''} onClick={()=>setActive(i)}><img src={img} alt=""/></button>)}</div>
//    </div>
//    <div className="modal-info"><span className="eyebrow">{product.category}</span><h2>{product.name}</h2><p className="price">₹{product.price.toLocaleString('en-IN')}</p><p>A thoughtfully made textile that celebrates the irregular beauty of hand craftsmanship. Subtle variations make every piece unique.</p><dl><div><dt>Craft</dt><dd>{product.craft}</dd></div><div><dt>Material</dt><dd>{product.material}</dd></div><div><dt>Care</dt><dd>Gentle cold wash; shade dry</dd></div></dl><button className="primary full">Enquire on WhatsApp</button></div>
//   </div>
//  </div>
// }
