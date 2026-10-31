# AIM Archive — Audit & Issues Tracker

> Historical measurements and audit evidence. Earlier open/fixed labels describe the original audits, not the current backlog. Track remaining work in [TO DO LIST.md](TO%20DO%20LIST.md); see [September's performance fixes](PERFORMANCE_IMPLEMENTATION.md) for subsequent changes. Retain these Lighthouse baselines and append fresh production measurements when available.

---

## How to run a Lighthouse audit

1. `pnpm build && pnpm start` from `apps/web/` — Lighthouse needs a production build (dev mode inflates bundle sizes and renders unminified, both of which skew perf scores by 20-30 points). `pnpm start` binds to port 3000 per the package's script.
2. Open Chrome on `http://localhost:3000`, F12 → **Lighthouse** tab.
3. Select **Performance**, **Accessibility**, **Best Practices**, **SEO**. Mode: **Navigation**. Device: **Mobile** for first run, **Desktop** for second.
4. Run for: `/`, `/browse`, `/search`, `/issue/[id]` (any), `/read/[id]` (any), `/admin/login`.
5. Paste the four scores below per route, plus any High-severity findings into the relevant table.

### Lighthouse score history

| Date | Build | Route | Device | Perf | A11y | Best | SEO | Notes |
|---|---|---|---|---|---|---|---|---|
| 2026-05-09 | a68f4a7 | `/` | Mobile | 70 | 100 | 100 | 100 | Baseline. Top opportunity: unused JS (~600ms — react-pdf eager-loaded for carousel). |
| 2026-05-09 | a68f4a7 | `/browse` | Mobile | 62 | 98 | 100 | 100 | Baseline. LCP + render-blocking are the levers. |
| 2026-05-09 | a68f4a7 | `/search` | Mobile | 74 | 98 | 100 | 100 | Baseline. |
| 2026-05-09 | a68f4a7 | `/issue/[id]` | Mobile | 81 | 94 | 100 | 92 | Baseline. |
| 2026-05-09 | a68f4a7 | `/read/[id]` | Mobile | 50 | 88 | 100 | 92 | Baseline — worst route. Perf hit by react-pdf bundle + LCP delay; a11y hit by color-contrast, unlabeled controls, missing `<main>` landmark. |
| 2026-05-09 | a68f4a7 | `/admin/login` | Mobile | 97 | 98 | 100 | 61 | Baseline. SEO 61 is **by design** — admin login carries `robots: noindex` and no canonical (intentional). |
| 2026-05-09 | a68f4a7 | `/` | Desktop | 78 | 100 | 100 | 100 | Baseline. |
| 2026-05-09 | _uncommitted_ | `/` | Mobile | **74** ↑4 | 100 | 100 | 100 | Hero subtitle (LCP element) rendered statically (no Framer transform); carousel `next/dynamic` lazy-loaded. |
| 2026-05-09 | _uncommitted_ | `/browse` | Mobile | **83** ↑21 | 98 | 100 | 100 | First-row cover thumbnails carry `priority` + opacity-gate dropped from card animation. **LCP 25.1s → 3.3s**. |
| 2026-05-09 | _uncommitted_ | `/read/[id]` | Mobile | **55** ↑5 | **100** ↑12 | 100 | 92 | Cover-JPEG fallback overlay pins LCP to a fast image instead of the PDF canvas. **A11y 88 → 100** — color-contrast, page-input aria-label, `<main>` landmark all fixed. Deeper LCP win still needs SSR-fetched issue data so the cover URL is in initial HTML. |

---

## Local performance follow-up, 31 October 2026

This is development-server evidence for the 31 October source candidate, not P6-09 production-like acceptance or a Lighthouse score.

| Check | Before | After | Method |
|---|---:|---:|---|
| Eight concurrent requests for one public cover | 3.47 s wall time | 1.58 s wall time | Node fetch against localhost; all eight returned 200. The public single-bucket rate limit now uses one atomic SQLite statement. |
| Browse initial cover requests | 24 | 7 | Playwright desktop viewport, page 1 before scrolling. Cards approaching the viewport mount their covers. |
| Search initial cover requests | About 28 | 1 | Playwright desktop viewport, `q=mother`, before scrolling. |
| Home initial catalogue cover requests | About 16 | 3 | Playwright desktop viewport, before scrolling. |
| Home scenic background requests | Desktop and phone | Matching viewport only | Playwright desktop and 390 px phone viewports; responsive `picture` sources. |

The optimized local web build passed. Rate-limit and performance regression scripts, TypeScript and lint passed. Browse logged intermittent Next.js development streaming `$RS`/`parentNode` errors while rendering its catalogue. The isolated production follow-up below checks these symptoms and records the remaining limits. P6-09 remains open.

### Isolated local production investigation, 31 October 2026

An isolated Next.js 15.5.28 build (`NEXT_DIST_DIR=.next-investigation`) ran on localhost:3001 while the development server stayed on port 3000. The server used the existing catalogue environment, localhost proxy-preview flags and a temporary process-only rate-limit key. Lighthouse 13.6.0 used its default simulated mobile profile unless noted. Reports are in `output/playwright/lighthouse-*.json`. These are single local runs, not hosted scores; Home mobile was repeated and its simulated LCP remained 28.7–28.8 seconds. Overall scores varied with blocking time.

| Route | Mobile score | Simulated mobile LCP | Mobile TBT | Desktop score | Desktop LCP |
|---|---:|---:|---:|---:|---:|
| Home | 60 | 28.7 s | 372 ms | 73 | 4.8 s |
| Browse | 66 | 27.4 s | 350 ms | 77 | 4.6 s |
| Search (`q=mother`) | 72 | 1.2 s text LCP | 784 ms | — | — |
| Issue detail | 64 | 28.1 s | 424 ms | — | — |
| Admin login | 93 | 1.1 s text LCP | 292 ms | — | — |
| Reader | 55* | 5.7 s* | 523 ms* | — | — |

*The Reader audit is invalid as a full-document measure: in this local production setup its PDF redirect reaches R2, whose CORS policy does not allow `localhost:3001`. The shell loads, then PDF.js retries and shows a document error. No Reader success or PDF render timing is claimed.*

**Observed causes and controls:**

- The default `apps/web/public/logo.png` is 4,411,949 bytes at 2000×2000 pixels, although the header displays it at about 40×40. It is served unoptimized through the brand-route fallback on every measured page. Blocking only `*logo.png*` in Lighthouse reduced simulated LCP from 28.7 to 7.0 seconds on Home and from 27.4 to 5.6 seconds on Browse. Under actual DevTools throttling, Home LCP changed from 5.5 to 4.6 seconds and total blocking time from 3,240 to 2,402 ms. The effect is real, but the simulated and actual-throttling magnitudes differ. The browser-visible logo was intentionally broken only in this measurement control; no product asset was changed.
- Search's page load event was about 0.2 seconds, but results appeared at 2.7–2.8 seconds. In a second-query browser run, `/api/search` began about 1.74 seconds after navigation and finished about 0.86 seconds later. Blocking the logo did not reduce result readiness (2.85 seconds). Initial search data is fetched only after client hydration; the client startup plus API request is the separate Search delay.
- Browse's intermittent `$RS`/`parentNode` console errors were observed in the development server before this isolated build. They did not reproduce in the correctly configured production browser on phone page 1 or desktop page 2, and a later development page-2 run had zero page errors. Treat them as a development-only or intermittent streaming symptom until a fresh hosted check confirms otherwise; no root cause in product code is established.
- The isolated build's JavaScript budget check passed: Home 217.8 KiB gzip against 220 KiB, Browse 218.3 KiB against 220 KiB, Reader 322.3 KiB against 350 KiB. Home and Browse have little budget headroom. The local production browser's unthrottled load events ranged from about 0.1 to 1.9 seconds, but Search results and Reader PDF were not ready at those events.

Next verification from this baseline: test an uploaded brand logo, rerun issue-detail Lighthouse and real-device checks, verify Reader with a permitted R2 origin or approved local proxy, then repeat on the hosted release. The local default-logo and initial-Search follow-up appears below. P6-09 and P6-07 remain open.

### Targeted local production follow-up, 31 October 2026

- The unchanged default logo now uses Next's image optimizer when the public brand route has no uploaded logo. The tested optimized response was 4,567 bytes instead of 4,411,949 bytes; the browser received an 874-byte variant. The route still serves uploaded logos as before. A HEAD request keeps the original fallback path so metadata checks do not ask the image optimizer to process a bodyless request.
- With the same simulated mobile Lighthouse setup, Home LCP fell from 28.8 to 7.1 seconds and Browse from 27.4 to 5.8 seconds. Transferred bytes fell from about 5.38 to 1.17 MB on Home and 5.28 to 1.07 MB on Browse. Under actual DevTools mobile throttling, Home LCP fell from 5.5 to 4.4 seconds and total blocking time from 3,240 to 1,864 ms. These are local comparisons, not hosted scores.
- Search now preloads its initial API request from the server-rendered page while retaining the existing client state and API flow. A browser run showed one `/api/search` request, starting 94–403 ms after navigation rather than about 1,740 ms. Initial visible results changed from about 2,735 ms to 2,220 ms on the first `mother` run, 1,518 ms warm, and 1,068 ms for `yoga` (previously 2,754 ms). Changing the query interactively still fetched successfully. Timing varies by cache and local environment.
- A proposed Search API query-sharing change showed no convincing gain: five-request median was 512 ms before and 467 ms after, with cold requests about 1.6 seconds both times. It was reverted. The performance regression script passed; the review test script could not run because its existing fixture lacks `site_settings`.
- For browser-only Reader verification, the authorized PDF response was fulfilled at the same origin in Playwright after the local R2 redirect. The desktop reader rendered a 44-page issue in about 2,930 ms and next-page navigation worked. At a 390 px phone viewport, first canvas appeared in about 3,501 ms at 343 px width, with Fit width already active. This does not prove direct localhost R2 CORS or hosted PDF delivery.
- The isolated production build, lint, TypeScript and performance regression script passed. The first JavaScript budget check passed at Home 219.9/220 KiB gzip, Browse 218.9/220, Reader 322.7/350. A final build after concurrent workspace changes still compiled, but Home measured 220.2/220 KiB and failed the exact budget gate; Browse measured 219.1/220 and Reader 322.9/350. The Home overage needs a focused bundle reduction before release. Hosted and device-specific acceptance remains open.

### Home bundle, uploaded logos and Reader scroll follow-up, 31 October 2026

- Splitting the small subscriber section with `next/dynamic` increased Home's measured initial bundle from 220.2 to 221.1 KiB gzip; this attempt was reverted. Splitting the 1,200-line bookshelf instead reduced it to 214.3 KiB, below the 220 KiB gate. The production browser still rendered the bookshelf without a page error. Its split chunk downloaded about 926 ms after navigation in one run, so this is a route-bundle reduction, not proof of deferred total JavaScript transfer. Browse and Reader measured 219.0/220 and 322.9/350 KiB.
- Future admin logo uploads now store a 128 px PNG for the logo slot; existing 512 px uploaded logos are reduced to 128 px by the public route. A synthetic resize of the unchanged default artwork produced a 27,618-byte 128 px PNG from the 4,411,949-byte source. This verifies the resize path's output size, not an actual uploaded R2 logo. The default fallback remains Next-optimized and HEAD/GET returned 200 locally.
- In an isolated production Chrome run using authorized same-origin test fulfillment, a 6,490,053-byte, 44-page PDF became scrollable in 3.61 seconds before Reader preload; the PDF request began at 1.44 seconds. With server-rendered PDF preload, the browser made one request, beginning at 1.05 seconds on the first run and 0.10 seconds warm; scrolling became available at 2.83 and 2.19 seconds respectively. On phone width, continuous scrolling became available at 2.36 seconds, with the next canvas rendered at 2.49 seconds. These absolute times vary with transport; the consistently earlier request is the useful observation.
- The tested PDF did not contain a linearization marker in its first kilobyte. The scroll-page queue was not the dominant wait in this run: after the PDF response, first and next canvases appeared within roughly 0.1–0.4 seconds. First-time phone readers now default to continuous scroll while retaining fit width; a production Chrome check showed 44 scroll slots, a 343 px canvas at 390 px viewport width, and one PDF request. A saved single-page preference remained active and also made one request.
- The final isolated production build, performance regression script and JavaScript budget gate passed. The PDF test fulfilled the authorized response at the same origin because the local R2 redirect fails browser CORS; hosted direct delivery, actual phone hardware, uploaded R2 logo delivery and post-change Lighthouse remain unverified.

### Release check, 31 October 2026

The five source commits through `52f9953` were pushed to GitHub `main` and reached the production Vercel alias. A clean isolated build passed with Home 214.0/220 KiB, Browse 218.7/220 KiB and Reader 322.5/350 KiB gzip. Live read-only checks returned 200 for core routes, Reader shell, brand assets and an uploaded hero image. The new same-origin Hero Studio preview CSP was visible. Hosted PDF rendering, phone hardware, authenticated Admin workflows and old R2 origin closure remain unverified. See [web release record](docs/handover/WEB_RELEASE_2026-10-31.md).

## Accessibility (static review, 2026-05-08)

| Severity | Issue | File:Line | Status |
|---|---|---|---|
| High | Search dropdown disables focus ring with inline `outline: none` / `boxShadow: none`, bypassing global `*:focus-visible`. Underline focus indicator works in current state but pattern is fragile. | [header-search-dropdown.tsx:65-67](apps/web/src/components/browse/header-search-dropdown.tsx#L65-L67) | **Fixed** 2026-05-08 — global focus rule moved into `@layer base` so utility classes can override; inline style replaced with `focus-visible:outline-none focus-visible:shadow-none` |
| Medium | Footer copyright at `text-gray-400` on white — borderline WCAG AA (~5.5:1, but visually thin). Bump to `text-gray-500` or darker. | [footer.tsx:125](apps/web/src/components/layout/footer.tsx#L125) | Open |
| Medium | Carousel zoom buttons in floating pill — verify screen-reader announces them clearly with the new placement. Existing `aria-label="Zoom in/out"` should suffice but worth a NVDA/VoiceOver pass. | [this-month-featured.tsx:993-1018](apps/web/src/components/home/this-month-featured.tsx#L993-L1018) | Open |
| Low | Continue-reading shelf uses `<img alt="">` (intentional — title text provides context). Verify SR users get sufficient context from sibling text. | [home-client.tsx:123-127](apps/web/src/app/home-client.tsx#L123-L127) | Open |
| Low | Admin login email/password inputs have `<label htmlFor>` ✓ but lack `autocomplete="email"` / `autocomplete="current-password"`. Helps password managers. | [admin/login/page.tsx:65-85](apps/web/src/app/admin/login/page.tsx#L65-L85) | Open |
| Low | Carousel keyboard ←/→ only works when focus is inside the section. Discoverable enough but consider auto-focusing the carousel region after first tab. | [this-month-featured.tsx:167-181](apps/web/src/components/home/this-month-featured.tsx#L167-L181) | Open |

### From Lighthouse baseline (2026-05-09)

| Severity | Issue | Route | Status |
|---|---|---|---|
| High | `/read/[id]` color-contrast failure — actual culprit was the `<span class="text-gray-400">/ {numPages}</span>` next to the page input (2.6:1 on white). | [read/[id]/page.tsx:1302](apps/web/src/app/read/[id]/page.tsx#L1302) | **Fixed** 2026-05-09 (uncommitted) — bumped to `text-gray-500` and added `aria-hidden` since the label is decorative; the page count is announced via the input's `aria-label`. |
| High | `/read/[id]` form element missing associated `<label>` — page-number input had no label / aria-label / placeholder. | [read/[id]/page.tsx:1294-1301](apps/web/src/app/read/[id]/page.tsx#L1294-L1301) | **Fixed** 2026-05-09 (uncommitted) — added `aria-label="Page number, of {n}"`. |
| High | `/read/[id]` document missing `<main>` landmark — all three return paths wrapped content in `<div>`. | [read/[id]/page.tsx](apps/web/src/app/read/[id]/page.tsx) | **Fixed** 2026-05-09 (uncommitted) — wrapped loading, not-found, and main render paths in `<main>` with descriptive `aria-label`. |

---

## SEO

| Severity | Issue | File:Line | Status |
|---|---|---|---|
| Medium | `/browse`, `/search`, `/bookmarks` lack Twitter Card images and JSON-LD structured data. Falls back to site-level OG. | [browse/layout.tsx](apps/web/src/app/browse/layout.tsx), [search/layout.tsx](apps/web/src/app/search/layout.tsx), [bookmarks/layout.tsx](apps/web/src/app/bookmarks/layout.tsx) | Open |
| Medium | Bookmarks page is `robots: { index: false }` — correct (user-specific) but worth confirming intent. | [bookmarks/layout.tsx:6](apps/web/src/app/bookmarks/layout.tsx#L6) | Open |
| Low | Sitemap lists `/issue/[id]` but not `/read/[id]`. Reader is where users spend time — adding it gives a stronger SEO signal for indexed content. | [sitemap.ts:34](apps/web/src/app/sitemap.ts#L34) | Open |
| Low | Every layout sets `alternates: { canonical: '/<route>' }` redundantly; could be centralized via `metadataBase`. | Multiple `layout.tsx` files | Open |

---

## Best practices / code quality

| Severity | Issue | File:Line | Status |
|---|---|---|---|
| Medium | Inline style override on search input (`outline: none`, `boxShadow: none`) — fragile pattern for replacing the global focus ring. Move to a Tailwind class with explicit replacement focus styling. | [header-search-dropdown.tsx:65-67](apps/web/src/components/browse/header-search-dropdown.tsx#L65-L67) | **Fixed** 2026-05-08 — same change as Accessibility/High above. |
| Low | Continue-reading shelf uses bare `<img>` instead of `next/image`. Tiny thumbnails, low impact, but inconsistent with rest of codebase. | [home-client.tsx:123-127](apps/web/src/app/home-client.tsx#L123-L127) | Open |
| Low | Issue card share/bookmark closures capture `issue` + `copied` state. Negligible memory at current scale; refactor only if hot-path. | [issue-card.tsx:109-140](apps/web/src/components/magazine/issue-card.tsx#L109-L140) | Open |

---

## Performance (Lighthouse baseline, 2026-05-09)

> Recurring opportunities across multiple routes. Tackle by impact (largest savings × routes affected) rather than per-route.

| Severity | Issue | Routes affected | Notes |
|---|---|---|---|
| High | `unused-javascript` — react-pdf + pdfjs worker shipped on first load even when the carousel isn't visible. ~600 ms savings on `/`, ~300 ms on `/read/[id]`, smaller on others. | `/`, `/read/[id]`, `/browse`, `/search` | **Fixed** 2026-05-09 (uncommitted) — `ThisMonthFeatured` is now `next/dynamic` with `ssr: false` and a min-height skeleton placeholder. `/` First Load JS dropped 285 → 272 kB; route bundle 18.5 → 14.2 kB. |
| High | LCP delayed across `/`, `/browse`, `/read/[id]` — Lighthouse scores 0 on LCP for all three. | `/`, `/browse`, `/read/[id]` | **Mostly fixed** 2026-05-09 (uncommitted). `/browse` LCP 25.1s → **3.3s** via `priority` on first-row covers + dropping opacity-gate on card animations. `/` LCP element rendered statically. `/read/[id]` LCP element switched from PDF canvas to a cover-JPEG overlay (with `fetchPriority="high"`), but the cover URL isn't known at SSR time so the image still has to wait for hydration — deeper win needs reader page to be SSR-fetched. |
| Medium | Render-blocking requests — common across all routes; likely Google Fonts CSS not subset/preloaded optimally. | All | Verify `next/font/google` config for Inter + Playfair Display includes `display: 'swap'` and only used weights. |
| Medium | `legacy-javascript-insight` on `/` — polyfills shipped that modern browsers don't need. | `/` | Likely a transitive dep; check `next.config.ts` for `swcMinify`/transpile config. |
| Low | `forced-reflow-insight` on `/browse` — layout-thrashing loop, probably the filter panel measurement on toggle. | `/browse` | Profile with DevTools Performance tab; batch reads/writes with `requestAnimationFrame`. |

---

## Reader parity (full reader vs homepage embedded reader, 2026-05-08)

> The two PDF readers have drifted. Document reflects findings from a code-level audit; consolidating helpers into `apps/web/src/lib/` would let one fix land in both places.

### Drifts that affect users
| Severity | Issue | Location | Status |
|---|---|---|---|
| Medium | Swipe sensitivity mismatch — Reader A: 60px / 500px-per-s. Reader B: 30px / 200px-per-s (hypersensitive, triggers on relaxed hand). | [read/[id]/page.tsx:1125-1130](apps/web/src/app/read/[id]/page.tsx#L1125-L1130) vs [this-month-featured.tsx:835](apps/web/src/components/home/this-month-featured.tsx#L835) | Open |
| Medium | Zoom step grid mismatch — Reader A: continuous 0.2 increments. Reader B: discrete `[0.75, 1, 1.25, 1.5, 1.75, 2]`. Switching readers carries non-snapped zoom levels. | Reader A `~line 818-819`, Reader B [this-month-featured.tsx:806](apps/web/src/components/home/this-month-featured.tsx#L806) | Open |
| Medium | Spread snap-to-odd-page only in Reader B — Reader A allows asymmetric (page 2-3) spreads. | [this-month-featured.tsx:763-766](apps/web/src/components/home/this-month-featured.tsx#L763-L766) | Open |

### Polish Reader B has that Reader A is missing
| Issue | Status |
|---|---|
| Cover JPEG shown while PDF loads (Reader A: blank/spinner ~2-4s) | **Partial** 2026-05-09 (uncommitted) — cover JPEG overlay + `firstPageRendered` state added to Reader A; LCP element switches from PDF canvas to cover image. Full polish (smooth fade-out, sized to page aspect) still pending. |
| Neighbour issue preloading (cover + PDF) | Open |
| Page-turn shimmer skeleton fallback | Open |
| Floating zoom pill (always visible vs. scrollable header zoom) | Open |

### Polish Reader A has that Reader B doesn't
| Issue | Status |
|---|---|
| Page scrubber (timeline jump-to-page) | Open / future |
| Pinch-to-zoom on touch | Open / future |
| Single-vs-continuous scroll mode toggle | Open / future |
| Fullscreen mode | Open / future |
| Resume-reading per issue | Open / future |
| Page-level sharing | Open / future |

### Code duplication worth extracting
- PDF.js worker setup (identical in both)
- `useMediaQuery` hook (inline in both, slightly different)
- Zoom step array + handlers
- Spread snap-to-odd helper
- Ease curve `[0.22, 1, 0.36, 1]` (different durations either side)
- DPR floor — `renderDpr` (Reader A) vs `hiDPI` (Reader B), same intent

---

## Security

| Severity | Issue | Detected | Status |
|---|---|---|---|

---

## Process notes

- Before fixing High-severity items, capture a Lighthouse baseline so we can prove the regression goes the right way.
- Include the issue's row from this doc in the commit message (e.g. `fix(a11y): restore focus ring on search dropdown — AUDIT.md "Accessibility / High"`).
- New findings: add to the relevant table with severity, file:line, and `Open` status. Don't reorder — append.
- When marking `Fixed`: add a `→ commit-sha` annotation in the Status column so the doc stays connected to history.

Historical database-provider security records were preserved privately during the 8 October 2026 handover cleanup; current database authorization is implemented in the application.
