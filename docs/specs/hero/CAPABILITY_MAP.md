# Capability Map: Monthly Hero Publishing

Approved direction: 31 October 2026.

| Module id | Responsibility | Depends on |
|---|---|---|
| `hero-content` | Link each issue to desktop/mobile scenic artwork and expose a stable readiness contract | — |
| `hero-theme` | Derive accessible artwork-matched color tokens with bounded Admin overrides | `hero-content` |
| `hero-scheduling` | Apply India-time month release and current-month/five-year access policy | `hero-content` |
| `hero-admin` | Upload, preview, replace, validate and audit monthly hero artwork and future states | `hero-content`, `hero-theme`, `hero-scheduling` |
| `hero-navigation` | Navigate months within one magazine and month/magazine sequence under All | `hero-scheduling`, `hero-theme` |
| `hero-motion` | Perform direction-aware slide and scale transitions without scroll or interaction jank | `hero-navigation` |

Build order: `hero-content` → (`hero-theme`, `hero-scheduling`) → `hero-admin` → `hero-navigation` → `hero-motion`.

## Settled product rules

- Each issue uses its existing issue cover in the interactive 3D magazine.
- Admin uploads two scenic hero backgrounds per issue: desktop/tablet and phone.
- One selected magazine navigates month-to-month within that magazine.
- All alternates magazines within the same month using a scale transition, then moves between months using a slide transition. Reverse navigation reverses this sequence.
- The current India-time issue month is readable as the explicit embargo exception.
- Other issues newer than five years may show cover, scenic artwork and metadata but remain locked for reading, preview and download.
- A future issue remains absent from every public hero state until 00:00 Asia/Kolkata on the first day of its issue month, even when all assets are ready.
- Desktop scenic artwork also serves tablet viewports.
- Artwork-matched colors are generated automatically at upload, must meet contrast requirements, and may be overridden by an authorized Admin.
- Admin can preview any ready future hero as desktop/tablet or phone and at its effective India-time month state without making it public.
