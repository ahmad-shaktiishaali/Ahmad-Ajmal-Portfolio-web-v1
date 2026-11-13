# Portfolio search setup

`node scripts/build-seo.mjs` builds the public site into `dist/`. Vercel runs
this command on each deployment. It reads the existing public Firestore profile
and projects without modifying them.

The output includes descriptive titles and descriptions, canonical URLs, social
previews, Person/WebSite/page structured data, project landing pages with their
full text and images, crawlable project links, `robots.txt`, and `sitemap.xml`.
The admin page has `noindex` in both its HTML and HTTP response header.

Project cards still open the interactive preview on the Work page. Their real
links also work with a keyboard, in a new tab, and for crawlers. Newly added
admin projects use the existing Work preview URL until the next deployment
creates their standalone pages. Search landing pages and their metadata reflect
the project data at the latest deployment; redeploy after editing projects to
refresh them. Live Work previews continue to use current Firestore data.

## Google Search Console

1. Open https://search.google.com/search-console and add the URL-prefix property
   `https://ahmadajmal.vercel.app/`.
2. Complete Google's ownership verification. If using an HTML verification
   file or meta tag, add Google's exact value to this project and redeploy.
3. Submit `https://ahmadajmal.vercel.app/sitemap.xml` under Sitemaps.
4. Use URL Inspection for the homepage and important project pages, then request
   indexing. Check Page indexing and Performance for crawl issues and queries.

Use the same portfolio URL on LinkedIn and other professional profiles. Rankings
depend on relevance, competition, content quality, and links; these changes do
not guarantee a position or immediate indexing.
