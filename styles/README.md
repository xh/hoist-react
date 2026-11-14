# Styles

> **Status: DRAFT** - This document needs review by an XH developer.
> See [docs-roadmap.md](../docs/planning/docs-roadmap.md) for the review workflow.

## Overview

The `/styles/` package defines the visual foundation of Hoist. It is a system of CSS custom
properties (CSS vars) that control colors, spacing, typography, borders, and the look of each
component. Together with BEM-style class names and one SCSS file per component, these variables
give consistent theming, including a built-in dark mode. They also give applications one clear,
well-scoped way to customize that theming.

Hoist uses SCSS (Sass) as its stylesheet preprocessor, but it limits its use of SCSS-specific
features on purpose. CSS custom properties, not SCSS variables, do the work of theming and
customization. SCSS serves mainly for nesting, for `&`-based BEM selectors, and for a few color
functions that generate default values at compile time.

## Key Files

| File | Purpose |
|------|---------|
| `vars.scss` | Defines all `--xh-*` CSS custom properties on `body`, with light/dark/mobile variants |
| `XH.scss` | Global stylesheet - imports vars, sets up base `body.xh-app` styles, defines utility classes |
| `helpers.scss` | Small SCSS utility functions (inline SVG encoding) used internally |

## CSS Custom Properties

### Overriding `--xh-*` Variables

All Hoist CSS custom properties use the `--xh-` prefix. To customize the look of Hoist, an
application sets these variables in its own stylesheet, on `body.xh-app`:

```scss
// App.scss
body.xh-app {
    // Core spacing and colors
    --xh-spacing: 8px;
    --xh-border-color: #cccccc;
    --xh-text-color-muted: #5d5d5d;

    // Component variables
    --xh-grid-group-bg: hsl(206, 20%, 65%);
    --xh-toolbar-compact-min-size: 32px;
    --xh-form-field-label-text-color: var(--xh-text-color-muted);
    --xh-form-field-label-font-size: var(--xh-font-size-small);
    --xh-form-field-label-text-transform: uppercase;

    // Dark theme specific overrides
    &.xh-dark {
        --xh-toolbar-bg: #1d272c;
    }
}
```

Component SCSS files read these variables for all themeable properties. Hoist declares every
default on `body`, with the specificity of a bare `body` selector. Its dark-theme and mobile
variants sit inside `:where()`, for example `body:where(.xh-dark)`, which adds no specificity. An
app override on `body.xh-app` therefore beats every framework default without relying on
stylesheet order. This holds in light and dark themes, and on desktop and mobile.

Where to set overrides:

* **`body.xh-app`** - the recommended selector for app-wide overrides.
* **Not bare `body`** - an app declaration there ties with the Hoist default and wins only by
  source order.
* **Not `:root` or `html`** - the Hoist declarations on `body` take precedence over any value that
  `body` would otherwise inherit. Overrides set on an ancestor of `body` have no effect.

