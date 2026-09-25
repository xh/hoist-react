# Styles

> **Status: DRAFT** — This document is awaiting review by an XH developer.
> See [docs-roadmap.md](../docs/planning/docs-roadmap.md) for the review workflow.

## Overview

The `/styles/` package defines Hoist's visual foundation: a comprehensive system of CSS custom
properties (CSS vars) that control colors, spacing, typography, borders, and component-specific
appearance across the entire framework. Combined with BEM-style class naming conventions and
co-located SCSS files per component, this system enables consistent theming — including built-in
dark mode — while giving applications a clear, well-scoped mechanism for customization.

Hoist uses SCSS (Sass) as its stylesheet preprocessor, but deliberately limits its use of
SCSS-specific features. The heavy lifting of theming and customization is done through CSS custom
properties, not SCSS variables. SCSS serves primarily as a convenience for nesting, `&`-based BEM
selectors, and a small number of color functions used to generate default values at compile time.

## Key Files

| File | Purpose |
|------|---------|
| `vars.scss` | Defines all `--xh-*` CSS custom properties on `body`, with light/dark/mobile variants |
| `XH.scss` | Global stylesheet — imports vars, sets up base `body.xh-app` styles, defines utility classes |
| `helpers.scss` | Small SCSS utility functions (inline SVG encoding) used internally |

## CSS Custom Properties

### Overriding `--xh-*` Variables

All Hoist CSS custom properties use the `--xh-` prefix. Applications customize Hoist's appearance
by overriding these variables directly on `body.xh-app`:

```scss
body.xh-app {
    --xh-border-color: #cccccc;
    --xh-grid-group-bg: hsl(206, 20%, 65%);
    --xh-text-color-muted: #5d5d5d;
    --xh-toolbar-compact-min-size: 32px;
}
```

Component SCSS files reference these variables for all themeable properties. Hoist declares every
default on `body` with the specificity of a bare `body` selector - its dark-theme and mobile
variants are wrapped in `:where()` (e.g. `body:where(.xh-dark)`), which adds no specificity. An app
override on `body.xh-app` therefore beats every framework default, in light and dark themes and on
desktop and mobile alike, without relying on stylesheet order.

Where to set overrides:

* **`body.xh-app`** - the recommended selector for app-wide overrides.
* **Not bare `body`** - an app declaration there ties with Hoist's and wins only by source order.
* **Not `:root` or `html`** - Hoist's own declarations on `body` take precedence over any value
  `body` would otherwise inherit, so overrides set on an ancestor of `body` have no effect.

