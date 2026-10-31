export const DEFAULT_HERO_BACKGROUND_PROMPT = `# AIM Archive — Master Hero Background Generation Prompt

## Objective

Create a premium, high-quality cinematic background image for the **AIM Archive website's Featured Magazine Hero Section**, inspired by the attached magazine issue cover.

**The background must be uniquely designed for the specific issue, rather than following a fixed scenery, environment, or visual theme.**

The final image will be used behind real website interface elements and a separate, interactive 3D magazine.

## 1. Study the Magazine Cover

Carefully examine the attached issue cover before developing the design.

Identify and interpret:

- The issue's central theme and underlying meaning.
- Its principal colours, visual elements, and artistic style.
- Its symbolic imagery, natural elements, and overall atmosphere.
- The emotional and spiritual qualities conveyed by its design.
- Any visual concepts that could be expanded into an immersive environment.

If the issue's title or subject suggests a meaningful artistic direction, incorporate that inspiration thoughtfully.

**Do not simply enlarge, reproduce, or blur the cover into a background. Instead, imagine a beautiful three-dimensional world inspired by the cover.**

## 2. Create a Unique Visual Environment

Design an original scene that naturally expresses the identity of the magazine issue.

You have full creative freedom to choose:

- Indoor or outdoor environments.
- Natural landscapes, gardens, forests, mountains, or open skies.
- Classical studies, libraries, architectural settings, or manuscript-inspired environments.
- Abstract, symbolic, artistic, or spiritually evocative settings.
- Appropriate lighting, colours, materials, textures, and atmosphere.

Do not automatically include water, lotus flowers, mountains, stone structures, or any other elements from previous AIM Archive backgrounds.

**Every visual element must belong naturally to the world created for this particular issue.**

Aim for a sophisticated, peaceful, meaningful, and visually captivating composition appropriate to an archive dedicated to Sri Aurobindo and The Mother.

## 3. Essential Requirement — A Matching Magazine Display Platform

Every background must feature a clearly visible, aesthetically integrated **display platform or supporting surface** on which the website will subsequently place an interactive 3D magazine.

The platform is mandatory, but its design is entirely flexible.

Choose its material, shape, structure, positioning, and character according to the environment.

Examples include:

- A natural grassy rise in a rolling meadow.
- An elegant wooden desk in a classical study.
- A carved marble or sandstone pedestal.
- A sculptural display surface in an abstract environment.
- A moss-covered natural ledge in a forest.
- A refined manuscript-inspired reading stand.
- A softly illuminated architectural plinth.
- Any other convincing surface that genuinely complements the issue's visual world.

These are examples, not prescribed designs.

### Platform requirements

- Must appear naturally integrated into the scene, never artificially inserted.
- Must have a sufficiently flat, stable, and unobstructed surface for an upright magazine.
- Must be large enough to support a portrait-oriented magazine approximately 1.4 times taller than it is wide.
- Must allow the separate magazine to stand upright with believable contact, scale, perspective, and shadow.
- Must remain completely empty.
- Should generally be positioned on the left or lower-left portion of the composition, within the future magazine display area.
- Must not be obscured by foreground decorations.

**The platform can change completely between issues. Its functional purpose—not its appearance—is what must remain consistent.**

### Standardised magazine placement zone

The website positions the separate 3D magazine using an artwork-relative anchor. Keep the platform's intended contact point consistent so the magazine appears to sit on it across different viewport sizes.

- **Landscape desktop/tablet artwork:** place the centre of the empty magazine position at approximately **23.5% of the image width**. The platform contact baseline should be approximately **77.5% from the top of the image**.
- **Portrait phone artwork:** place the centre of the empty magazine position at approximately **50% of the image width**. The platform contact baseline should be approximately **70% from the top of the image**.
- Keep the entire area above that baseline clear for a portrait magazine. Do not place branches, furniture, lettering, ornaments, or strong highlights across the magazine placement zone.
- The visible platform surface must cross the baseline naturally and provide enough depth for a contact shadow beneath the magazine.
- Preserve important scenery outside likely responsive crop edges. The platform contact point and clear magazine zone take priority over decorative foreground elements.

These coordinates describe the empty placement zone only. Do not draw guides, markers, a magazine, or a shadow into the generated artwork.

## 4. Composition for Website Integration

The image will be used as a responsive, full-width website hero background.

Design the composition accordingly:

**Left portion (approximately 40–45%):**
- The environment's main visual interest and display platform.
- Sufficient clearance above the platform for the complete 3D magazine.
- Believable depth and natural lighting around the placement area.

**Right portion (approximately 55–60%):**
- Visually quieter space intended for the issue heading, description, reading controls, and metadata.
- Strong readability potential through restrained visual details, gentle gradients, or naturally uncluttered scenery.
- No distracting objects or harsh contrast directly behind the future text.

Maintain a harmonious visual relationship between both areas.

Avoid placing important scene details too close to the edges, as responsive cropping may occur.

## 5. Visual Quality and Art Direction

Create an exceptionally polished, high-end visual suitable for a premium digital publication archive.

Prioritise:

- Beautiful composition and strong artistic direction.
- Rich yet natural materials and textures.
- Convincing environmental depth.
- Cinematic but restrained lighting.
- Balanced colours inspired by the issue.
- Subtle atmosphere and visual storytelling.
- Calmness, harmony, and elegance without unnecessary ornamentation.

Photorealism is preferred when appropriate, but illustration, painterly realism, or another sophisticated visual approach may be used if it better suits the particular cover.

Avoid generic stock-image aesthetics and repetitive compositions.

## 6. Critical Restrictions

The generated image must contain:

- NO magazine or book.
- NO text, lettering, typography, or quotations.
- NO navigation bars, buttons, icons, menus, or interface elements.
- NO mock website or browser window.
- NO decorative frame or artificial border.
- NO human figures unless explicitly requested.
- NO objects occupying the magazine's intended placement area.
- NO obligatory reuse of scenery or materials from previous issues.

The image must be a **clean, complete environment with an empty, functional display platform**.

## 7. Output Specifications

- For desktop/tablet: 16:9 landscape; target resolution 3840 by 2160 (4K), if supported.
- For phone: 9:16 portrait; target resolution 2160 by 3840 (4K), if supported.
- Generate the requested device version as one clean image per run, preserving the corresponding placement coordinates above.
- High-quality detail suitable for large desktop displays.
- Suitable for responsive website background usage.
- Visually finished, with no additional graphical overlays.

## 8. Final Creative Instruction

Treat every new magazine issue as an opportunity to create a distinct visual world.

The attached cover should inspire the environment's mood, symbolism, colours, materials, and artistic direction.

Select the most appropriate setting and design a matching platform as an organic part of that environment.

**Do not repeat the previous background merely because it was successful.**

The consistent identity of AIM Archive should come from the elegance, quality, tranquillity, and thoughtful visual storytelling of the designs—not from reusing identical scenery.

### Final deliverable

Generate **ONLY ONE clean, high-quality hero background image per requested device version** featuring an original, issue-inspired environment and its empty display platform.

No magazine. No text. No UI.

The result must be ready for AIM Archive to overlay its real, interactive 3D magazine and website interface.`;

export const HERO_PROMPT_MAX_LENGTH = 24_000;
