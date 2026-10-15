# Icon

Hoist's icon system provides a factory-based API to render [FontAwesome](https://fontawesome.com/)
(FA) Pro icons in an application. Applications do not import FA icon definitions in each file that
uses them. They use the `Icon` singleton, a central catalog of 200+ direct icon factories and ~40
semantic aliases. Hoist registers all of them with the FA library in four weight variants (regular,
solid, light, thin). Apps add their own icons to that catalog with `Icon.register()`.

## Overview

Icons are a core visual element in Hoist UIs. They appear in buttons, toolbars, grid columns,
menus, tabs, tree nodes, toast messages, and more. The `Icon` singleton gives standard access to a
curated set of FA Pro icons and provides:

- **Named factory methods**: 200+ direct factories (`Icon.check()`, `Icon.gear()`, `Icon.user()`,
  etc.) plus ~40 semantic aliases
- **Semantic aliases**: `Icon.add()`, `Icon.edit()`, `Icon.delete()`, `Icon.search()`,
  `Icon.save()`, and `Icon.refresh()` delegate to specific visual icons, which gives apps a
  consistent vocabulary
- **Weight variants**: switch between regular (default), solid, light, or thin with the `prefix`
  prop
- **Intent coloring**: apply `primary`, `success`, `warning`, or `danger` intent for consistent
  semantic styling
- **Size control**: FA size values from `2xs` through `10x`
- **FA animation props**: Hoist passes `spin`, `pulse`, `beat`, `bounce`, `rotation`, `flip`, and
  other FontAwesome props to the underlying `FontAwesomeIcon` component
- **Fixed-width default**: all icons get the `fa-fw` (fixed-width) and `xh-icon` CSS classes
  automatically, which keeps spacing consistent in menus, buttons, and toolbars
- **HTML mode**: render as raw SVG strings for non-React contexts, for example Highcharts tooltips
- **File-type icons**: `Icon.fileIcon({filename})` maps extensions to matching icons
- **Custom icon registration**: `Icon.register()` imports an app's own FA icons, installs
  factories for them, and makes them available to name lookup and user-facing pickers
- **Name-based lookup**: `Icon.get(name)` renders any registered icon from a dynamic string, for
  example a user's choice persisted to the server

## Architecture

```
icon/
├── Icon.ts              # Icon singleton with all factory methods + IconProps type
├── XHLogo.tsx           # XH corporate logo SVG component (theme-aware)
├── index.ts             # Barrel exports + FA library registration (all icon imports)
└── impl/
    ├── IconCmp.ts       # React component wrapping FontAwesomeIcon
    ├── IconHtml.ts      # Raw SVG string renderer for asHtml mode
    └── IconCatalog.ts   # Catalog of all known icons - built-ins plus app registrations
```

The `index.ts` barrel file imports all FontAwesome icon definitions from the
`@fortawesome/pro-regular-svg-icons`, `@fortawesome/pro-solid-svg-icons`,
`@fortawesome/pro-light-svg-icons`, and `@fortawesome/pro-thin-svg-icons` packages, and registers
them with the FA `library`. Because this is the single registration point, every icon that Hoist's
factory methods use is available at runtime.

Each factory method on `Icon` delegates to `Icon.icon()`. Depending on the `asHtml` flag, it creates
either an `IconCmp` (a React component wrapping FA's `FontAwesomeIcon`) or an `IconHtml` (a raw SVG
string).

`IconCatalog` keeps a catalog of every icon Hoist knows about, keyed by FA name. It catalogs
Hoist's own icons lazily, by calling each factory in `Icon.ts` and reading the icon it renders. The
catalog therefore stays in sync with that file automatically. Apps add to it with
`Icon.register()`. The catalog powers `Icon.get()`, `Icon.getCatalog()`, and the desktop
`IconPicker` component.

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

Because `IconProps` extends FontAwesome's `FontAwesomeIconProps`, you can pass FA animation and
transform props directly:

```typescript
Icon.spinner({spin: true})       // spinning loading indicator
Icon.bullhorn({shake: true})     // attention-grabbing announcement
Icon.star({rotation: 90})        // rotated 90 degrees
Icon.warning({bounce: true})     // bouncing warning
```

### Spinner Component

The `Spinner` component (`cmp/spinner/`) renders an animated FA icon for `Mask` and
`LoadingIndicator`. Hoist-owned CSS applies the rotation animation (`@keyframes xh-spin` on
`.xh-spinner`), not FA's animation props. The spinner therefore still works when the OS-level
`prefers-reduced-motion` preference is on, which makes FA disable all its animations. Hoist's CSS
also keeps performance predictable in remote desktop environments such as Citrix.

