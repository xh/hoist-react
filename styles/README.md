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

### The Two-Tier Variable Pattern

Every `--xh-*` variable follows a two-tier pattern that enables app-level overrides:

```scss
// In vars.scss — framework default
--xh-grid-bg: var(--grid-bg, var(--xh-bg));
```

This reads as: "Use `--grid-bg` if the app has defined it, otherwise fall back to `--xh-bg`." The
outer `--xh-grid-bg` is the variable that component SCSS files actually reference. The inner
`--grid-bg` (without the `xh-` prefix) is the app-level override hook.

This means applications can customize any Hoist style by setting the unprefixed variable:

```scss
// In an app's SCSS — override grid background
body.xh-app {
    --grid-bg: #fafafa;
}
```

Applications should **not** redefine `--xh-*` variables directly — those are framework-managed.
Use the unprefixed override hooks instead.

### Variable Categories

The `vars.scss` file organizes ~300 CSS custom properties into these categories:

| Category | Prefix Pattern | Examples |
|----------|---------------|----------|
| **Core Colors** | `--xh-{color}` | `--xh-blue`, `--xh-gray-dark`, `--xh-red-muted` |
| **Intent Colors** | `--xh-intent-{intent}-*` | `--xh-intent-primary`, `--xh-intent-danger-lighter` |
| **Positive/Negative** | `--xh-{pos\|neg\|neutral}-val-color` | `--xh-pos-val-color`, `--xh-neg-val-color` |
| **Background** | `--xh-bg*` | `--xh-bg`, `--xh-bg-alt`, `--xh-bg-highlight` |
| **Text** | `--xh-text-color*` | `--xh-text-color`, `--xh-text-color-muted`, `--xh-text-color-accent` |
| **Typography** | `--xh-font-*` | `--xh-font-family`, `--xh-font-size-px`, `--xh-font-size-large-em` |
| **Spacing** | `--xh-pad*` | `--xh-pad-px`, `--xh-pad-half-px`, `--xh-pad-double-px` |
| **Borders** | `--xh-border-*` | `--xh-border-color`, `--xh-border-solid`, `--xh-border-radius-px` |
| **Component-Specific** | `--xh-{component}-*` | `--xh-grid-bg`, `--xh-panel-title-bg`, `--xh-tbar-min-size-px` |

Components with dedicated variable sets include: AppBar, Badge, Button, Card, Chart, Form Field,
Grid (including Large, Compact, Tiny, and ZoneGrid variants), Input, Loading Indicator, Mask, Menu,
Panel, Popup, Resizable Splitter, Scrollbar, Tab, Title, Toolbar, and Viewport.

### Unitless Values and the `-px` Suffix Convention

Many size-related variables store **unitless numbers** and provide a computed `-px` companion:

```scss
--xh-pad: var(--pad, 10);
--xh-pad-px: calc(var(--xh-pad) * 1px);
```

This enables `calc()` operations on the base value while providing a ready-to-use pixel variant
for direct property assignment. Apps overriding these values should set the unprefixed variable
to a unitless number:

```scss
// ✅ Do: Set a unitless number
body.xh-app { --pad: 8; }

// ❌ Don't: Include units in the override
body.xh-app { --pad: 8px; }
```

### Intent Color System

Intent colors (neutral, primary, success, warning, danger) use an HSL decomposition pattern that
supports multiple lightness variants from a single hue/saturation definition:

```scss
// Base HSL components
--xh-intent-primary-h: var(--intent-primary-h, 206);
--xh-intent-primary-s: var(--intent-primary-s, 100%);
--xh-intent-primary-l3: var(--intent-primary-l3, 30%);

// Composed into named variants
--xh-intent-primary: hsl(var(--xh-intent-primary-h), var(--xh-intent-primary-s), var(--xh-intent-primary-l3));
--xh-intent-primary-darker: hsl(..., var(--xh-intent-primary-l2));
--xh-intent-primary-lighter: hsl(..., var(--xh-intent-primary-l4));
--xh-intent-primary-trans1: hsla(..., var(--xh-intent-a1));   // Semi-transparent
```

Each intent provides seven usable variants: `-darkest`, `-darker`, (base), `-lighter`, `-lightest`,
`-trans1`, and `-trans2`. This gives component styles a rich palette without requiring apps to
define every shade — overriding just the hue (`--intent-primary-h`) will shift all derived variants.

### Material Design Color Functions

The framework defaults for core colors are derived from Google's Material Design palette via the
`sass-material-colors` library and three SCSS helper functions:

```scss
@function mc($color-name, $color-variant) { ... }         // e.g. mc('blue', '700')
@function mc-muted($color-name, $color-variant, ...) { ... }  // Desaturated + lightened
@function mc-trans($color-name, $color-variant, ...) { ... }  // Semi-transparent
```

