# Spec: Hero Administration and Future Preview

Module id: `hero-admin`

## Objective

Provide a dedicated Admin page to prepare monthly heroes safely before publication. Authorized Admins can choose an issue, upload/replace desktop and phone scenic artwork, review readiness, inspect the automatic theme, apply bounded theme preferences, and preview the exact future public hero without releasing it.

## Admin Page

Route: `/admin/hero`

The page provides:

- Magazine and issue-month selection, including future issues already present in the catalogue.
- Existing issue cover/PDF/publication state summary.
- Desktop/tablet scenic upload (`1672×941`) and phone scenic upload (`941×1672`).
- Independent replace/remove controls with current asset dimensions and verification state.
- Readiness checklist for issue, PDF, issue cover, desktop artwork and phone artwork.
- Automatic desktop and phone theme preview with Auto/Prefer dark/Prefer light and validated accent override.
- Exact desktop/tablet and phone preview frames.
- Preview-as-of date/time in Asia/Kolkata, defaulting to the issue month's first day.
- Clear labels for `future-hidden`, `current-month-readable`, `archive-readable` and `embargo-locked` states.

## Background Generation Prompt

The page includes a persistent, editable **Background generation prompt** section:

- The supplied `AIM Archive — Master Hero Background Generation Prompt` is the version-controlled default template.
- Admins may edit and save the active template in a large plain-text editor.
- The saved record includes template text, revision number, updater and update time.
- `Copy prompt` copies the complete current text for use in an external image-generation tool.
- `Reset to default` restores the shipped master template only after explicit confirmation; the previous saved revision remains auditable.
- Unsaved edits are visibly marked and protected by a leave-page warning.
- The selected issue's magazine name, month and year are shown beside the editor as reference, but are not silently injected into or removed from the saved master text.
- The selected issue cover is shown beside the prompt so the Admin can attach the correct cover when using the prompt externally.
- Prompt management does not call an image-generation provider, store provider credentials or upload generated output automatically.

The active template is global to the hero workflow rather than duplicated per issue. Generated scenic artwork remains issue-specific and must still pass the normal desktop/phone upload validation.

## Preview Rules

- Preview is Admin-authenticated and never changes public visibility.
- Future issue assets and metadata are available only through privileged Admin reads.
- Preview uses the same scheduling, access, theme, layout and navigation functions as the public hero.
- Read/preview/download actions render exactly as they will at the selected effective time: enabled only for current issue month or five-year-readable archive issues.
- Admin may navigate the prepared sequence in preview, including single-magazine month slides and All-mode magazine scale/month slide transitions.
- Preview supports desktop/tablet and phone artwork; tablet uses desktop artwork.

## Permissions and Audit

- Read-only catalogue users may inspect readiness and preview but cannot mutate assets or theme choices.
- Catalogue-publication permission is required for upload, replace, remove and theme override.
- Catalogue-publication permission is required to save or reset the generation prompt.
- Audit events record issue id, slot, action, actor and asset hash/theme mode without signed URLs or credentials. Prompt audit events record revision and actor, not the full prompt body.

## Testing Strategy

- Future issues never appear through public APIs before release but do appear to authorized Admin preview.
- Preview-as-of boundary tests cover one second before/at India-time month release.
- Preview and public renderer share the same serialized presentation contract.
- Permission, upload failure, replacement rollback and theme validation states are exercised.
- Prompt load, save, revision conflict, reset, permission and unsaved-change behavior are exercised.
- Desktop and phone preview screenshots use representative fixtures.

## Success Criteria

- Admin can fully prepare and verify a future hero without publishing it early.
- Preview exactly predicts public layout, theme, access state and sequence for the selected India-time instant.
- No preview request exposes private PDF URLs, raw R2 keys or future content to unauthenticated users.
- Readiness and validation errors name the missing or invalid item and recovery action.
- The saved prompt survives reload, can be copied exactly, and can be restored to the shipped default.

## Boundaries

- Always reuse public scheduling/layout contracts rather than creating a separate preview-only interpretation.
- Ask first before allowing manual publication dates outside issue month/year.
- Never let preview state mutate public visibility or bypass PDF authorization.