Spinner ships with several pre-registered icon choices, each in all four weight variants:
`spinnerThird`, `circleNotch`, and `spinnerScale`. Apps can configure the default icon and prefix
globally with `Spinner.defaults`, typically in the app's `Bootstrap.ts`:

```typescript
import {Spinner} from '@xh/hoist/cmp/spinner';

// Override icon and/or weight globally
Spinner.defaults.icon = 'circleNotch';
Spinner.defaults.prefix = 'far';
```

`icon` takes a name that the icon catalog resolves, either an `Icon` name or an FA name, so an icon
registered with `Icon.register()` works too. It also takes an icon element, such as
`Icon.circleNotch()`. A name the catalog does not know renders Hoist's default spinner.

| Default                        | Type                       | Default          | Description                  |
|--------------------------------|----------------------------|------------------|------------------------------|
| `Spinner.defaults.icon`        | `string \| ReactElement`   | `'spinnerThird'` | Icon name or element         |
| `Spinner.defaults.prefix`      | `HoistIconPrefix`          | `'fal'`          | FA icon weight/prefix        |
| `Spinner.defaults.usePng`      | `boolean`                  | `false`          | Fall back to animated PNG    |

To override the defaults for one instance, pass props to `spinner()` or use the `spinner` prop of
`LoadingIndicator`. That prop accepts either `true` (use defaults) or a `SpinnerProps` object:

```typescript
loadingIndicator({
    bind: myTask,
    spinner: {icon: 'circleNotch'}
})
```

Hoist keeps a legacy PNG fallback for environments where even CSS animations can cause problems.
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

Use `Icon.placeholder()` to create an empty element that uses the same space as an icon. It helps
align items in menus or lists where only some items have icons:

```typescript
menuItem({icon: Icon.check(), text: 'Option A'}),
menuItem({icon: Icon.placeholder(), text: 'Option B'})  // aligned with A
```

## Registering Custom Icons

Hoist's built-in set covers most needs, but apps often want glyphs of their own. `Icon.register()`
is the supported way to add them. Pass the FA definitions that your app imports. Hoist adds them to
the FA library and installs a factory for them on the `Icon` singleton. It also includes them in the
catalog that `IconPicker` offers to users.

`Icon.register()` returns the generated factory, so the usual pattern is to export it directly:

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

That single call gives the app three ways to use the icon:

```typescript
invoiceIcon()                    // the returned factory - typed, and IDE-discoverable
invoiceIcon({prefix: 'fas'})     // the solid variant registered above
Icon.get('invoice')              // resolved dynamically by name
```

Hoist also installs the factory on the `Icon` singleton at runtime. TypeScript does not know about
names added this way, so `Icon.invoice()` will not compile in app code. Use the returned factory
instead. Runtime installation matters when you replace a built-in (see below), because Hoist's own
calls to that factory then render the app's icon.

Registration is a one-time task at app startup. Import your `Icons.ts` from `Bootstrap.ts`, or any
module that runs before the first render, so the factories exist before use.

### Registering Multiple Weights

Pass in `defs` every weight that your app intends to use. They are all variants of the same icon,
so Hoist registers them together under one entry. If a caller asks for a weight that the app did
not import, Hoist renders the icon's default variant. FA would otherwise render blank space.

`prefix` sets that default explicitly. Otherwise Hoist picks the best available weight, in this
order: regular, solid, light, thin, brands. An app that imports only the solid variant therefore
gets solid by default, with no `prefix` needed at each call site.

### Baked-In Props

Use `props` to bake defaults into the generated factory. Callers can override any of them, and
Hoist merges `className` values instead of replacing them:

```typescript
export const approvedIcon = Icon.register({
    name: 'approved',
    faName: 'circle-check',
    props: {intent: 'success'}
});

approvedIcon()                    // green check
approvedIcon({intent: 'primary'}) // caller wins
```

This example uses `faName` in place of `defs`. That form gives an app-specific name to an icon
already registered with FA, typically one of Hoist's own, with no import required.

A glyph that is already in the catalog keeps its own name and label, and the registered name becomes
an alias for it. Baked-in props apply only to the factory that the registration returns, which
`Icon.get('approved')` also resolves to. A lookup by FA name, such as `Icon.get('circle-check')`,
renders the plain glyph, as does `IconPicker` by default. The registration's `keywords` make the
glyph easier to find in a picker, and its `displayName` labels the registered name wherever that
name is offered on its own, as with `valueField: 'name'` (see below).

### Overriding Hoist's Icons

Pass `replace: true` to replace any factory, including Hoist's own:

