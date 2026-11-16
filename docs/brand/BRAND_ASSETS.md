# AIM Archive — Brand Identity & Calligraphy Masthead Assets

This document details the source file analysis, restoration workflow, and complete asset catalog for the historic **All India Magazine** handwritten calligraphy masthead.

---

## 1. Source File Analysis (`All_India_Magazine.tif`)

The original uploaded file had the following specifications:
- **Format**: Uncompressed TIFF (converted from JPEG in Adobe Photoshop 27.11)
- **Dimensions**: 1824 × 873 px @ 600 DPI metadata
- **Color Mode**: 24-bit RGB (no alpha channel / opaque background)
- **Paper Background**: Aged ivory/cream background (`RGB [253, 242, 200]`, `~#FDF3C8`)
- **Ink Tone**: Natural dark charcoal/sepia ink (`RGB [77, 74, 63]`)
- **Defects & Limitations**:
  - **Incompatible Web Format**: Web browsers (Chrome, Safari, Firefox, Edge) cannot render TIFF directly.
  - **Opaque Background**: Could not sit cleanly over white web backgrounds, dark themes, or colored banners without an unsightly rectangular yellow box.
  - **Scanner Dust & Artifacts**: Found 121 tiny dust specks and border flecks from the scanner glass (<= 10 px) scattered across margins.
  - **Excess Margins**: Wide uncropped whitespace around the calligraphy.

---

## 2. Restoration & Optimization Procedure

A multi-stage Python image processing pipeline was executed:

1. **Defect & Dust Removal**:
   - Performed connected component segmentation across the entire image.
   - Isolated the 9 genuine calligraphy letterform clusters (`All`, `Indi`, `a` flourish, `m`, `a`, `g`, `azine`, `i`-dots) from 121 dust/scan noise specks.
2. **Sub-Pixel Alpha Extraction (Transparency)**:
   - Modeled physical ink transmittance ($T = \text{pixel} / \text{paper\_white}$) to compute a smooth continuous alpha channel with cubic smoothstep antialiasing.
   - Result: 100% transparent background with feathered, natural ink stroke antialiasing and zero color halos or yellow fringes.
3. **High-Precision Vector Tracing (SVG)**:
   - Generated resolution-independent Bézier/polygon paths with `fill-rule="evenodd"` correctly preserving inner counters (loops in `A`, `d`, `g`, `a`, `e`).
   - Enabled `fill="currentColor"` so the vector scales infinitely and dynamically inherits any CSS text color (e.g., `text-gray-900`, `text-white`, `text-amber-600`).
4. **Multi-Format & Multi-Scale Production Suite**:
   - Created lossless transparent PNGs, modern high-efficiency WebP, multi-scale responsive web header icons (32h, 48h, 64h, 128h, 256h), and restored archival TIFF/PNG masters.

---

## 3. Directory of Generated Files

### Public Web Assets (`apps/web/public/brand/`)

Accessible directly from the web app via `/brand/<filename>`:

| File | Format | Description / Use Case |
| :--- | :--- | :--- |
| `aim-masthead.svg` | SVG (51 KB) | **Recommended for Web**: Uses `fill="currentColor"`. Automatically adapts to light/dark mode and CSS color classes. |
| `aim-masthead-black.svg` | SVG (51 KB) | Hardcoded charcoal `#111827` vector for light backgrounds. |
| `aim-masthead-white.svg` | SVG (51 KB) | Hardcoded white `#FFFFFF` vector for dark headers and hero sections. |
| `aim-masthead-gold.svg` | SVG (51 KB) | Brand flame / amber gold `#D97706` vector. |
| `aim-masthead-ink.svg` | SVG (51 KB) | Historical authentic ink `#3F3A32` vector. |
| `aim-masthead-black.png` | PNG (73 KB) | Master transparent raster (1465 × 739 px) in deep charcoal. |
| `aim-masthead-white.png` | PNG (72 KB) | Master transparent raster (1465 × 739 px) in pure white. |
| `aim-masthead-gold.png` | PNG (73 KB) | Master transparent raster (1465 × 739 px) in brand amber/gold. |
| `aim-masthead-ink.png` | PNG (73 KB) | Master transparent raster (1465 × 739 px) in original ink tone. |
| `aim-masthead-*.webp` | WebP (33 KB) | Next-gen web format with lossless compression & alpha channel. |
| `aim-masthead-vintage-cleaned.png` | PNG (260 KB) | Restored high-res scan with clean cream paper background and all dust removed. |

#### Responsive Web Header Sizes (`apps/web/public/brand/sizes/`)
Pre-rendered transparent PNGs optimized for specific UI navbar heights:
- `aim-masthead-black-32h.png` / `aim-masthead-white-32h.png` (32px compact navbar)
- `aim-masthead-black-48h.png` / `aim-masthead-white-48h.png` (48px standard header)
- `aim-masthead-black-64h.png` / `aim-masthead-white-64h.png` (64px retina / high-res header)
- `aim-masthead-black-128h.png` / `aim-masthead-white-128h.png` (128px hero / modal display)
- `aim-masthead-black-256h.png` / `aim-masthead-white-256h.png` (256px large splash)

### Master Archival Repository (`assets/brand/`)

For print production, graphic design, and long-term source preservation:
- `original/All_India_Magazine_raw.tif`: Pristine, untouched original user upload.
- `aim-masthead-vintage-cleaned.tif`: 600 DPI lossless master TIFF with dust/scratch restoration.
- All SVGs, PNGs, and WebPs mirrors.

---

## 4. Example Code Snippets

### React / Next.js Component (SVG with dynamic theme color)

```tsx
import Image from 'next/image';

export function MastheadLogo({ className = 'h-10 text-gray-900 dark:text-white' }: { className?: string }) {
  return (
    <div className={className}>
      <img
        src="/brand/aim-masthead.svg"
        alt="All India Magazine"
        className="h-full w-auto object-contain"
      />
    </div>
  );
}
```

### Static HTML / Markdown
```html
<!-- Dark text on light background -->
<img src="/brand/aim-masthead-black.svg" alt="All India Magazine" width="300" />

<!-- White text on dark banner -->
<div style="background-color: #0F172A; padding: 20px;">
  <img src="/brand/aim-masthead-white.svg" alt="All India Magazine" width="300" />
</div>
```
