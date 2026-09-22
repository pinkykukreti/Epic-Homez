import { Link } from "react-router-dom";
import { useSite } from "../lib/context";
import { configured, localPreview, listProducts, safeUrl } from "../lib/api";
import { useLoad } from "../lib/hooks";
import ProductCard from "../components/ProductCard";
import { Empty, LoadState } from "../components/UI";
import Meta from "../components/Meta";
import HeroCarousel from "../components/HeroCarousel";
const collectionImagery = {"bedsheets":"bedsheets/ivory-stripe-bedsheet-1.jpeg","bedcovers":"bedcovers/sage-floral-bedcover-1.jpeg","cushion-covers":"cushion-covers/gold-patchwork-cushion-cover-1.jpeg","throws-blankets":"throws-blankets/brown-quilted-blanket-1.jpeg","table-linen":"table-linen/black-and-ivory-table-runner-1.jpeg","carpet":"carpet/neutral-chevron-carpet-1.jpeg"};
function Selection({ kind, title, onEnquire }) {
  const state = useLoad(
    () =>
      (configured || localPreview)
        ? listProducts({ [kind]: true }, 1, false, 4)
        : Promise.resolve({ items: [], count: 0 }),
    [kind],
  );
  return (
    <section className="products-section">
      <div className="section-heading row-heading">
        <div>
          <p className="section-label">The Epic Homez edit</p>
          <h2>{title}</h2>
        </div>
        <Link className="underlined" to="/products">
          Explore all products ↗
        </Link>
      </div>
      <LoadState state={state}>
        {state.data?.items.length ? (
          <div className="products-grid four">
            {state.data.items.map((p) => (
              <ProductCard key={p.id} product={p} onEnquire={onEnquire} />
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </LoadState>
    </section>
  );
}
export default function Home({ onEnquire }) {
  const { settings: s, categories } = useSite();
  return (
    <>
      <Meta title="Home furnishings for your everyday" />
      <HeroCarousel />
      <div className="editorial-strip">
        <span>For slow mornings</span>
        <span>For favourite corners</span>
        <span>For a home that feels like you</span>
      </div>
      <section className="products-section categories-section">
        <div className="section-heading">
          <p className="section-label">Find your finishing touch</p>
          <h2>
            A little comfort.
            <br />
            <em>In every corner.</em>
          </h2>
          <p className="collection-intro">Explore the collection, room by room. From the first light in your bedroom to an evening around the table, discover pieces that bring warmth and character to every day.</p><div className="collection-intro-note"><span>THE EPIC HOMEZ APPROACH</span><p>Start with a favourite texture. Add a considered layer. Make it unmistakably yours.</p><Link to="/products" className="underlined">Find your next favourite ↗</Link></div>
        </div>
        <div className="category-grid">
          {categories.filter(c => collectionImagery[c.slug]).map((c, i) => (
            <Link
              to={"/collections/" + c.slug}
              key={c.slug}
              className={"category-tile" + (collectionImagery[c.slug] ? " category-with-image" : "")}
            >
              {collectionImagery[c.slug] && <img loading="lazy" src={"/products/" + collectionImagery[c.slug]} alt={c.name + " collection"} />}
              <span className="category-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{c.name}</h3>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
      <nav className="other-collections" aria-label="More collections">{categories.filter(c => !collectionImagery[c.slug]).map(c => <Link key={c.slug} to={"/collections/" + c.slug}>{c.name} ↗</Link>)}</nav>
      {s.show_featured && (
        <Selection
          kind="featured"
          title="In the spotlight"
          onEnquire={onEnquire}
        />
      )}
      <section className="craft-section">
        <div
          className="story-image"
          role="img"
          aria-label="A welcoming interior with layered furnishings"
        />
        <div className="story-copy">
          <p className="section-label">Our story, your space</p>
          <h2>{s.story_title}</h2>
          <p>{s.story_text}</p>
          <Link className="underlined" to="/our-story">
            Get to know Epic Homez ↗
          </Link>
        </div>
      </section>
      {s.show_new && (
        <Selection
          kind="new_arrival"
          title="New to the collection"
          onEnquire={onEnquire}
        />
      )}
      <section className="why-section">
        <p className="section-label">A more personal way to explore</p>
        <h2>Find it. Love it. Let’s talk.</h2>
        <div className="three-columns">
          {[
            [
              "01",
              "Browse at your pace",
              "Explore home furnishings across our product categories.",
            ],
            [
              "02",
              "Get to know the details",
              "View the available images, dimensions, materials and specifications.",
            ],
            [
              "03",
              "Start a conversation",
              "Request prices and availability directly, without creating an account.",
            ],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>
      {safeUrl(s.instagram) && (
        <section className="social-section">
          <p className="section-label">More from Epic Homez</p>
          <h2>A little inspiration for your feed.</h2>
          <a
            className="underlined"
            href={safeUrl(s.instagram)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Find us on Instagram ↗
          </a>
        </section>
      )}
      <section className="collection-faq products-section">
        <p className="section-label">Before you choose</p><h2>The details, considered.</h2>
        {[
          ['How do I request a price?', 'Open any product and choose Request price on WhatsApp, or use our contact form. Tell us the product and quantity you have in mind.'],
          ['Can I confirm colours, sizes and materials?', 'Yes. Contact our team to confirm the available options before ordering. Colours may look different across screens and lighting.'],
          ['What about delivery and returns?', 'Please confirm delivery availability, charges, timing and the applicable return terms with our team before payment.'],
          ['Do you handle wholesale enquiries?', 'For wholesale or export enquiries, share your selected products, quantities and destination with our team.']
        ].map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>
      <section className="enquiry-cta">
        <div>
          <p className="section-label">Make room for something lovely</p>
          <h2>
            Your next favourite
            <br />
            starts with a conversation.
          </h2>
        </div>
        <Link className="primary" to="/contact">
          Get in touch ↗
        </Link>
      </section>
    </>
  );
}