```typescript
import {faArrowRotateRight} from '@fortawesome/pro-regular-svg-icons';

// Every Icon.refresh() in Hoist and the app now renders this glyph.
Icon.register({name: 'refresh', defs: [faArrowRotateRight], replace: true});
```

Hoist's ~40 semantic aliases (`refresh`, `add`, `delete`, `save`, ...) are the natural targets
here. They exist to give apps one place to change the icon for a concept.

Without `replace: true`, a registration under a name that already exists on `Icon` replaces nothing.
Hoist keeps the existing icon and logs a console warning. The factory that the call returns still
renders the new icon, but `Icon[name]()` and `Icon.get(name)` keep the existing one. A name
conflict therefore never stops an app from starting, and a typo cannot silently replace a built-in.
This also covers a later Hoist release that adds a built-in with the same name as an app icon. The
app still starts, and the warning tells the developer to rename the app's icon.

Registering the same name and glyph again, for example when hot reload re-runs the module that
registers your icons, updates the registration without a warning. Names of `Icon`'s own methods,
such as `get` or `register`, always throw.

### Registering Several at Once

```typescript
Icon.registerAll([
    {name: 'invoice', defs: [faFileInvoiceDollar]},
    {name: 'deal', defs: [faHandshake]},
    {name: 'dashboard', faName: 'table-layout'}
]);
```

### App-Specific Names for Hoist Icons

Not every app icon needs an FA import. Plain factory functions remain the lightest way to give a
Hoist icon a domain-specific name:

```typescript
export const dealIcon = (opts: IconProps = {}) => Icon.handshake(opts);
```

Use `Icon.register()` when the icon:

- is not in Hoist's set
- should appear in an `IconPicker`
- needs to resolve by name

## Rendering Icons by Name

`Icon.get()` renders any registered icon from a string. That makes dynamic icon values practical,
for example a user's choice persisted to the server, or a config-driven menu:

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
| `Icon.getDisplayName(name)`   | User-facing label for a name, including an alias                |
| `Icon.getCatalog()`           | Metadata for every known icon, sorted by display name           |

All of these accept either a factory name (`'add'`, `'invoice'`) or an FA name (`'plus'`).

Use `Icon.getCatalog()` to list every available icon, such as for a gallery or a custom chooser.
Do not iterate the keys of `Icon` itself - it also holds the lookup and registration methods above,
which are not icon factories.

A catalog entry carries each form of name:

- `faName`: the FA name of the glyph
- `name`: its primary `Icon` factory name
- `names`: every name that resolves to it, aliases included

## Letting Users Pick an Icon

The desktop `IconPicker` input renders a trigger button that opens a searchable grid of icons. Its
options come straight from `Icon.getCatalog()`, so anything the app registers appears with no
additional wiring:

```typescript
import {iconPicker} from '@xh/hoist/desktop/cmp/input';

formField({
    field: 'icon',
    item: iconPicker()
})
```

Render the value back with `Icon.get()`. Filtering matches display names, factory names, aliases,
and any `keywords` supplied at registration. The grid renders only the rows in view, so apps can
catalog thousands of icons (e.g. whole FA packs registered by `faName`) without slowing the picker.

### Choosing What the Picker Stores

`valueField` sets which form of name the picker emits:

| `valueField`         | Emits                                       | Stored values follow...              |
|----------------------|---------------------------------------------|--------------------------------------|
| `'faName'` default   | FA name of the glyph (`'cog'`)              | the glyph - nothing the app does to its own names changes them |
| `'name'`             | `Icon` name (`'gear'`, `'businessRule'`)    | the name - re-point it, and every stored value shows the new glyph |

Use the default for an open-ended "pick any icon" field. The value names exactly the glyph that the
user chose, so a later rename in the app cannot orphan it.

Use `'name'` when the app defines semantic icons and wants to change them later in one place. For
example, an app stores an icon for each business rule. It registers `businessRule` and
`complianceRule`, and offers them with `icons`:

```typescript
Icon.registerAll([
    {name: 'businessRule', faName: 'briefcase', displayName: 'Business rule'},
    {name: 'complianceRule', faName: 'balance-scale', displayName: 'Compliance rule'}
]);

iconPicker({bind: 'ruleIcon', valueField: 'name', icons: ['businessRule', 'complianceRule']})
```

Each rule stores `'businessRule'` or `'complianceRule'`. To change the icon for every business rule,
the app points `businessRule` at another glyph with `replace: true`. The cost is that the app owns
these names. If it renames a registration, values already stored under the old name stop
resolving.

