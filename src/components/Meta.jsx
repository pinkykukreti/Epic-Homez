import { useEffect } from "react";
import { useLocation } from "react-router-dom";
export default function Meta({
  title,
  description = "Browse the Epic Homez home furnishings catalogue and enquire for prices and availability.",
  image,
  noindex = false,
}) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${title} | Epic Homez`;
    const update = (key, value, property = false) => {
      let tag = document.head.querySelector(
        `meta[${property ? "property" : "name"}="${key}"]`,
      );
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(property ? "property" : "name", key);
        document.head.append(tag);
      }
      tag.content = value;
    };
    update("description", description);
    update("robots", noindex ? "noindex,nofollow" : "index,follow");
    update("og:title", document.title, true);
    update("og:description", description, true);
    update("og:type", "website", true);
    update("og:url", window.location.origin + pathname, true);
    update("og:image", new URL(image || "/images/luxury-home-hero.png", window.location.origin).href, true);
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.append(link);
    }
    link.href = window.location.origin + pathname;
  }, [title, description, image, noindex, pathname]);
  return null;
}
