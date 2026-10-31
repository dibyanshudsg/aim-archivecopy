# Spec: Artwork-Matched Hero Theme

Module id: `hero-theme`

## Objective

Generate a coherent, accessible hero color system from each uploaded scenic artwork. The result should feel native to the image while preserving predictable hierarchy and WCAG-readable text/buttons. Admin may preview and override the bounded theme without entering arbitrary CSS.

## Theme Contract

Each desktop and phone artwork receives its own validated token set:

```ts
interface HeroTheme {
  mode: 'auto' | 'light' | 'dark';
  text: string;
  mutedText: string;
  accent: string;
  primaryBackground: string;
  primaryForeground: string;
  secondaryBackground: string;
  secondaryForeground: string;
  secondaryBorder: string;
  scrim: string;
  scrimOpacity: number;
}
```

The renderer consumes tokens only through CSS custom properties. It never accepts arbitrary CSS, gradients, class names or markup from Admin input.

## Automatic Analysis

1. Decode the normalized uploaded image server-side.
2. Analyze the content/text region separately from the book/platform region. Desktop samples the right-side content zone; phone sampling uses the specified mobile composition zone.
3. Calculate representative luminance and a bounded dominant color palette.
4. Select light or dark text by measured contrast against the sampled region plus proposed scrim.
5. Derive accent and button colors from the dominant palette, clamped to approved saturation/lightness ranges.
6. Increase local scrim opacity only as much as required to meet contrast.
7. Reject any generated or overridden token set that cannot meet contrast after the maximum allowed scrim.

## Accessibility Rules

- Body and button text: minimum 4.5:1 contrast.
- Large display heading: minimum 3:1 contrast.
- Focus indicator against adjacent colors: minimum 3:1.
- Primary button foreground/background: minimum 4.5:1.
- Automatic results are deterministic for the same asset hash.
- Theme generation must not animate or analyze pixels in the browser.

## Admin Overrides

Admin may select:

- `Auto` — use generated theme.
- `Prefer dark text` — recompute within the dark-text constraint.
- `Prefer light text` — recompute within the light-text constraint.
- Accent color override — accepted only after button/focus contrast validation.
- Reset — return to the deterministic generated theme.

Admin cannot enter raw CSS or bypass contrast validation.

## Testing Strategy

- Golden fixtures cover bright, dark, mixed and low-contrast scenic images.
- Token generation is stable for a fixed SHA-256.
- Every generated and accepted override passes contrast assertions.
- Desktop and phone themes are generated independently.
- Theme calculation runs only during upload/replacement, not during public requests or scrolling.

## Success Criteria

- Uploaded artwork receives a deterministic matching theme before promotion.
- Hero text and controls meet contrast requirements on both viewport assets.
- Admin preview renders the exact stored token set.
- Public hero rendering requires no runtime pixel analysis.
- Theme tokens add no scroll-time filters, backdrop blur or continuous color computation.

## Boundaries

- Always constrain generated colors to the existing design system's visual character.
- Ask first before adding a third-party color-analysis service or dependency.
- Never accept arbitrary CSS or permit an override that fails contrast.
