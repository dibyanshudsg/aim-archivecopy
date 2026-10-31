# Spec: Hero Content Model

Module id: `hero-content`

## Objective

Create the persistent content contract for the monthly public hero. Each catalogue issue can have one desktop/tablet scenic background and one phone scenic background. The existing issue cover remains the 3D magazine cover. Downstream scheduling, Admin and navigation code must consume this contract instead of inferring readiness from filenames or local assets.

Success means an issue's hero assets have stable database identity, safe R2 storage, deterministic readiness, replacement history through Admin audit, and no effect on PDF access policy.

## Assumptions

1. One issue has at most one active desktop scenic asset and one active phone scenic asset.
2. Hero artwork belongs to the issue, not only to a month. This supports different artwork for two magazines in the same month while allowing Admin to upload the same image twice when desired.
3. Tablet uses the desktop asset.
4. PNG, JPEG and WebP inputs are accepted. The server validates actual bytes, dimensions and decoded image content before promotion.
5. Readiness is derived. It is not a manually editable boolean.
6. An issue is hero-ready only when the issue record, PDF, issue cover, desktop scenic asset and phone scenic asset are all present and valid.
7. Readiness does not make a future issue public and does not make an embargoed issue readable. Those rules belong to `hero-scheduling`.
8. Asset replacement promotes the new object before deleting or retiring the previous object, so a failed upload cannot break the current hero.

## Representative Fixtures

The owner supplied two real desktop scenic assets for specification and transition testing:

| Issue artwork | Dimensions | Aspect ratio | File size |
|---|---:|---:|---:|
| `AIM Oct 2026.png` | 1672×941 | 1.7768:1 | 1,946,888 bytes |
| `AIM Nov 2021.png` | 1672×941 | 1.7768:1 | 2,277,283 bytes |

Both established `1672×941` as the canonical desktop/tablet scenic size. The October artwork has a public fallback copy at `apps/web/public/aim-oct-2026-hero.png`; the source files at the repository root were removed after the Admin-managed artwork workflow was added. Production code does not depend on repository-root filenames.

## Tech Stack

- Next.js 15.5.28, React 19 and TypeScript.
- Turso/libSQL through the existing repository layer.
- Cloudflare R2 through the existing authenticated S3 client.
- Existing Canvas/native image decoding path for validation and normalization where needed.
- Zod for API input validation.

## Commands

Run from `D:\AIM Project\apps\web` unless noted:

```powershell
pnpm.cmd exec tsc --noEmit
pnpm.cmd lint
pnpm.cmd build
```

Run focused regressions from the repository root:

```powershell
pnpm.cmd test:pdf-security
node scripts/test-hero-schedule.cjs
```

Migration work must use the explicit-target process in `docs/handover/P4-07_MIGRATION_PROCEDURE.md`. A bare migration command is forbidden.

## Project Structure

```text
packages/turso/migrations/             ordered additive schema migration
apps/web/src/lib/db/                   hero content repository
apps/web/src/lib/hero-content.ts       domain types, readiness and asset rules
apps/web/src/lib/r2-client.ts          existing authenticated object operations
apps/web/src/app/api/admin/hero-assets Admin mutation/read endpoints
apps/web/src/app/api/hero-assets/      public image delivery by issue and viewport
scripts/                               isolated regression coverage
docs/specs/hero/                       approved capability specifications
```

## Data Contract

Add an additive table dedicated to issue hero presentation assets. Proposed logical fields:

```ts
interface HeroPresentation {
  issueId: string;
  desktopKey: string | null;
  desktopWidth: number | null;
  desktopHeight: number | null;
  desktopSha256: string | null;
  mobileKey: string | null;
  mobileWidth: number | null;
  mobileHeight: number | null;
  mobileSha256: string | null;
  desktopThemeJson: string | null;
  mobileThemeJson: string | null;
  updatedBy: string;
  updatedAt: string;
}

function isHeroReady(issue: Issue, presentation: HeroPresentation | null) {
  return Boolean(
    issue.pdf_url &&
    issue.cover_image_url &&
    presentation?.desktopKey &&
    presentation.mobileKey,
  );
}
```

Database requirements:

- `issue_id` is the primary key and a foreign key to `issues(id)` with cascade deletion.
- Store canonical private R2 object keys, not public URLs.
- Persist width, height and SHA-256 for both assets.
- Persist a validated generated/overridden theme payload per viewport asset; theme rules belong to `hero-theme`.
- Persist updater and timestamp for operational evidence.
- Do not store publication, embargo or current-month decisions in this table.
- Do not overload `site_settings` or the existing `hero_issue_controls` JSON with per-issue asset inventory.

R2 key contract:

```text
hero/{issue-id}/desktop/{uuid}.{normalized-extension}
hero/{issue-id}/mobile/{uuid}.{normalized-extension}
```

Old keys are deleted only after database promotion succeeds. Failed promotion retains the last verified pair.

## Code Style

Use explicit domain types and pure readiness functions. Repository methods accept canonical ids/keys, use parameterized queries, and own transaction boundaries.

```ts
const presentation = await getHeroPresentation(issueId);
const readiness = evaluateHeroReadiness(issue, presentation);

if (!readiness.ready) {
  return { ready: false, missing: readiness.missing };
}
```

Do not duplicate release or embargo calculations in upload handlers.

## Testing Strategy

### Unit/domain

- Readiness reports every missing dependency deterministically.
- Desktop and mobile asset identities cannot be swapped.
- Desktop and mobile theme payloads remain paired with their corresponding asset hashes.
- Invalid R2 keys, unsupported formats and hash/dimension mismatches are rejected.
- Existing valid asset pairs remain active after a failed replacement.

### Repository/migration

- Fresh schema and populated-schema migration both pass.
- Foreign-key behavior and parameterized CRUD are verified against isolated libSQL.
- Concurrent replacement cannot produce a mixed desktop/mobile record.

### API/storage

- Unauthenticated and insufficient-permission Admin requests are rejected.
- MIME declaration, magic bytes, decode, size and dimensions are checked.
- Public delivery accepts only stored canonical keys and emits safe cache/type headers.
- Deleting an issue removes its presentation record; object cleanup remains explicit and audited.

### Regression

- Existing issue cover/PDF replacement still preserves hero linkage by issue id.
- PDF security and future-issue denial tests remain green.
- No raw R2 URL or arbitrary object key reaches the browser.

## Boundaries

### Always

- Use a new additive migration and repository-layer parameterized queries.
- Validate actual image bytes and decoded dimensions server-side.
- Upload a replacement first, promote atomically, then remove the superseded object.
- Require an Admin permission appropriate to catalogue publication.
- Audit upload, replacement and removal without logging credentials or signed URLs.
- Keep issue cover identity separate from scenic background identity.

### Ask first

- Exact required aspect ratios, minimum dimensions and upload size limits.
- Any destructive cleanup of already uploaded hero objects.
- Any new third-party image transformation/CDN service.
- Any change to R2 ownership, bucket policy or public-origin configuration.

### Never

- Never infer readiness only from filenames.
- Never store image bodies in Turso.
- Never accept arbitrary public URLs or client-selected R2 keys.
- Never let asset readiness bypass future-month or five-year access policy.
- Never expose private R2 credentials, object inventory or signed mutation URLs publicly.
- Never replace a working asset record before the new object passes validation.

## Success Criteria

- Every issue can persist zero or one verified desktop/tablet asset and zero or one verified phone asset.
- Readiness identifies missing PDF, issue cover, desktop artwork or phone artwork separately.
- Replacing either asset cannot temporarily break the other asset or the prior complete presentation.
- Public consumers receive stable application delivery URLs, never raw storage URLs.
- Issue deletion, asset replacement and audit behavior are deterministic and tested.
- A future or embargoed issue gains no additional PDF access from hero asset presence.
- TypeScript, lint, build, migration regression, hero schedule and PDF security gates pass.

## Open Questions

1. Confirm `1672×941` as the canonical desktop/tablet upload size. Both supplied fixtures use it.
2. Confirm the required phone aspect ratio and minimum pixel dimensions. Proposed default: 9:16, minimum 1080×1920.
3. Confirm the maximum upload size per scenic image. Proposed default: 8 MiB before server normalization.