These functions run **at compile time** to generate static CSS fallback values. They are used only
within `vars.scss` to seed defaults — component SCSS files and application stylesheets reference
CSS custom properties, never these functions directly.

## Dark Theme

### How It Works

Hoist's dark theme is implemented via CSS class toggling on the `<body>` element:

1. `ThemeModel` (in `/appcontainer/`) manages the active theme, persisted via the `xhTheme`
   preference (values: `'light'`, `'dark'`, `'system'`)
2. When dark mode activates, `ThemeModel` adds the class `xh-dark` (and `bp6-dark` for Blueprint
   compatibility) to `document.body`
3. In `vars.scss`, `&.xh-dark { ... }` blocks override the relevant `--xh-*` variables with
   dark-appropriate values
4. All component styles automatically adapt because they reference CSS vars, not static colors

```scss
// vars.scss
--xh-bg: var(--bg, white);

&.xh-dark {
    --xh-bg: var(--bg, var(--xh-black));
}
```

The `system` option listens for `prefers-color-scheme` media query changes and automatically
tracks the OS-level preference.

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

Several variables also have `&.xh-mobile` overrides for platform-specific defaults (e.g. larger
font sizes, taller toolbars, different AppBar colors). These combine with dark theme:

```scss
&.xh-mobile {
    --xh-font-size: var(--font-size, 16);

    &.xh-dark {
        --xh-appbar-bg: var(--appbar-bg, #{mc('blue-grey', '700')});
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
        font-size: var(--xh-card-header-font-size-px);

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
| **`calc()`** | Frequently, with CSS vars | `calc(var(--xh-pad) * 1px)` |

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

Applications customize Hoist's appearance by setting the unprefixed override hooks in their own
SCSS. A typical app-level stylesheet:

```scss
// App.scss
body.xh-app {
    // Override core spacing
    --pad: 8;

    // Customize form field labels
    --form-field-label-color: var(--xh-text-color-muted);
    --form-field-label-font-size: var(--xh-font-size-small-px);
    --form-field-label-text-transform: uppercase;

    // Dark theme specific overrides
    &.xh-dark {
        --xh-tbar-bg: #1d272c;
    }
}
```

### App-Specific Component Styling

Applications define their own classes using an app-specific prefix (e.g. `tb-` for Toolbox, `js-`
for Jobsite) and can also target Hoist framework classes for contextual overrides:

```scss
// App-prefixed classes follow the same BEM pattern
.js-release-date-badge {
    font-weight: 500;
    &--clickable:hover {
        cursor: pointer;
    }
}

// Targeting framework classes for app-specific tweaks
.xh-appbar-icon {
    img {
        height: 25px;
        margin-left: var(--xh-pad-px);
    }
}
```

### Integrating with Third-Party Libraries

Applications may need to style third-party library elements (e.g. Blueprint, ag-Grid). Reference
Hoist CSS vars for consistency:

```scss
body.xh-app {
    // ag-Grid integration — use Hoist var for consistent background
    [class*='ag-theme-'] {
        --ag-data-background-color: var(--xh-bg);
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

### Redefining `--xh-*` Variables Directly

```scss
// ❌ Don't: Override the framework-managed variable
body.xh-app {
    --xh-grid-bg: #fafafa;
}

// ✅ Do: Use the unprefixed override hook
body.xh-app {
    --grid-bg: #fafafa;
}
```

The `--xh-*` prefix is reserved for the framework. While directly overriding them will technically
work, it bypasses the two-tier indirection and may be overwritten by future framework updates.

### Using SCSS Variables for Themeable Values

```scss
// ❌ Don't: Use SCSS variable — won't respond to theme changes
$my-bg: white;
.my-panel { background: $my-bg; }

// ✅ Do: Use CSS custom property — adapts with theme
.my-panel { background: var(--xh-bg); }
```

SCSS variables are resolved at compile time and cannot respond to runtime theme toggling.

### Including Units in Override Values

```scss
// ❌ Don't: Include px units — breaks calc() expressions
body.xh-app { --font-size: 14px; }

// ✅ Do: Use unitless numbers for size overrides
body.xh-app { --font-size: 14; }
```

Hoist's unitless-plus-`-px` pattern uses `calc(var(...) * 1px)` to add units — if the source
value already includes units, the calculation produces invalid values like `14px * 1px`.

### High-Specificity Selectors

```scss
// ❌ Don't: Over-nest to create high-specificity chains
body.xh-app .xh-panel .xh-panel__inner .xh-grid { ... }

// ✅ Do: Target the class directly
.xh-grid { ... }
```

Hoist's BEM naming ensures class uniqueness without requiring deep selector chains. High-specificity
selectors make overrides brittle and harder to reason about.
