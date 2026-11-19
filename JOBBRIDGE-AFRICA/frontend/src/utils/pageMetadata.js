const SITE_URL = "https://jobbridgeafrica.com";

const ensureMeta = (attribute, key, content) => {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

export const updatePageMetadata = ({ title, description, path, noIndex = false }) => {
  document.title = title;
  ensureMeta("name", "description", description);
  ensureMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
  ensureMeta("property", "og:title", title);
  ensureMeta("property", "og:description", description);
  ensureMeta("property", "og:url", `${SITE_URL}${path}`);
  ensureMeta("name", "twitter:title", title);
  ensureMeta("name", "twitter:description", description);
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${SITE_URL}${path}`;
};