For values that differ per theme, nest an `&.xh-dark` block (see
[App-Level Dark Overrides](#app-level-dark-overrides) below). Nest `&.xh-mobile` the same way for
mobile-only values.

#### Base vs. Derived Variables

Many variables derive from others - `--xh-spacing-half` from `--xh-spacing`, `--xh-grid-header-bg`
from `--xh-grid-bg`, `--xh-intent-primary` from the `--xh-intent-primary-*` HSL components, and so
on. CSS resolves a `var()` reference on the element where the referencing variable is declared, and
descendants inherit the *resolved* value. Because Hoist declares all of these on `body`:

* **Overriding a base variable on `body.xh-app` flows through to everything derived from it.**
  Setting `--xh-spacing: 8px` updates `--xh-spacing-half`, `--xh-spacing-double`, and every
  component spacing built on them.
* **Overriding a base variable on a descendant reaches only CSS that reads it directly.** Setting
  `--xh-spacing: 4px` on `.my-panel` changes padding that reads `var(--xh-spacing)` within that
  subtree, but `--xh-spacing-half` there is still the value computed on `body`.

#### Scoped Overrides

Setting a variable on a more specific selector limits the change to that subtree. Given the above,
set the variable the components actually read, not one upstream of it:

```scss
// Works for grid rows, which read `--xh-grid-bg` directly. Headers read `--xh-grid-header-bg`,
// derived from `--xh-grid-bg` on `body` - set it as well if headers should follow.
.my-special-panel {
    --xh-grid-bg: #fafafa;
    --xh-grid-header-bg: #fafafa;
}

// Only partly works - CSS reading `--xh-spacing` follows, but `--xh-spacing-half`,
// `--xh-spacing-double`, and variables built from them keep the values computed on `body`.
.my-dense-panel {
    --xh-spacing: 4px;
}
```

Derivation can run several levels deep - `--xh-form-field-margin`, for example, is built from
`--xh-spacing` on `body`, so a scoped `--xh-spacing` leaves form field margins unchanged. Scoped
overrides are best suited to leaf variables such as colors; for broad changes like density,
override the base variable app-wide on `body.xh-app` or use a component's built-in sizing options
(e.g. grid `sizingMode`).

When unsure which variable a component reads, check its SCSS or search `vars.scss` for the
variable's name to see what references it.

### Naming Conventions

Every Hoist variable follows the same grammar, so a name can usually be predicted from what it
styles:

```
--xh-{component}-{element}-{state}-{property}
```

Only `--xh-` and `{property}` are always present. Global tokens drop the component
(`--xh-border-color`, `--xh-font-size`); component tokens name the component and, where needed, the
element and state:

| Name | Component | Element | State | Property |
|------|-----------|---------|-------|----------|
| `--xh-grid-bg` | grid | | | bg |
| `--xh-grid-header-font-size` | grid | header | | font-size |
| `--xh-grid-row-hover-bg` | grid | row | hover | bg |
| `--xh-button-active-text-color` | button | | active | text-color |
| `--xh-form-field-focused-border-color` | form-field | | focused | border-color |

Conventions within that grammar:

* **Property suffixes** - `-bg` for backgrounds; `-text-color` for text; `-border-color`; `-color`
  alone only for an accent applied to several properties at once (e.g. `--xh-card-primary-color`
  sets a border and header text); `-box-shadow`, `-font-size`, `-font-weight`, `-border-radius`,
  `-border-width`. A `-border` suffix holds a full shorthand (`1px solid ...`).
* **Spacing** - `--xh-spacing` is the base unit, with `-half` and `-double` variants. Component
  padding uses `-padding` (full shorthand) or `-padding-inline` (left + right only); `-gap` for
  flex/grid gaps.
* **States** - e.g. `hover`, `active`, `focused`, `selected`, `disabled`, placed before the
  property.
* **Variants** - element variants read naturally before the element (`--xh-grid-odd-row-bg`,
  `--xh-grid-total-row-bg`); sizing-mode variants follow the component
  (`--xh-grid-compact-font-size`, `--xh-title-compact-height`). Variants of a global token follow
  its property (`--xh-bg-alt`, `--xh-text-color-muted`, `--xh-font-family-mono`).
* **Scales** - `-small` / `-large` and `-half` / `-double` for global tokens, with the ratio behind a
  scale in a `-mult` variable (`--xh-font-size-large-mult`).
* **No platform or theme in names** - dark and mobile values are the same variable, redefined under
  `.xh-dark` / `.xh-mobile`. A variable only relevant on one platform (e.g. `--xh-input-height`,
  mobile only) still carries no platform prefix.
* **No units in names** - sizes carry their unit in the value (see below).

### Variable Categories

The `vars.scss` file organizes ~410 CSS custom properties into these categories:

| Category | Prefix Pattern | Examples |
|----------|---------------|----------|
| **Core Colors** | `--xh-{color}` | `--xh-blue`, `--xh-gray-dark`, `--xh-red-muted` |
| **Intent Colors** | `--xh-intent-{intent}-*` | `--xh-intent-primary`, `--xh-intent-danger-lighter` |
| **Positive/Negative** | `--xh-{pos\|neg\|neutral}-val-color` | `--xh-pos-val-color`, `--xh-neg-val-color` |
| **Background** | `--xh-bg*` | `--xh-bg`, `--xh-bg-alt`, `--xh-bg-highlight` |
| **Text** | `--xh-text-color*` | `--xh-text-color`, `--xh-text-color-muted`, `--xh-text-color-accent` |
| **Typography** | `--xh-font-*` | `--xh-font-family`, `--xh-font-size`, `--xh-font-size-large` |
| **Spacing** | `--xh-spacing*` | `--xh-spacing`, `--xh-spacing-half`, `--xh-spacing-double` |
| **Borders** | `--xh-border-*` | `--xh-border-color`, `--xh-border-solid`, `--xh-border-radius` |
| **Component-Specific** | `--xh-{component}-*` | `--xh-grid-bg`, `--xh-panel-title-bg`, `--xh-toolbar-min-size` |

Components with dedicated variable sets include: AppBar, Badge, Button, Card, Chart, Form Field,
Grid (including Large, Compact, Tiny, and ZoneGrid variants), Input, Loading Indicator, Mask, Menu,
Panel, Popup, Resizable Splitter, Scrollbar, Tab, Title, Toolbar, and Viewport.

### Units

Size variables hold real CSS lengths, units included, and derived sizes use plain `calc()`
arithmetic:

```scss
--xh-spacing: 10px;
--xh-spacing-half: calc(var(--xh-spacing) * 0.5);
```

Read size variables directly (`padding: var(--xh-spacing)`) and override them with a length:

```scss
// Do: Include the unit
body.xh-app { --xh-spacing: 8px; }

// Don't: Omit it - every size derived from the variable becomes invalid
body.xh-app { --xh-spacing: 8; }
```

Only genuine ratios are unitless: the `-mult` scale factors, line-height ratios, opacities, font
weights, and the intent HSL components. In development mode, Hoist logs a warning at startup if a
size variable resolves to a bare number.

### Intent Color System

Intent colors (neutral, primary, success, warning, danger) use an HSL decomposition pattern that
supports multiple lightness variants from a single hue/saturation definition:

```scss
// Base HSL components — override these to shift an entire intent palette
--xh-intent-primary-h: 206;
--xh-intent-primary-s: 100%;
--xh-intent-primary-l3: 30%;

// Composed into named variants (derived automatically)
--xh-intent-primary: hsl(var(--xh-intent-primary-h), var(--xh-intent-primary-s), var(--xh-intent-primary-l3));
--xh-intent-primary-darker: hsl(..., var(--xh-intent-primary-l2));
--xh-intent-primary-lighter: hsl(..., var(--xh-intent-primary-l4));
--xh-intent-primary-trans1: hsla(..., var(--xh-intent-a1));   // Semi-transparent
```

Each intent provides seven usable variants: `-darkest`, `-darker`, (base), `-lighter`, `-lightest`,
`-trans1`, and `-trans2`. This gives component styles a rich palette without requiring apps to
define every shade — overriding just the hue (`--xh-intent-primary-h`) will shift all derived
variants.

### Material Design Color Functions

The framework defaults for core colors are derived from Google's Material Design palette via the
`sass-material-colors` library and three SCSS helper functions:

```scss
@function mc($color-name, $color-variant) { ... }         // e.g. mc('blue', '700')
@function mc-muted($color-name, $color-variant, ...) { ... }  // Desaturated + lightened
@function mc-trans($color-name, $color-variant, ...) { ... }  // Semi-transparent
```

These functions run **at compile time** to generate static CSS default values. They are used only
within `vars.scss` to seed defaults — component SCSS files and application stylesheets reference
CSS custom properties, never these functions directly.

## Dark Theme

### How It Works

Hoist's dark theme is implemented via CSS class toggling on the `<body>` element:

1. `ThemeModel` (in `/appcontainer/`) manages the active theme, persisted via the `xhTheme`
   preference (values: `'light'`, `'dark'`, `'system'`)
2. When dark mode activates, `ThemeModel` adds the class `xh-dark` (and `bp6-dark` for Blueprint
   compatibility) to `document.body`
3. In `vars.scss`, `&:where(.xh-dark) { ... }` blocks override the relevant `--xh-*` variables
   with dark-appropriate values
4. All component styles automatically adapt because they reference CSS vars, not static colors

```scss
// vars.scss — framework defaults
--xh-bg: white;

&:where(.xh-dark) {
    --xh-bg: var(--xh-black);
}
```

The `system` option listens for `prefers-color-scheme` media query changes and automatically
tracks the OS-level preference.

### App-Level Dark Overrides

Applications provide per-theme overrides using the same `&.xh-dark` nesting pattern:

```scss
body.xh-app {
    --xh-border-color: #cccccc;
    --xh-text-color-muted: #5d5d5d;

    &.xh-dark {
        --xh-border-color: #37474f;
        --xh-text-color-muted: #acacac;
    }
}
```

A variable set without a `&.xh-dark` block applies to both themes. When you need different values
per theme, provide both.

### Dark Overrides in Component SCSS

Most dark theme adaptation happens through the variable overrides in `vars.scss`. In rare cases
where a component needs dark-specific styling that can't be expressed as a variable swap, component
SCSS files use the `.xh-dark &` selector pattern:

```scss
.xh-grid-menu-option {
    &--intent-success {
        color: var(--xh-intent-success-darker);
    }

    .xh-dark & {
        &--intent-success {
            color: var(--xh-intent-success-lighter);
        }
    }
}
```

### Mobile Variants

Several variables also have `&:where(.xh-mobile)` overrides for platform-specific defaults (e.g.
larger font sizes, taller toolbars, different AppBar colors). These combine with dark theme:

```scss
&:where(.xh-mobile) {
    --xh-font-size: 16px;

    &:where(.xh-dark) {
        --xh-appbar-bg: #{mc('blue-grey', '700')};
    }
}
```

## BEM Class Naming

### Convention

All Hoist CSS classes use the `xh-` prefix and follow BEM (Block Element Modifier) naming:

- **Block:** `.xh-panel`, `.xh-grid`, `.xh-card`
- **Element:** `.xh-panel__inner`, `.xh-card__header`, `.xh-popup__title`
- **Modifier:** `.xh-grid--hierarchical`, `.xh-card--collapsed`, `.xh-card--intent-primary`

### SCSS Nesting with `&`

Hoist leverages SCSS's parent selector (`&`) to write BEM selectors without repeating the block
name. This is one of the most important and pervasive uses of SCSS in the codebase:

```scss
.xh-card {
    background-color: var(--xh-card-bg);

    // Modifiers on the block
    &--collapsed {
        border-bottom: none;
    }

    &--intent-primary {
        border-color: var(--xh-card-primary-color);
    }

    // Elements
    &__header {
        color: var(--xh-card-header-text-color);
        font-size: var(--xh-card-header-font-size);

        // Modifiers on the element
        &--intent-primary {
            color: var(--xh-card-primary-color);
        }
    }

    &__content {
        flex-direction: column;
    }
}
```

This compiles to flat, specificity-friendly selectors: `.xh-card--collapsed`,
`.xh-card__header--intent-primary`, etc.

## Component SCSS Architecture

### Co-located Stylesheets

Each component has its own SCSS file, co-located with its TypeScript source:

```
cmp/card/
  Card.ts          // Component implementation
  Card.scss        // Component styles
  CardModel.ts     // Component model
```

The component imports its stylesheet as a side-effect import:

```typescript
import './Card.scss';
```

### className Integration

Hoist components accept a `className` prop and merge it with framework-defined classes using the
`classnames` library. The base class is declared in `hoistCmp.withFactory()`:

```typescript
export const [Card, card] = hoistCmp.withFactory<CardProps>({
    displayName: 'Card',
    className: 'xh-card',    // Base BEM block class

    render({className, ...props}) {
        // Framework adds modifier classes based on props/state
        return div({
            className: classNames(className, {
                'xh-card--collapsed': collapsed,
                'xh-card--intent-primary': intent === 'primary'
            }),
            items: [...]
        });
    }
});
```

This means application code can always pass additional classes that will be merged alongside the
framework's own classes:

```typescript
card({className: 'my-app-card', title: 'Summary', ...})
```

## Utility Classes

`XH.scss` defines a set of utility classes scoped under `body.xh-app` for common styling needs:

| Category | Classes | Example |
|----------|---------|---------|
| **Colors** | `.xh-blue`, `.xh-red`, `.xh-text-color-muted`, etc. | Quick text coloring |
| **Intents** | `.xh-intent-primary`, `.xh-bg-intent-danger` | Intent-based text/background |
| **Pos/Neg** | `.xh-pos-val`, `.xh-neg-val`, `.xh-neutral-val` | Financial value coloring |
| **Alignment** | `.xh-align-center`, `.xh-align-left`, `.xh-align-right` | Text + flex alignment |
| **Backgrounds** | `.xh-bg`, `.xh-bg-alt`, `.xh-bg-highlight` | Background colors |
| **Borders** | `.xh-border`, `.xh-border-top`, `.xh-border-dotted` | Quick borders |
| **Typography** | `.xh-bold`, `.xh-font-family-mono`, `.xh-font-size-large` | Text styling |
| **Spacing** | `.xh-pad`, `.xh-pad-half`, `.xh-margin-lr`, `.xh-pad-none` | Padding/margin |

These utility classes all reference CSS vars, so they automatically adapt to the active theme.

## SCSS Usage in Hoist

### What Hoist Uses

Hoist uses a deliberately limited subset of SCSS features:

| Feature | Usage | Example |
|---------|-------|---------|
| **Nesting** | Extensively — for BEM selectors and scoping | `&__header { ... }` |
| **`&` parent selector** | Core to BEM pattern | `&--collapsed`, `&__content` |
| **`@use` / `@import`** | Module imports | `@use 'vars';`, `@use 'sass:color';` |
| **Functions** | Color manipulation in `vars.scss` | `mc()`, `mc-muted()`, `mc-trans()` |
| **`@mixin` / `@include`** | Sparingly, for reusable patterns | Grid border mixins |
| **`@for` loops** | Rare, for generating depth-based styles | Tree grid row-level backgrounds |
| **`calc()`** | Frequently, with CSS vars | `calc(var(--xh-spacing) * 2)` |

### What Hoist Avoids

| Feature | Why Avoided |
|---------|-------------|
| **SCSS `$variables`** | CSS custom properties provide runtime theming; SCSS vars are compile-time only |
| **`@extend`** | Can cause specificity issues and unexpected selector output |
| **`%placeholders`** | Not used — `@extend` is avoided |
| **`@each` loops** | Complexity not warranted |
| **Deep nesting** | Kept shallow to maintain readable, low-specificity output |

The guiding principle: use SCSS for developer ergonomics (nesting, `&` selectors), but rely on
CSS custom properties for anything that needs to be themeable or overridable at runtime.

## Application Customization

### Overriding Theme Variables

Applications customize Hoist's appearance by setting `--xh-*` variables in their own SCSS. A
typical app-level stylesheet:

```scss
// App.scss
body.xh-app {
    // Override core spacing
    --xh-spacing: 8px;

    // Customize form field labels
    --xh-form-field-label-text-color: var(--xh-text-color-muted);
    --xh-form-field-label-font-size: var(--xh-font-size-small);
    --xh-form-field-label-text-transform: uppercase;

    // Dark theme specific overrides
    &.xh-dark {
        --xh-toolbar-bg: #1d272c;
    }
}
```

### App-Specific Component Styling

Applications define their own classes using an app-specific prefix (e.g. `tb-` for Toolbox) and
can also target Hoist framework classes for contextual overrides:

```scss
// App-prefixed classes follow the same BEM pattern
.tb-release-date-badge {
    font-weight: 500;
    &--clickable:hover {
        cursor: pointer;
    }
}

// Targeting framework classes for app-specific tweaks
.xh-appbar-icon {
    img {
        height: 25px;
        margin-left: var(--xh-spacing);
    }
}
```

### Integrating with Third-Party Libraries

Applications may need to style third-party library elements (e.g. Blueprint, ag-Grid). Reference
Hoist CSS vars for consistency:

```scss
body.xh-app {
    // ag-Grid integration — override a theme param on Hoist's grid wrapper. Prefer the
    // `--xh-grid-*` vars where one exists, or `AgGridModel.defaults.theme` for typed params.
    .xh-ag-grid {
        --ag-header-column-resize-handle-color: var(--xh-border-color);
    }

    // Blueprint tooltip tweaks
    .bp6-tooltip .bp6-popover-content {
        background-color: var(--xh-bg);
        color: var(--xh-text-color);
    }
}
```

## Related Packages

- [`/appcontainer/`](../appcontainer/README.md) — `ThemeModel` manages dark/light theme toggling
  and persistence
- [`/cmp/`](../cmp/README.md) — Component SCSS files that consume `--xh-*` vars
- [`/desktop/`](../desktop/README.md) — Desktop-specific component styles
- [`/mobile/`](../mobile/README.md) — Mobile-specific component styles
- [Coding Conventions](../docs/coding-conventions.md) — CSS class naming rules (`xh-` prefix,
  BEM, `--xh-*` variable namespace)

## Common Pitfalls

### Using SCSS Variables for Themeable Values

```scss
// Don't: Use SCSS variable — won't respond to theme changes
$my-bg: white;
.my-panel { background: $my-bg; }

// Do: Use CSS custom property — adapts with theme
.my-panel { background: var(--xh-bg); }
```

SCSS variables are resolved at compile time and cannot respond to runtime theme toggling.

### Omitting Units from Size Overrides

```scss
// Don't: Set a size variable to a bare number
body.xh-app { --xh-font-size: 14; }

// Do: Include the unit
body.xh-app { --xh-font-size: 14px; }
```

A bare number is not a valid length, so it silently breaks every property and derived variable
that uses it - e.g. `calc(var(--xh-font-size) * 1.2)` for `--xh-font-size-large`. Hoist versions
before v88 used unitless size variables; see the
[v88 upgrade notes](../docs/upgrade-notes/v88-upgrade-notes.md) for the migration.

### High-Specificity Selectors

```scss
// Don't: Over-nest to create high-specificity chains
body.xh-app .xh-panel .xh-panel__inner .xh-grid { ... }

// Do: Target the class directly
.xh-grid { ... }
```

Hoist's BEM naming ensures class uniqueness without requiring deep selector chains. High-specificity
selectors make overrides brittle and harder to reason about.
