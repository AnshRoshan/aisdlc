// Base path for GitHub Pages (https://anshroshan.github.io/aisdlc/). All
// internal hrefs go through this so the site works at a subpath. If the site
// moves to a custom domain root, this collapses to "" automatically.
export const base = import.meta.env.BASE_URL.replace(/\/$/, "");