With `'name'`, every name in `icons` is its own option, labelled with its registered `displayName`,
even when several names share one glyph. Either way, the picker shows a stored value of the other
form as selected, so switching `valueField` does not orphan existing values.

Useful props:

- `compact` for dense layouts
- `columns` to size the grid
- `prefix` to render the grid in a specific weight
- `icons` to restrict the offering to a curated subset

Register an icon with `hideFromPicker: true` to keep it out of pickers while leaving it usable in
code. A picker still offers it when it is listed in `icons`.

## IconProps Reference

| Prop        | Type                 | Description                                                                                                    |
|-------------|----------------------|----------------------------------------------------------------------------------------------------------------|
| `faName`    | `IconName`           | FA icon name (for example `'check'`, `'cog'`). Required for `Icon.icon()`, provided automatically by named factories |
| `iconName`  | `IconName`           | Deprecated - use `faName`. Will be removed in v91                                                              |
| `prefix`    | `HoistIconPrefix`    | Weight variant: `'far'` (regular, default), `'fas'` (solid), `'fal'` (light), `'fat'` (thin), `'fab'` (brands) |
| `intent`    | `Intent`             | Applies `xh-intent-{intent}` CSS class for semantic coloring                                                   |
| `title`     | `string`             | Tooltip text rendered as SVG `<title>`                                                                         |
| `size`      | `string`             | FA size: `'2xs'` through `'10x'`                                                                               |
| `asHtml`    | `boolean`            | Return raw SVG string instead of React element                                                                 |
| `className` | `string`             | Additional CSS class(es)                                                                                       |
| `omit`      | `Thunkable<boolean>` | Skip rendering this icon when true                                                                             |

## Common Pitfalls

### Importing FA Icons Directly Instead of Using Icon Factories

The `Icon` singleton pre-registers all its icons with the FA library. Application code needs to
import individual FA icons only for icons *not* already in Hoist's set. Those should go through
`Icon.register()`, not `library.add()`, so they get a factory, a name, and a place in `IconPicker`.

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

`Icon.icon()` defaults to `prefix: 'far'` (regular) and renders nothing if the app never imported
that weight. This failure is silent and easy to miss with a solid-only custom icon.

Factories that `Icon.register()` generates do not have this problem. They know their registered
weights, and fall back to the icon's default instead of rendering blank. Prefer them, or
`Icon.get()`, over calling `Icon.icon()` with a raw name.

```typescript
// ✅ Do: Register the icon, then use the factory it returns
const invoiceIcon = Icon.register({name: 'invoice', defs: [faFileInvoiceDollarSolid]});
invoiceIcon()                                        // solid, its only registered weight

// ❌ Don't: Assume regular weight for a solid-only icon — renders blank
Icon.icon({faName: 'file-invoice-dollar'})
```

### Using Non-FontAwesome Icon Libraries

Always use FontAwesome icons, through Hoist's `Icon` singleton or an app-level `Icons.ts` of
registered icons. Do not take icons from other libraries, such as Blueprint or Material icons,
unless the app explicitly says to. Mixing icon libraries breaks the consistent visual language that
FA provides. FontAwesome Pro's catalog is large enough to cover almost any use case. If you cannot
find the right icon in Hoist's set, register a custom one from the FA Pro packages. Do not use a
different library.

### Referencing Icons From the Wrong FontAwesome Version

FontAwesome updates often and adds new icons in each release. When you search the FA site for an
icon, use the version picker to show only the version that Hoist depends on. Check
`@fortawesome/pro-regular-svg-icons` in `package.json` for that version. An import of an icon that
exists only in a newer FA version fails at build time. Hoist tries to keep its FA dependency up to
date, but always check the version before you add a new icon.

* [FA icon search (latest version)](https://fontawesome.com/search?ip=classic&s=regular)
* [FA icon search (v7)](https://fontawesome.com/v7/search?ip=classic&s=regular)

### Using Brand Icons Without Registration

Hoist supports the `'fab'` (brands) prefix but does not bundle brand icons. Import them from
`@fortawesome/free-brands-svg-icons` and register them like any other custom icon:

```typescript
import {faGithub} from '@fortawesome/free-brands-svg-icons';

Icon.register({name: 'github', defs: [faGithub]});
```

## Related Packages

- [`/cmp/spinner/`](../cmp/spinner/): the Spinner component renders an animated FA icon, which
  apps configure with static defaults on the `Spinner` class
- [`/desktop/cmp/input/`](../desktop/README.md#input-components-cmpinput): `IconPicker` lets end
  users choose from the registered icon catalog
- [`/desktop/`](../desktop/README.md): desktop components use icons widely in buttons, toolbars,
  menus, and grid columns
