# Web release — 31 October 2026

## Identity and scope

- Production alias: `https://aim-archive.vercel.app`.
- Source: GitHub `main` at `52f9953`; changes from `3348c44` are five scoped commits: Hero Studio and monthly scenes, public catalogue and asset delivery, Reader loading, Admin/server latency, migration-test maintenance.
- Delivery: linked GitHub/Vercel integration after the main push. The exact Vercel deployment ID could not be read because the local CLI has no authenticated session. The live CSP changed from `frame-src 'none'` to `frame-src 'self'`, and the new public hero artwork route returned the uploaded image, establishing that the new build reached the alias.
- The source migration `00012_hero_presentations.sql` was already applied to the configured Turso target before deployment. Read-only migration status showed zero pending migrations and schema objects present. No migration command or other production write was run during this release.

## Preservation and gates

- Fresh private Turso backup: `D:\AIM (Project Directory)\P1-02_turso_2026-10-31_221537_IST`. Its `verification.json` reports SQLite integrity passed, zero foreign-key violations and 39 tables. This is a local database backup; it is not an independent offsite copy or an R2 backup.
- Isolated web production build passed. Route JavaScript budgets passed: Home 214.0/220 KiB, Browse 218.7/220 KiB, Reader 322.5/350 KiB gzip.
- Root lint, Hero content and schedule tests, ten PDF-security suites, rate-limit, indexing, search-extraction, environment, migration, review, performance and release-exclusion checks passed. The secret audit found no new exact secret match or current Git-history finding; eight older credential mentions in tracked documentation require their standing historical review.
- Local production server on port 3001 returned HTTP 200 for Home, Browse, Search, Admin login, catalogue API and brand logo before deployment. Local Node was 22.16.0, below the documented 22.23.3 pin; build/tests passed, but this is not pinned-runtime proof.

## Hosted read-only checks

On 31 October after the source push, the production alias returned HTTP 200 for Home, Browse, Search, Bookmarks, Admin login, `/api/issues`, logo, favicon and a current issue Reader shell. The uploaded Agnishikha October 2026 desktop artwork returned HTTP 200, `image/png`, 2,135,974 bytes through `/api/hero-assets/.../desktop`. The live CSP permits same-origin frames for Admin preview while retaining `frame-ancestors 'self'`.

These checks prove deployment and route reachability. They do not prove a full PDF render, phone hardware behavior, authenticated Admin mutations, the future-month rollover or editorial workflows.

## Open risk and rollback

The former public R2 origin can still bypass the application's five-year PDF rule. Society R2 access and origin closure remain the highest security task; this release did not change that origin. Full production security and browser acceptance, worker dispatch, asset-delta verification, independent restore and monitoring remain open in `TO DO LIST.md`.

If the web build regresses, restore the prior known Vercel deployment `dpl_6qBbGKAZ54qoa7eykewmZ8a2fcWe` through the Vercel project dashboard, then verify core routes and PDF access. For source rollback, revert the five commits from `c9f8a8a` through `52f9953` on `main` and push the revert; do not force-push shared history. Migration 00012 is additive and already live, so leave its tables in place during a web rollback. Reassess only after a fresh backup before any schema removal.
