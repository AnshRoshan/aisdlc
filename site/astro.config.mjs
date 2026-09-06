import { defineConfig } from "astro/config";

// Deployed to GitHub Pages at https://anshroshan.github.io/aisdlc/ — the base
// must match. To move to a custom domain later: remove this base, point the
// DNS at anshroshan.github.io, and re-add a CNAME file in public/.
export default defineConfig({
  site: "https://anshroshan.github.io",
  base: "/aisdlc",
  trailingSlash: "never",
});
