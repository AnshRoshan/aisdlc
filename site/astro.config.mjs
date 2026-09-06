import { defineConfig } from "astro/config";

// Deployed to GitHub Pages behind a custom domain (CNAME in public/), so the
// site is served from the domain root. If you drop the CNAME, set base to
// "/aisdlc/" and site to "https://anshroshan.github.io".
export default defineConfig({
  site: "https://aisdlc.dev",
  trailingSlash: "never",
});