For values that differ per theme, nest an `&.xh-dark` block (see
[App-Level Dark Overrides](#app-level-dark-overrides) below). Nest `&.xh-mobile` the same way for
mobile-only values.

#### Base vs. Derived Variables

Many variables derive from others. For example, `--xh-spacing-half` derives from `--xh-spacing`,
`--xh-grid-header-bg` from `--xh-grid-bg`, and `--xh-intent-primary` from the
`--xh-intent-primary-*` HSL components. CSS resolves a `var()` reference on the element that
declares the referencing variable, and descendants inherit the *resolved* value. Hoist declares
all of these variables on `body`, which has two results:

* **An override of a base variable on `body.xh-app` flows through to everything derived from it.**
  Setting `--xh-spacing: 8px` updates `--xh-spacing-half`, `--xh-spacing-double`, and every
  component spacing built on them.
* **An override of a base variable on a descendant reaches only CSS that reads it directly.**
  Setting `--xh-spacing: 4px` on `.my-panel` changes padding that reads `var(--xh-spacing)` within
  that subtree. But `--xh-spacing-half` there still holds the value computed on `body`.

#### Scoped Overrides

A variable set on a more specific selector changes only that subtree. For this reason, set the
variable that the components actually read, not one upstream of it:

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

Derivation can run several levels deep. For example, Hoist builds `--xh-form-field-margin` from
`--xh-spacing` on `body`, so a scoped `--xh-spacing` leaves form field margins unchanged. Scoped
overrides suit leaf variables such as colors best. For broad changes such as density, override
the base variable app-wide on `body.xh-app`. Or use the built-in sizing options of a component,
for example the grid `sizingMode`.

If you are not sure which variable a component reads, check its SCSS file. You can also search
`vars.scss` for the name of the variable to see what references it.

### Naming Conventions

Every Hoist variable follows the same grammar, so you can usually predict a name from what it
styles:

```
--xh-{component}-{element}-{state}-{property}
```

Only `--xh-` and `{property}` are always present. Global tokens drop the component
(`--xh-border-color`, `--xh-font-size`). Component tokens name the component and, where needed,
the element and state:

| Name | Component | Element | State | Property |
|------|-----------|---------|-------|----------|
| `--xh-grid-bg` | grid | | | bg |
| `--xh-grid-header-font-size` | grid | header | | font-size |
| `--xh-grid-row-hover-bg` | grid | row | hover | bg |
| `--xh-button-active-text-color` | button | | active | text-color |
| `--xh-form-field-focused-border-color` | form-field | | focused | border-color |

Conventions within that grammar:

* **Property suffixes** - `-bg` for backgrounds and `-text-color` for text. Use `-color` alone only
  for an accent that applies to several properties at once. For example, `--xh-card-primary-color`
  sets a border and the header text. Other suffixes are `-border-color`, `-box-shadow`,
  `-font-size`, `-font-weight`, `-border-radius`, and `-border-width`. A `-border` suffix holds a
  full shorthand (`1px solid ...`).
* **Spacing** - `--xh-spacing` is the base unit, with `-half` and `-double` variants. Component
  padding uses `-padding` for a full shorthand or `-padding-inline` for left and right only. Use
  `-gap` for flex and grid gaps.
* **States** - for example `hover`, `active`, `focused`, `selected`, and `disabled`. A state comes
  before the property.
* **Variants** - element variants read naturally before the element (`--xh-grid-odd-row-bg`,
  `--xh-grid-total-row-bg`). Sizing-mode variants follow the component
  (`--xh-grid-compact-font-size`, `--xh-title-compact-height`). Variants of a global token follow
  its property (`--xh-bg-alt`, `--xh-text-color-muted`, `--xh-font-family-mono`).
* **Scales** - global tokens use `-small` / `-large` and `-half` / `-double`. A `-mult` variable
  holds the ratio behind a scale (`--xh-font-size-large-mult`).
* **No platform or theme in names** - dark and mobile values use the same variable, redefined
  under `.xh-dark` / `.xh-mobile`. A variable that only one platform uses still carries no
  platform prefix, for example `--xh-input-height`, which is mobile only.
* **No units in names** - sizes carry their unit in the value (see [Units](#units)).

### Variable Categories

The `vars.scss` file organizes its CSS custom properties into these categories:

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

These components have their own variable sets:

* AppBar, Badge, Button, Card, Chart, Form Field, Input, Loading Indicator, Mask, Menu, Popup,
  Scrollbar, Tab, Title, Toolbar, Tooltip, and Viewport.
* Grid, including the Large, Compact, Tiny, and ZoneGrid variants.
* Panel, including Panel Splitter and Collapsed Strip.
* Resizable Splitter, which `DashContainer` and `SplitTreeMap` use.

### Units

Size variables hold real CSS lengths, units included. Derived sizes use plain `calc()` arithmetic:

```scss
--xh-spacing: 10px;
--xh-spacing-half: calc(var(--xh-spacing) * 0.5);
```

Read size variables directly (`padding: var(--xh-spacing)`), and override them with a length:

```scss
// Do: Include the unit
body.xh-app { --xh-spacing: 8px; }

// Don't: Omit it - every size derived from the variable becomes invalid
body.xh-app { --xh-spacing: 8; }
```

Only true ratios are unitless: the `-mult` scale factors, line-height ratios, opacities, font
weights, and the intent HSL components. In development mode, Hoist logs a warning at startup if a
size variable resolves to a bare number.

### Intent Color System

Intent colors (neutral, primary, success, warning, danger) use an HSL decomposition. One hue and
saturation definition supports several lightness variants:

```scss
// Base HSL components - override these to shift an entire intent palette
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
`-trans1`, and `-trans2`. Component styles get a full palette, and apps do not need to define
every shade. An override of the hue alone (`--xh-intent-primary-h`) shifts all derived variants.

### Material Design Color Functions

The framework defaults for core colors come from the Google Material Design palette. Hoist reads
that palette through the `sass-material-colors` library and three SCSS helper functions:

```scss
@function mc($color-name, $color-variant) { ... }         // e.g. mc('blue', '700')
@function mc-muted($color-name, $color-variant, ...) { ... }  // Desaturated + lightened
@function mc-trans($color-name, $color-variant, ...) { ... }  // Semi-transparent
```

These functions run **at compile time** to generate static CSS default values. Only `vars.scss`
calls them, to seed defaults. Component SCSS files and application stylesheets read CSS custom
properties, never these functions.

## Dark Theme

### How It Works

Hoist switches to its dark theme by toggling a CSS class on the `<body>` element:

1. `ThemeModel` (in `/appcontainer/`) manages the active theme. The `xhTheme` preference persists
   it, with the values `'light'`, `'dark'`, and `'system'`.
2. When dark mode activates, `ThemeModel` adds the class `xh-dark` to `document.body`. It also adds
   `bp6-dark` for Blueprint compatibility.
3. In `vars.scss`, `&:where(.xh-dark) { ... }` blocks override the relevant `--xh-*` variables
   with dark values.
4. All component styles adapt automatically, because they read CSS vars, not static colors.

```scss
// vars.scss - framework defaults
--xh-bg: white;

&:where(.xh-dark) {
    --xh-bg: var(--xh-black);
}
```

The `system` option listens for changes to the `prefers-color-scheme` media query and follows the
preference of the operating system.

### App-Level Dark Overrides

Applications provide per-theme overrides with the same `&.xh-dark` nesting pattern:

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

A variable set outside a `&.xh-dark` block applies to both themes. When you need different values
per theme, provide both.

### Dark Overrides in Component SCSS

Most dark theme styling comes from the variable overrides in `vars.scss`. Sometimes a component
needs dark-specific styling that a variable swap cannot express. In that case, its SCSS file uses
the `.xh-dark &` selector pattern:

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

Several variables also have `&:where(.xh-mobile)` overrides with platform-specific defaults, for
example larger font sizes, taller toolbars, and different AppBar colors. These combine with the
dark theme:

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

Hoist uses the SCSS parent selector (`&`) to write BEM selectors without repeating the block name.
This is one of the most important and common uses of SCSS in the codebase:

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

This compiles to flat, low-specificity selectors such as `.xh-card--collapsed` and
`.xh-card__header--intent-primary`.

## Component SCSS Architecture

### Co-located Stylesheets

Each component has its own SCSS file, next to its TypeScript source:

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

Hoist components accept a `className` prop. They merge it with the framework classes through the
`classnames` library. `hoistCmp.withFactory()` declares the base class:

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

Application code can therefore always pass extra classes, and Hoist merges them with its own:

```typescript
card({className: 'my-app-card', title: 'Summary', ...})
```

## Utility Classes

`XH.scss` defines a set of utility classes, scoped under `body.xh-app`, for common styling needs:

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

These utility classes all read CSS vars, so they adapt to the active theme automatically.

## SCSS Usage in Hoist

### What Hoist Uses

Hoist uses a limited subset of SCSS features on purpose:

| Feature | Usage | Example |
|---------|-------|---------|
| **Nesting** | Extensively - for BEM selectors and scoping | `&__header { ... }` |
| **`&` parent selector** | Core to BEM pattern | `&--collapsed`, `&__content` |
| **`@use` / `@import`** | Module imports | `@use 'vars';`, `@use 'sass:color';` |
| **Functions** | Color manipulation in `vars.scss` | `mc()`, `mc-muted()`, `mc-trans()` |
| **`@mixin` / `@include`** | Sparingly, for reusable patterns | Grid border mixins |
| **`@for` loops** | Rare, for generating depth-based styles | Tree grid row-level backgrounds |
| **`calc()`** | Frequently, with CSS vars | `calc(var(--xh-spacing) * 2)` |

### What Hoist Avoids

| Feature | Why Avoided |
|---------|-------------|
| **SCSS `$variables`** | CSS custom properties provide runtime theming. SCSS vars are compile-time only |
| **`@extend`** | Can cause specificity issues and unexpected selector output |
| **`%placeholders`** | Not used - `@extend` is avoided |
| **`@each` loops** | Complexity not warranted |
| **Deep nesting** | Kept shallow to maintain readable, low-specificity output |

The guiding principle: use SCSS for developer convenience, such as nesting and `&` selectors. Use
CSS custom properties for anything that must be themeable or overridable at runtime.

## Application Customization

To change Hoist variables, see [Overriding `--xh-*` Variables](#overriding---xh--variables). This
section covers app classes and third-party libraries.

### App-Specific Component Styling

Applications define their own classes with an app-specific prefix, for example `tb-` for Toolbox.
They can also target Hoist framework classes for contextual overrides:

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

Applications sometimes need to style elements from third-party libraries such as Blueprint or
ag-Grid. Read Hoist CSS vars there for consistency:

```scss
body.xh-app {
    // ag-Grid integration - override a theme param on Hoist's grid wrapper. Prefer the
    // `--xh-grid-*` vars where one exists, or `AgGridModel.defaults.theme` for typed params.
    .xh-ag-grid {
        --ag-header-column-resize-handle-color: var(--xh-border-color);
    }

    // Blueprint integration - style elements Hoist does not theme with the shared vars.
    .bp6-callout {
        border: var(--xh-border-solid);
    }
}
```

Hoist already themes Blueprint tooltips. To change their look, set the `--xh-tooltip-*` vars on
`body.xh-app`, such as `--xh-tooltip-bg` or `--xh-tooltip-border-color`. Do not target
`.bp6-tooltip` directly.

## Related Packages

- [`/appcontainer/`](../appcontainer/README.md) - `ThemeModel` manages dark/light theme toggling
  and persistence
- [`/cmp/`](../cmp/README.md) - Component SCSS files that consume `--xh-*` vars
- [`/desktop/`](../desktop/README.md) - Desktop-specific component styles
- [`/mobile/`](../mobile/README.md) - Mobile-specific component styles
- [Coding Conventions](../docs/coding-conventions.md) - CSS class naming rules (`xh-` prefix,
  BEM, `--xh-*` variable namespace)

## Common Pitfalls

### Using SCSS Variables for Themeable Values

```scss
// Don't: Use SCSS variable - won't respond to theme changes
$my-bg: white;
.my-panel { background: $my-bg; }

// Do: Use CSS custom property - adapts with theme
.my-panel { background: var(--xh-bg); }
```

Sass resolves SCSS variables at compile time, so they cannot respond to a runtime theme change.

### Omitting Units from Size Overrides

```scss
// Don't: Set a size variable to a bare number
body.xh-app { --xh-font-size: 14; }

// Do: Include the unit
body.xh-app { --xh-font-size: 14px; }
```

A bare number is not a valid length. It silently breaks every property and derived variable that
uses it, for example `calc(var(--xh-font-size) * 1.2)` for `--xh-font-size-large`. Hoist versions
before v91 used unitless size variables. See the
[v91 upgrade notes](../docs/upgrade-notes/v91-upgrade-notes.md) for the migration.

### High-Specificity Selectors

```scss
// Don't: Over-nest to create high-specificity chains
body.xh-app .xh-panel .xh-panel__inner .xh-grid { ... }

// Do: Target the class directly
.xh-grid { ... }
```

BEM naming keeps Hoist class names unique without deep selector chains. High-specificity selectors
make overrides brittle and harder to reason about.
