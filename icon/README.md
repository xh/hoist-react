# Icon

Hoist's icon system provides a factory-based API for
rendering [FontAwesome](https://fontawesome.com/) Pro icons throughout an application. Rather than
importing individual FA icon definitions in each file that uses them, applications use the `Icon`
singleton — a centralized catalog of 200+ direct icon factories and ~40 semantic aliases, all
pre-registered with the FA library in four weight variants (regular, solid, light, thin). Apps
extend that catalog with their own icons via `Icon.register()`.

## Overview

Icons are a core visual element across Hoist UIs — they appear in buttons, toolbars, grid columns,
menus, tabs, tree nodes, toast messages, and more. The `Icon` singleton standardizes access to a
curated set of FA Pro icons and provides:

- **Named factory methods** — 200+ direct factories (`Icon.check()`, `Icon.gear()`,
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
- **Custom icon registration** — `Icon.register()` imports an app's own FA icons, installs
  factories for them, and makes them available for name-based lookup and user-facing pickers
- **Name-based lookup** — `Icon.get(name)` renders any registered icon from a dynamic string,
  e.g. a user's choice persisted to the server

## Architecture

```
icon/
├── Icon.ts              # Icon singleton with all factory methods + IconProps type
├── XHLogo.tsx           # XH corporate logo SVG component (theme-aware)
├── index.ts             # Barrel exports + FA library registration (all icon imports)
└── impl/
    ├── IconCmp.ts       # React component wrapping FontAwesomeIcon
    ├── IconHtml.ts      # Raw SVG string renderer for asHtml mode
    └── IconRegistry.ts  # Catalog of all known icons - built-ins plus app registrations
```

The `index.ts` barrel file is where all FontAwesome icon definitions are imported from the
`@fortawesome/pro-regular-svg-icons`, `@fortawesome/pro-solid-svg-icons`,
`@fortawesome/pro-light-svg-icons`, and `@fortawesome/pro-thin-svg-icons` packages and registered
with the FA `library`. This single registration point ensures every icon used by Hoist's factory
methods is available at runtime.

Each factory method on `Icon` delegates to `Icon.icon()`, which creates either an `IconCmp` (a
React component wrapping FA's `FontAwesomeIcon`) or an `IconHtml` (a raw SVG string), depending on
the `asHtml` flag.

`IconRegistry` maintains a catalog of every icon Hoist knows about, keyed by FA name. Hoist's own
icons are cataloged lazily, by calling each factory in `Icon.ts` and reading the icon it renders —
so the catalog stays in sync with that file automatically. Apps add to it via `Icon.register()`.
The catalog powers `Icon.get()`, `Icon.getCatalog()`, and the desktop `IconPicker` component.

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
`LoadingIndicator`. The rotation animation is applied via Hoist-owned CSS (`@keyframes xh-spin`
on `.xh-spinner`) rather than FA's animation props. This ensures the spinner remains functional
when the OS-level `prefers-reduced-motion` preference is enabled (FA disables all its animations
in that case) and keeps performance predictable in remote desktop environments such as Citrix.

Spinner ships with several pre-registered icon choices - `faSpinnerThird`, `faCircleNotch`, and
`faSpinnerScale` - all available in all four weight variants. The default icon and prefix can be
configured globally via `Spinner.defaults`, typically set in an app's `Bootstrap.ts`:

```typescript
import {Spinner} from '@xh/hoist/cmp/spinner';

// Override icon and/or weight globally
Spinner.defaults.iconName = 'circle-notch';
Spinner.defaults.prefix = 'far';
```

| Default                        | Type              | Default           | Description                  |
|--------------------------------|-------------------|-------------------|------------------------------|
| `Spinner.defaults.iconName`    | `IconName`        | `'spinner-third'` | FA icon name for the spinner |
| `Spinner.defaults.prefix`      | `HoistIconPrefix` | `'fal'`           | FA icon weight/prefix        |
| `Spinner.defaults.usePng`      | `boolean`         | `false`           | Fall back to animated PNG    |

Per-instance overrides can be passed as props to `spinner()` or via `LoadingIndicator`'s `spinner`
prop, which accepts either `true` (use defaults) or a `SpinnerProps` object:

```typescript
loadingIndicator({
    bind: myTask,
    spinner: {iconName: 'circle-notch'}
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

## Registering Custom Icons

Hoist's built-in set covers most needs, but apps regularly want glyphs of their own. `Icon.register()`
is the supported way to add them: pass the FA definitions your app imports and Hoist will add them
to the FA library, install a factory for them on the `Icon` singleton, and include them in the
catalog that `IconPicker` offers to users.

It returns the generated factory, so the idiomatic pattern is to export it directly:

```typescript
// src/core/Icons.ts
import {faFileInvoiceDollar} from '@fortawesome/pro-regular-svg-icons';
import {faFileInvoiceDollar as faFileInvoiceDollarSolid} from '@fortawesome/pro-solid-svg-icons';
import {Icon} from '@xh/hoist/icon';

export const invoiceIcon = Icon.register({
    name: 'invoice',
    defs: [faFileInvoiceDollar, faFileInvoiceDollarSolid],
    keywords: ['billing', 'receivable']
});
```

That single call gives the app four equivalent ways to use the icon:

```typescript
invoiceIcon()                    // the returned factory - typed, and IDE-discoverable
invoiceIcon({prefix: 'fas'})     // the solid variant registered above
Icon.invoice()                   // installed on the Icon singleton
Icon.get('invoice')              // resolved dynamically by name
```

Registration is a one-time, app-bootstrap concern — import your `Icons.ts` from `Bootstrap.ts` (or
anywhere that runs before your first render) so the factories are installed before use.

### Registering Multiple Weights

Pass every weight your app intends to use in `defs` — they are all variants of the same icon, so
Hoist registers them together under one entry. If a caller asks for a weight that was not imported,
Hoist renders the icon's default variant rather than the blank space FA would otherwise produce.

`prefix` sets that default explicitly. Otherwise Hoist picks the best available, preferring regular,
then solid, light, thin and brands — so an app that imports only the solid variant gets solid by
default, with no need to remember a `prefix` at every call site.

### Baked-In Props

Use `props` to bake defaults into the generated factory. Callers can override any of them, and
`className` values are merged rather than replaced:

```typescript
export const approvedIcon = Icon.register({
    name: 'approved',
    iconName: 'circle-check',
    props: {intent: 'success'}
});

approvedIcon()                    // green check
approvedIcon({intent: 'primary'}) // caller wins
```

Note this example uses `iconName` rather than `defs` — an alternative form that aliases an icon
already registered with FA (typically one of Hoist's own) under an app-specific name, with no
import required.

### Overriding Hoist's Icons

Any factory can be replaced, including Hoist's own. `replace: true` is required — without it,
registering over an existing name throws, guarding against a typo silently clobbering a built-in:

```typescript
import {faArrowRotateRight} from '@fortawesome/pro-regular-svg-icons';

// Every Icon.refresh() in Hoist and the app now renders this glyph.
Icon.register({name: 'refresh', defs: [faArrowRotateRight], replace: true});
```

Hoist's ~40 semantic aliases (`refresh`, `add`, `delete`, `save`, ...) are the natural targets here,
since they exist precisely to give apps a single place to change a concept's icon.

### Registering Several at Once

```typescript
Icon.registerAll([
    {name: 'invoice', defs: [faFileInvoiceDollar]},
    {name: 'deal', defs: [faHandshake]},
    {name: 'dashboard', iconName: 'table-layout'}
]);
```

### App-Specific Names for Hoist Icons

Not every app icon needs an FA import. Plain factory functions remain the lightest way to give a
Hoist icon a domain-specific name:

```typescript
export const dealIcon = (opts: IconProps = {}) => Icon.handshake(opts);
```

Reach for `Icon.register()` when the icon is not in Hoist's set, when it should appear in an
`IconPicker`, or when it needs to be resolvable by name.

## Rendering Icons by Name

`Icon.get()` renders any registered icon from a string, which is what makes dynamic icon values -
a user's choice persisted to the server, a config-driven menu - practical:

```typescript
Icon.get('invoice')                        // custom icon, by its registered name
Icon.get('plus')                           // built-in, by FA name
Icon.get('add', {intent: 'success'})       // built-in, by semantic alias
```

Unknown names return `null` and log a warning rather than throwing, so a stale persisted value
degrades gracefully. Use `Icon.exists()` to test a name without the warning.

Supporting lookups:

| Method                        | Returns                                                        |
|-------------------------------|----------------------------------------------------------------|
| `Icon.get(name, props?)`      | Rendered icon element, or null if not registered                |
| `Icon.getFactory(name)`       | The icon's factory, or null                                     |
| `Icon.getCatalogEntry(name)`  | Metadata for one icon (display name, FA name, weights, aliases) |
| `Icon.exists(name)`           | True if the name resolves to a registered icon                  |
| `Icon.getCatalog()`           | Metadata for every known icon, sorted by display name           |

All of these accept either a factory name (`'add'`, `'invoice'`) or an FA name (`'plus'`).

A catalog entry carries each form: `iconName` is the FA name of the glyph, `name` is its primary
`Icon` factory name, and `names` holds every name that resolves to it, aliases included.

## Letting Users Pick an Icon

The desktop `IconPicker` input renders a trigger button that opens a searchable grid of icons. Its
options come straight from `Icon.getCatalog()`, so anything the app registers shows up with no
additional wiring:

```typescript
import {iconPicker} from '@xh/hoist/desktop/cmp/input';

formField({
    field: 'icon',
    item: iconPicker()
})
```

The control's value is the selected icon's FA name (`'cog'`, not `'gear'`) — render it back with
`Icon.get()`. Filtering matches display names, factory names, aliases, and any `keywords` supplied
at registration.

The FA name is used rather than the friendlier `Icon` factory name because it does not belong to
the app. Factory names do: rename a registration from `invoice` to `invoiceIcon` and every value
already persisted under the old name is dead, silently. FA names come from FontAwesome and are
unaffected by anything an app does to its own factories.

If an app does want to store its own names, `Icon.getCatalogEntry(iconName).name` converts on the
way out — but understand what that couples the stored data to.

Useful props: `compact` for dense layouts, `columns` to size the grid, `prefix` to render the grid
in a specific weight, and `icons` to restrict the offering to a curated subset. Register an icon
with `hidden: true` to keep it out of pickers while leaving it usable in code.

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

## Common Pitfalls

### Importing FA Icons Directly Instead of Using Icon Factories

The `Icon` singleton pre-registers all its icons with the FA library. Importing individual FA icons
in application code is only needed for icons *not* already in Hoist's set — and those should go
through `Icon.register()` rather than `library.add()`, so they get a factory, a name, and a place
in `IconPicker`.

```typescript
// ✅ Do: Use the Icon singleton
import {Icon} from '@xh/hoist/icon';
Icon.check()

// ❌ Don't: Import FA icons directly for icons Hoist already provides
import {faCheck} from '@fortawesome/pro-regular-svg-icons';

// ❌ Don't: Add icons to the FA library by hand - Hoist can't see them
import {library} from '@fortawesome/fontawesome-svg-core';
library.add(faFileInvoiceDollar);

// ✅ Do: Register them with Hoist
Icon.register({name: 'invoice', defs: [faFileInvoiceDollar]});
```

### Forgetting `prefix` with `Icon.icon()`

`Icon.icon()` defaults to `prefix: 'far'` (regular) and renders nothing if that weight was never
imported — a silent failure that is easy to miss with a solid-only custom icon.

Factories generated by `Icon.register()` do not have this problem: they know which weights they
were registered in and fall back to the icon's default rather than rendering blank. Prefer them
(or `Icon.get()`) over calling `Icon.icon()` with a raw name.

```typescript
// ✅ Do: Register the icon, then use the factory it returns
const invoiceIcon = Icon.register({name: 'invoice', defs: [faFileInvoiceDollarSolid]});
invoiceIcon()                                        // solid, its only registered weight

// ❌ Don't: Assume regular weight for a solid-only icon — renders blank
Icon.icon({iconName: 'file-invoice-dollar'})
```

### Using Non-FontAwesome Icon Libraries

Always use FontAwesome icons via Hoist's `Icon` singleton or an app-level `Icons.ts` of registered
icons.
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

The `'fab'` (brands) prefix is supported but brand icons are not bundled with Hoist. Import them
from `@fortawesome/free-brands-svg-icons` and register them like any other custom icon:

```typescript
import {faGithub} from '@fortawesome/free-brands-svg-icons';

Icon.register({name: 'github', defs: [faGithub]});
```

## Related Packages

- [`/cmp/spinner/`](../cmp/spinner/) — Spinner component renders an animated FA icon, configurable
  via static defaults on the `Spinner` class
- [`/desktop/cmp/input/`](../desktop/README.md#input-components-cmpinput) — `IconPicker` lets end
  users choose from the registered icon catalog
- [`/desktop/`](../desktop/README.md) — Desktop components use icons extensively in buttons,
  toolbars, menus, and grid columns
