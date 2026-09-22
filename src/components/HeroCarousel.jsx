import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import ArrowIcon from './ArrowIcon';
const slides=[
 {image:'/images/luxury-home-hero.png',alt:'Warm luxury living room with layered ivory furnishings',eyebrow:'The art of living beautifully',title:'A considered home. An everyday luxury.',text:'Discover inviting textures, thoughtful details and the finishing touches that make a space your own.',link:'/products',cta:'Explore the collection',caption:'A little inspiration for your home'},
 {image:'/products/bedcovers/sage-floral-bedcover-1.jpeg',alt:'Sage floral bedcover styled in a bedroom',eyebrow:'Layers of quiet comfort',title:'Make every morning feel special.',text:'Explore bedcovers, comforters and bedding for a beautifully layered room.',link:'/collections/bedcovers',cta:'Discover the bedding edit',caption:'Bedcovers & comforters'},
 {image:'/products/table-linen/black-and-ivory-table-runner-1.jpeg',alt:'Black and ivory textured runner on a dining table',eyebrow:'The details make the moment',title:'Set the scene for something lovely.',text:'Bring texture and personality to the table, from everyday meals to memorable gatherings.',link:'/collections/table-linen',cta:'Explore table linen',caption:'Gather beautifully'}
];
export default function HeroCarousel(){
 const [active,setActive]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[reduced,setReduced]=useState(true);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);
 useEffect(()=>{if(paused||hover||focused||reduced)return;const id=setInterval(()=>{if(!document.hidden)setActive(n=>(n+1)%slides.length)},6500);return()=>clearInterval(id)},[paused,hover,focused,reduced]);
 const move=d=>{setPaused(true);setActive(n=>(n+d+slides.length)%slides.length)};
 const slide=slides[active];
 return <section className="hero-section hero-carousel" aria-roledescription="carousel" aria-label="Featured collections" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false)}}>
  {slides.map((s,i)=><img key={s.image} className={'hero-slide '+(i===active?'is-active':'')} src={s.image} alt={i===active?s.alt:''} aria-hidden={i!==active} fetchPriority={i===0?'high':'auto'} loading={i===0?'eager':'lazy'}/>)}
  <div className="hero-shade"/>
  <div className="hero-content"><p className="section-label">{slide.eyebrow}</p><h1>{slide.title}</h1><p>{slide.text}</p><Link to={slide.link} className="hero-button">{slide.cta}<span aria-hidden="true">↗</span></Link></div>
  <div className="hero-carousel-bottom"><p>{slide.caption}</p><div className="hero-controls">
  <button onClick={()=>move(-1)} aria-label="Previous slide"><ArrowIcon direction="left"/></button>
  <div className="hero-dots">{slides.map((s,i)=><button key={s.image} aria-label={'Go to slide '+(i+1)} aria-pressed={i===active} className={i===active?'active':''} onClick={()=>{setActive(i);setPaused(true)}}><span/></button>)}</div>
  <button onClick={()=>move(1)} aria-label="Next slide"><ArrowIcon/></button>
  {!reduced&&<button onClick={()=>setPaused(p=>!p)} aria-label={paused?'Play slideshow':'Pause slideshow'}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{paused?<path d="M8 5l11 7-11 7z"/>:<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>}</svg></button>}
  </div></div>
 </section>
}
