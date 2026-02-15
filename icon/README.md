> **Status: DRAFT** — This document is awaiting review by an XH developer. Content may be
> incomplete or inaccurate. Do not remove this banner until a human reviewer approves the doc.

# Icon

Hoist's icon system provides a factory-based API for rendering [FontAwesome](https://fontawesome.com/)
Pro icons throughout an application. Rather than importing individual FA icon definitions in each
file that uses them, applications use the `Icon` singleton — a centralized catalog of 100+
pre-configured icon factory methods, all pre-registered with the FA library in four weight variants
(regular, solid, light, thin).

## Overview

Icons are a core visual element across Hoist UIs — they appear in buttons, toolbars, grid columns,
menus, tabs, tree nodes, toast messages, and more. The `Icon` singleton standardizes access to a
curated set of FA Pro icons and provides:

- **Named factory methods** — `Icon.check()`, `Icon.gear()`, `Icon.user()`, etc.
- **Semantic aliases** — `Icon.add()`, `Icon.edit()`, `Icon.delete()`, `Icon.search()`,
  `Icon.save()`, `Icon.refresh()` that delegate to specific visual icons, providing a consistent
  vocabulary across apps
- **Weight variants** — Switch between regular (default), solid, light, or thin via the `prefix`
  prop
- **Intent coloring** — Apply `primary`, `success`, `warning`, or `danger` intent for consistent
  semantic styling
- **Size control** — FA size values from `2xs` through `10x`
- **HTML mode** — Render as raw SVG strings for non-React contexts (e.g. ag-Grid cell renderers)
- **File-type icons** — `Icon.fileIcon({filename})` maps extensions to appropriate icons
- **Serialization** — `serializeIcon()`/`deserializeIcon()` for persisting icon config (used by
  GridModel column state)

## Architecture

```
icon/
├── Icon.ts              # Icon singleton with all factory methods + IconProps type
├── XHLogo.tsx           # XH corporate logo SVG component
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

### Weight Variants

```typescript
// Default prefix is 'far' (regular)
Icon.star()                      // regular outline
Icon.star({prefix: 'fas'})      // solid fill
Icon.star({prefix: 'fal'})      // light stroke
Icon.star({prefix: 'fat'})      // thin stroke
```

### Custom FontAwesome Icons

If the icon you need is not among Hoist's pre-registered set, register it in your app's bootstrap:

```typescript
// In your app's Bootstrap.ts
import {library} from '@fortawesome/fontawesome-svg-core';
import {faRocketLaunch} from '@fortawesome/pro-regular-svg-icons';
library.add(faRocketLaunch);

// Then use via the generic Icon.icon() factory
Icon.icon({iconName: 'rocket-launch'})
Icon.icon({iconName: 'rocket-launch', prefix: 'fas'})
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

Use `asHtml: true` to get a raw SVG string instead of a React element. This is useful in contexts
where React elements are not supported, such as ag-Grid column header templates:

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

## IconProps Reference

| Prop | Type | Description |
|------|------|-------------|
| `iconName` | `IconName` | FA icon name (e.g. `'check'`, `'gear'`). Required for `Icon.icon()`, provided automatically by named factories |
| `prefix` | `HoistIconPrefix` | Weight variant: `'far'` (regular, default), `'fas'` (solid), `'fal'` (light), `'fat'` (thin), `'fab'` (brands) |
| `intent` | `Intent` | Applies `xh-intent-{intent}` CSS class for semantic coloring |
| `title` | `string` | Tooltip text rendered as SVG `<title>` |
| `size` | `string` | FA size: `'2xs'` through `'10x'` |
| `asHtml` | `boolean` | Return raw SVG string instead of React element |
| `className` | `string` | Additional CSS class(es) |
| `omit` | `Thunkable<boolean>` | Skip rendering this icon when true |

## Serialization

`serializeIcon()` and `deserializeIcon()` support persisting icon configuration as JSON. This is
used internally by GridModel to save/restore column icons as part of column state:

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

### Using Brand Icons Without Registration

The `'fab'` (brands) prefix is supported but requires a separate import of
`@fortawesome/free-brands-svg-icons` in your app's bootstrap code. Brand icons are not bundled
with Hoist by default.

## Related Packages

- [`/desktop/`](../desktop/README.md) — Desktop components use icons extensively in buttons,
  toolbars, menus, and grid columns
- [`/cmp/grid/`](../cmp/grid/README.md) — GridModel column config supports `headerIcon` for
  column header icons, and icon serialization is used for persisting column state
