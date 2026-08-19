# Blueprint

Hoist's desktop UI builds on [BlueprintJS](https://blueprintjs.com/) - `@blueprintjs/core` and
`@blueprintjs/datetime` are direct dependencies of hoist-react, and many desktop components
(inputs, menus, popovers, dialogs, toasts, hotkeys, the date picker) render Blueprint components
under the hood.

This kit package is the **single integration point** for Blueprint within Hoist. Both framework
code and applications should import Blueprint components from `@xh/hoist/kit/blueprint` - never
from `@blueprintjs/*` packages directly. This keeps Hoist's wrappers, styling overrides, and
build-time optimizations (see Icons below) in play, and leaves Hoist free to adjust its Blueprint
integration without app-level churn.

## Contents

| File             | Purpose                                                                                          |
|------------------|--------------------------------------------------------------------------------------------------|
| `index.ts`       | Global setup (Blueprint CSS imports, `FocusStyleManager`), selected re-exports, `blueprintProvider` |
| `Wrappers.ts`    | Re-exported Blueprint components and their element factories, with `Dialog` and `Popover` wrapped  |
| `Dialog.ts`      | `dialogBody` / `dialogFooter` / `dialogFooterActions` - Hoist components emitting Blueprint dialog CSS classes |
| `ContextMenu.ts` | `showContextMenu()` wrapper around Blueprint's imperative context menu                             |
| `styles.scss`    | Hoist overrides of Blueprint styles (popover/overlay transitions, theming)                         |

Notable wrapper behavior:

- **`Dialog`** disables Blueprint's fade/scale-in transitions by default. This is the standard
  base for custom modal dialogs in Hoist apps - see `desktop/README.md#dialogs` for the pattern.
- **`Popover`** renders Blueprint's `PopoverNext` (Floating UI based, React 19 compatible) while
  preserving the legacy `PopoverProps` API - `position`, `modifiers`, `minimal`, and `boundary`
  are mapped for callers automatically.

## Icons

Blueprint ships its own set of ~700 SVG icons in `@blueprintjs/icons`. **Hoist does not use them
for application icons** - Hoist's `Icon` API (see `/icon`) is built on FontAwesome. Blueprint
icons appear only as internals of Blueprint components: the date picker's month/year carets and
nav chevrons, submenu carets on `MenuItem`, close buttons on toasts and dialogs, and similar.

### Build-time icon stubbing (and how not to regress it)

Left alone, `@blueprintjs/icons` lands its **entire icon set in the initial bundle** of every
app: the package entry statically re-exports all per-icon React components and (via `allPaths`)
every icon path module - roughly 0.5MB gzipped of dead weight, since Hoist's Blueprint usage
touches only a couple dozen icons.

`@xh/hoist-dev-utils` (v14.0.1+) neutralizes this at build time. Its `configureWebpack()`
generates stub modules that re-export only a whitelisted icon set - see
`generateBlueprintIconStubs()` and the `requiredBlueprintIcons` list in that repo's
`configureWebpack.js` - and swaps them in for the icon package's entry point and path barrels via
`NormalModuleReplacementPlugin`. Apps can opt out (restoring the full set) with the
`loadAllBlueprintJsIcons` webpack env flag.

The whitelist must cover every icon the Blueprint components used by Hoist actually render. Two
failure modes when it does not:

- **Named imports fail loud.** Blueprint internals import most icons as named per-icon components
  (e.g. `CaretRightIcon`). A missing whitelist entry fails the app build with a named-export
  error - annoying, but impossible to miss.
- **String names fail soft.** Icons rendered by name (`<Icon icon="chevron-left"/>`) resolve
  through a lazy loader against the stubbed path barrels. A missing entry renders a *blank icon*
  with no error - easy to miss.

### Checklist when upgrading Blueprint in hoist-react

A Blueprint upgrade can change which icons its components use, so re-verify the whitelist:

1. Rescan Blueprint's icon usage (from an app checkout with the new versions installed):

    ```bash
    # Named icon-component imports - missing entries fail app builds loudly:
    grep -rh 'from "@blueprintjs/icons"' \
        node_modules/@blueprintjs/{core,datetime,select}/lib/esm --include="*.js" | sort -u

    # String-name icon usages - missing entries render blank, with no error:
    grep -rhoE 'icon: "[a-z-]+"' \
        node_modules/@blueprintjs/{core,datetime,select}/lib/esm --include="*.js" | sort -u
    ```

    Note `@blueprintjs/select` is included - it is a transitive dependency of datetime and its
    components (with their `SearchIcon`) are in the bundle graph even though Hoist does not use
    it directly.

2. Compare the results against `requiredBlueprintIcons` in hoist-dev-utils, and PR any additions
   there.

3. Build and run Toolbox and spot-check the built-in icons: date picker nav chevrons and
   month/year carets, a menu with a submenu (e.g. ViewManager view groups), toast and dialog
   close buttons.

If Blueprint restructures `@blueprintjs/icons` again (entry point or `generated/` layout), the
module replacements in dev-utils will stop matching and the full icon set will silently return to
app bundles. A quick tripwire: production-build Toolbox and confirm icon modules beyond the
whitelist are absent, e.g. `grep -c "generated/components/airplane" build/*.js` should find
nothing.

## Versioning

hoist-react pins its Blueprint dependencies and upgrades them deliberately with each major
release as needed - see `package.json` and the hoist-react CHANGELOG. Apps should not declare
their own `@blueprintjs/*` dependencies: a second copy of Blueprint breaks styling and overlay
management, and any direct usage bypasses the wrappers and optimizations described above.
