# Icon

Hoist's icon system provides a factory-based API for
rendering [FontAwesome](https://fontawesome.com/) Pro icons throughout an application. Rather than
importing individual FA icon definitions in each file that uses them, applications use the `Icon`
singleton — a centralized catalog of 150+ direct icon factories and ~40 semantic aliases, all
pre-registered with the FA library in four weight variants (regular, solid, light, thin).

## Overview

Icons are a core visual element across Hoist UIs — they appear in buttons, toolbars, grid columns,
menus, tabs, tree nodes, toast messages, and more. The `Icon` singleton standardizes access to a
curated set of FA Pro icons and provides:

- **Named factory methods** — 150+ direct factories (`Icon.check()`, `Icon.gear()`,
  `Icon.user()`, etc.) plus ~40 semantic aliases
- **Semantic aliases** — `Icon.add()`, `Icon.edit()`, `Icon.delete()`, `Icon.search()`,
  `Icon.save()`, `Icon.refresh()` that delegate to specific visual icons, providing a consistent
  vocabulary across apps
- **Weight variants** — Switch between regular (default), solid, light, or thin via the `prefix`
  prop
- **Intent coloring** — Apply `primary`, `success`, `warning`, or `danger` intent for consistent
  semantic styling
- **Size control** — FA size values from `2xs` through `10x`
- **FA animation props** — `spin`, `pulse`, `beat`, `bounce`, `rotation`, `flip`, and other
  FontAwesome props are passed through to the underlying `FontAwesomeIcon` component
- **Fixed-width default** — All icons receive the `fa-fw` (fixed-width) and `xh-icon` CSS classes
  automatically, ensuring consistent spacing in menus, buttons, and toolbars
- **HTML mode** — Render as raw SVG strings for non-React contexts (e.g. Highcharts tooltips)
- **File-type icons** — `Icon.fileIcon({filename})` maps extensions to appropriate icons
- **Serialization** — `serializeIcon()`/`deserializeIcon()` for persisting icon config (used by
  DashContainer to save/restore widget icons in layout state)

## Architecture

```
icon/
├── Icon.ts              # Icon singleton with all factory methods + IconProps type
├── XHLogo.tsx           # XH corporate logo SVG component (theme-aware)
├── index.ts             # Barrel exports + FA library registration (all icon imports)
└── impl/
    ├── IconCmp.ts       # React component wrapping FontAwesomeIcon
    └── IconHtml.ts      # Raw SVG string renderer for asHtml mode
```

The `index.ts` barrel file is where all FontAwesome icon definitions are imported from the
`@fortawesome/pro-regular-svg-icons`, `@fortawesome/pro-solid-svg-icons`,
`@fortawesome/pro-light-svg-icons`, and `@fortawesome/pro-thin-svg-icons` packages and registered
with the FA `library`. This single registration point ensures every icon used by Hoist's factory
methods is available at runtime.

Each factory method on `Icon` delegates to `Icon.icon()`, which creates either an `IconCmp` (a
React component wrapping FA's `FontAwesomeIcon`) or an `IconHtml` (a raw SVG string), depending on
the `asHtml` flag.

## Usage Patterns

### Basic Icons

```typescript
import {Icon} from '@xh/hoist/icon';

// Named factory methods — the most common usage
Icon.check()
Icon.gear()
Icon.users()
Icon.chartLine()

// Semantic aliases — use these for common actions
Icon.add()       // → Icon.plus()
Icon.edit()      // → Icon.penToSquare()
Icon.delete()    // → Icon.minusCircle()
Icon.search()    // → Icon.magnifyingGlass()
Icon.save()      // → Icon.floppyDisk()
Icon.refresh()   // → Icon.arrowsRotate()
Icon.close()     // → Icon.x()
Icon.download()  // → Icon.arrowDownToBracket()
Icon.upload()    // → Icon.arrowUpFromBracket()
```

### With Intent and Size

```typescript
// Intent applies an xh-intent-{name} CSS class for semantic coloring
Icon.check({intent: 'success'})
Icon.warning({intent: 'danger'})
Icon.infoCircle({intent: 'primary'})

// Size uses FA's size scale
Icon.spinner({size: 'lg'})
Icon.gear({size: '2x'})
```

### FA Animation and Transform Props

Since `IconProps` extends FontAwesome's `FontAwesomeIconProps`, you can pass through FA animation
and transform props directly:

```typescript
Icon.spinner({spin: true})       // spinning loading indicator
Icon.bullhorn({shake: true})     // attention-grabbing announcement
Icon.star({rotation: 90})        // rotated 90 degrees
Icon.warning({bounce: true})     // bouncing warning
```

### Spinner Component

The `Spinner` component (`cmp/spinner/`) renders an animated FA icon for use by `Mask` and
`LoadingIndicator`. It uses FontAwesome's CSS-based `transform: rotate()` animation rather than
SVG-based animation, making it performant even in remote desktop environments such as Citrix.

Spinner ships with several pre-registered icon choices — `faSpinnerThird`, `faCircleNotch`, and
`faSpinnerScale` — all available in all four weight variants. The default icon, prefix, and
animation can be configured globally via `Spinner.defaults`, typically set in an app's
`Bootstrap.ts`:

```typescript
import {Spinner} from '@xh/hoist/cmp/spinner';

// Override icon and/or weight globally
Spinner.defaults.iconName = 'circle-notch';
Spinner.defaults.prefix = 'far';
Spinner.defaults.animation = 'spinPulse';
```

| Default                        | Type               | Default           | Description                                      |
|--------------------------------|--------------------|-------------------|--------------------------------------------------|
| `Spinner.defaults.iconName`    | `IconName`         | `'spinner-third'` | FA icon name for the spinner                     |
| `Spinner.defaults.prefix`      | `HoistIconPrefix`  | `'fal'`           | FA icon weight/prefix                            |
| `Spinner.defaults.animation`   | `SpinnerAnimation` | `'spin'`          | FA animation: `spin`, `spinPulse`, `pulse`, etc. |
| `Spinner.defaults.usePng`      | `boolean`          | `false`           | Fall back to animated PNG images                 |

Per-instance overrides can be passed as props to `spinner()` or via `LoadingIndicator`'s `spinner`
prop, which accepts either `true` (use defaults) or a `SpinnerProps` object:

```typescript
loadingIndicator({
    bind: myTask,
    spinner: {iconName: 'circle-notch', animation: 'spinPulse'}
})
```

A legacy PNG fallback is retained for environments where even CSS animations may be problematic.
Set `Spinner.defaults.usePng = true` globally to revert to the original animated PNG behavior.

### Weight Variants

```typescript
// Default prefix is 'far' (regular)
Icon.star()                      // regular outline
Icon.star({prefix: 'fas'})      // solid fill
Icon.star({prefix: 'fal'})      // light stroke
Icon.star({prefix: 'fat'})      // thin stroke
```

### File-Type Icons

`Icon.fileIcon()` maps file extensions to appropriate icons with optional type-specific CSS classes:

```typescript
Icon.fileIcon({filename: 'report.pdf'})    // → filePdf with xh-file-icon-pdf
Icon.fileIcon({filename: 'data.xlsx'})     // → fileExcel with xh-file-icon-excel
Icon.fileIcon({filename: 'photo.jpg'})     // → fileImage
Icon.fileIcon({filename: 'unknown.xyz'})   // → file (generic fallback)
```

### HTML Mode

Use `asHtml: true` to get a raw SVG string instead of a React element. This is needed in contexts
that build HTML strings directly, such as Highcharts tooltip formatters.

```typescript
Icon.check({asHtml: true})  // returns '<svg class="..."...'
```

### Placeholder

Use `Icon.placeholder()` to create an empty element that takes up the same space as an icon. Useful
for aligning items in menus or lists where some items have icons and others don't:

```typescript
menuItem({icon: Icon.check(), text: 'Option A'}),
menuItem({icon: Icon.placeholder(), text: 'Option B'})  // aligned with A
```

## App-Level Icon Catalogs

Applications are strongly encouraged to create their own `Icons.ts` file (typically in a `core/` or
`common/` directory) to centralize icon usage across the app. This file serves two purposes:

1. **Register custom FA icons** not included in Hoist's built-in set — import from the
   `@fortawesome/pro-*-svg-icons` packages and call `library.add()` to make them available at
   runtime. (This can also be done in `Bootstrap.ts`, but co-locating registration with the
   factories that use them keeps things organized.)
2. **Define app-specific semantic factories** that map domain concepts to consistent icons

This pattern ensures that domain-specific icons are used consistently throughout the app. When a
concept like "loan" or "invoice" always maps to the same icon, the app's visual language becomes
more coherent — and changing an icon later requires only a single edit.

```typescript
// src/core/Icons.ts
import {library} from '@fortawesome/fontawesome-svg-core';
import {faFileInvoiceDollar} from '@fortawesome/pro-regular-svg-icons';
import {Icon, IconProps} from '@xh/hoist/icon';

// 1. Register custom FA icons not in Hoist's built-in set
library.add(faFileInvoiceDollar);

// 2. Define app-specific semantic factories
//    Use Icon.icon() with iconName for custom-registered icons
export const invoiceIcon = (opts: IconProps = {}) =>
    Icon.icon({iconName: 'file-invoice-dollar', ...opts});

//    Delegate to existing Hoist factories to give them app-specific names
export const dealIcon = (opts: IconProps = {}) =>
    Icon.handshake(opts);
export const dashboardIcon = (opts: IconProps = {}) =>
    Icon.layout(opts);

// Factories can embed defaults for intent, size, or weight
export const approvedIcon = (opts: IconProps = {}) =>
    Icon.checkCircle({intent: 'success', ...opts});
export const rejectedIcon = (opts: IconProps = {}) =>
    Icon.xCircle({intent: 'danger', ...opts});
```

App-level factories follow the same `(opts?) => Icon.xxx(opts)` signature as Hoist's own
factories, so they can be used interchangeably — in buttons, grid columns, menus, and anywhere
else that accepts an icon element.

## IconProps Reference

| Prop        | Type                 | Description                                                                                                    |
|-------------|----------------------|----------------------------------------------------------------------------------------------------------------|
| `iconName`  | `IconName`           | FA icon name (e.g. `'check'`, `'gear'`). Required for `Icon.icon()`, provided automatically by named factories |
| `prefix`    | `HoistIconPrefix`    | Weight variant: `'far'` (regular, default), `'fas'` (solid), `'fal'` (light), `'fat'` (thin), `'fab'` (brands) |
| `intent`    | `Intent`             | Applies `xh-intent-{intent}` CSS class for semantic coloring                                                   |
| `title`     | `string`             | Tooltip text rendered as SVG `<title>`                                                                         |
| `size`      | `string`             | FA size: `'2xs'` through `'10x'`                                                                               |
| `asHtml`    | `boolean`            | Return raw SVG string instead of React element                                                                 |
| `className` | `string`             | Additional CSS class(es)                                                                                       |
| `omit`      | `Thunkable<boolean>` | Skip rendering this icon when true                                                                             |

## Serialization

`serializeIcon()` and `deserializeIcon()` support persisting icon configuration as JSON. This is
used by DashContainerModel to save/restore widget icons as part of persisted layout state:

```typescript
import {serializeIcon, deserializeIcon} from '@xh/hoist/icon';

const iconEl = Icon.check({intent: 'success'});
const json = serializeIcon(iconEl);  // {iconName: 'check', prefix: 'far', ...}
const restored = deserializeIcon(json);  // equivalent React element
```

Both functions require that the icon element was created by Hoist's `Icon` factories — they will
throw if passed an arbitrary React element.

## Common Pitfalls

### Importing FA Icons Directly Instead of Using Icon Factories

The `Icon` singleton pre-registers all its icons with the FA library. Importing individual FA icons
in application code is only needed for icons *not* already in Hoist's set.

```typescript
// ✅ Do: Use the Icon singleton
import {Icon} from '@xh/hoist/icon';
Icon.check()

// ❌ Don't: Import FA icons directly for icons Hoist already provides
import {faCheck} from '@fortawesome/pro-regular-svg-icons';
```

### Forgetting `prefix` with `Icon.icon()`

When using `Icon.icon()` directly for custom icons, the default prefix is `'far'` (regular). If
you registered a solid-only icon, you must specify `prefix: 'fas'`:

```typescript
// ✅ Do: Match the prefix to how you registered the icon
Icon.icon({iconName: 'custom-icon', prefix: 'fas'})

// ❌ Don't: Assume regular prefix when you registered a solid icon — renders blank
Icon.icon({iconName: 'custom-icon'})
```

### Using Non-FontAwesome Icon Libraries

Always use FontAwesome icons via Hoist's `Icon` singleton or the app-level `Icons.ts` pattern.
Do not pull icons from other libraries (e.g. Blueprint icons, Material icons) unless the app has
an explicit directive to do so. Mixing icon libraries breaks the cohesive visual language that FA
provides, and FontAwesome Pro's catalog is extensive enough to cover virtually any use case. If
you can't find the right icon in Hoist's pre-registered set, register a custom one from the FA Pro
packages — don't reach for a different library.

### Referencing Icons From the Wrong FontAwesome Version

FontAwesome updates frequently and adds new icons with each release. When browsing the FA site to
find an icon for your app, use the version picker to filter results to the version Hoist currently
depends on (check `@fortawesome/pro-regular-svg-icons` in `package.json`). Attempting to import an
icon that only exists in a newer FA version will fail at build time. Hoist endeavors to keep its FA
dependency up to date, but always verify the version before spending time wiring up a new icon.

* [FA icon search (latest version)](https://fontawesome.com/search?ip=classic&s=regular)
* [FA icon search (v7)](https://fontawesome.com/v7/search?ip=classic&s=regular)

### Using Brand Icons Without Registration

The `'fab'` (brands) prefix is supported but requires a separate import of
`@fortawesome/free-brands-svg-icons` in your app's bootstrap code. Brand icons are not bundled
with Hoist by default.

## Related Packages

- [`/cmp/spinner/`](../cmp/spinner/) — Spinner component renders an animated FA icon, configurable
  via static defaults on the `Spinner` class
- [`/desktop/`](../desktop/README.md) — Desktop components use icons extensively in buttons,
  toolbars, menus, and grid columns
- [`/desktop/cmp/dash/`](../desktop/cmp/dash/README.md) — DashContainer uses icon serialization
  to persist widget icons in saved layout state
