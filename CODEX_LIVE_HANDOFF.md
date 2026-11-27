# A&E Lawn Care - Live Project Handoff (Codex)

Last updated: 2026-11-27

This file reflects the current live project structure and behavior for `https://www.aelawnpros.com`.

## Live Pages and Routes

Vercel `cleanUrls` is on, so pages are served without `.html`.

- `/` -> `index.html` (hero video, services grid, work carousel, about, process, service-area map, FAQ)
- The 3-step "Free estimate" pop-up (`#quote-modal`) is on every page except `/contact`; any element with `data-quote-open` opens it, and `data-service="..."` pre-selects a service
- `/services` -> `services.html` (10 service sections with sticky in-page nav; "Get a quote" links pre-select the service on `/contact?service=...`)
- `/work` -> `work.html` (filterable project gallery with lightbox; `/work?filter=hardscape|lawn|grading|planting|carpentry`)
- `/contact` -> `contact.html` (full quote form)
- `/admin` -> `admin.html` (owner dashboard, noindex)
- `404.html` - custom not-found page

## Core Frontend Files

- `styles.css` - public site styles (design tokens at the top of the file)
- `admin.css` - admin dashboard styles (the previous site stylesheet, kept as-is for admin)
- `script.js` - shared interactions: header, mobile menu, reveal animations, carousel, gallery filters, lightbox, quote modal
- `contact.js` - quote form submission to Supabase (`quotes` table); loads the Supabase library on demand
- `admin.js` - admin auth, quote list rendering, translation controls
- `where-we-work.js` - Leaflet service-area map, loaded only when the map scrolls near view
- `us-states.js` - fills state dropdowns for both quote forms
- `vercel.json` - clean URLs, `/admin` rewrite, cache and security headers
- `sitemap.xml`, `robots.txt`, `site.webmanifest`, `favicon.ico` - SEO / browser metadata

Header, footer and the quote form markup are repeated in each page. If you change one, update all pages.

## Data / Backend Integration

- Supabase client setup:
  - `supabase-config.js`
  - `supabase-client.js`
- Quote form writes to `quotes` table with fields:
  - `name`, `email`, `phone`
  - `street_address`, `city`, `state`, `zip_code`
  - `customer_type`, `service`, `message`

## Current Business Contact Info (Live)

- Main phone: `(864) 473-9976`
- Secondary phone: `(864) 612-1455`
- Public email: `support@aelawnpros.com`

## Assets

- `assets/brand/` - logo (webp/png), favicons, app icons, `og-image.jpg` for link previews
- `assets/img/` - project photos as `.jpg` (fallback, used in structured data) plus `.webp` and `-480.webp` responsive versions
- `assets/video/` - `hero-bg-540.mp4` (muted background loop), `lawn-care-reel-720.mp4` (lightbox video with audio), poster image
- `assets/logo.png`, `assets/favicon-32x32.png` - legacy files kept so old external links do not break

To add a project photo: export a `.jpg` (max ~1200px), create `.webp` and `-480.webp` versions, then add a tile to `work.html` (and optionally the homepage carousel) with `data-lightbox="work"`, `data-title`, `data-desc` and `data-category`.

## Cleanup Applied

Removed non-live or unused files to keep this folder aligned with deployed behavior:

- `PROJECT_HANDOFF.md`
- `SUPABASE_SETUP.md`
- `assets/sc-service-map-clean.png`
- `assets/sc-service-map.png`
- `assets/service-area-map.jpg`
- `assets/showcase-flower.png`
- `assets/showcase-grass.png`
- `assets/showcase-tree-2.png`

## Notes for Next Codex Session

- Treat this directory as the source of truth for live page behavior.
- If changing routes, keep `vercel.json` rewrite rules in sync.
- If replacing video formats for performance, update both:
  - `<video><source ...></video>` tags in `index.html`
  - hero fallback background in `styles.css`.
