# golden-layout (forked)

Forked from [`golden-layout` 1.5.9](https://www.npmjs.com/package/golden-layout/v/1.5.9),
which is effectively unmaintained. Used only by Hoist's desktop `DashContainer`.

## Why fork

- Upstream is dead. v2.x is a rewrite that dropped React support — not a viable upgrade.
- We were already maintaining three monkey-patches against its internals (React 18 `createRoot`,
  touch-drag, root drop-zone offset). Owning the source is cheaper than tracking a diverged
  upstream.
- It was the sole reason `jquery` was in our dependency tree.
- We use a narrow slice — no popouts, no config minification, no IE quirks.

See [#4336](https://github.com/xh/hoist-react/issues/4336) for full rationale.

## Layout

```
index.js          public entry; loads CSS and re-exports GoldenLayout
styles.scss       Hoist style overrides
impl/
  js/             forked source as ES modules
    index.js      barrel; imports source files in dependency order, default-exports LayoutManager
    ns.js         the shared `lm` namespace, exported as ESM
    LayoutManager.js, controls/, items/, utils/, container/, errors/, config/
  css/            base + light theme
  golden-layout.d.ts   ambient types for `import ... from 'golden-layout'`
```

## What changed from upstream

- **Vendored**: source moved into `impl/`; the npm package is gone.
- **Deleted**: `BrowserPopout`, `ConfigMinifier`, popout/sub-window plumbing, cross-window event
  propagation, related config keys and labels.
- **No jQuery**: every call site ported to native DOM. `jquery` is gone from `dependencies`
  and `resolutions`.
- **Patches folded in**: React 18 `createRoot` mount/unmount in `ReactComponentHandler`,
  touch-drag fixes in `DragListener` (incl. tap-and-hold contextmenu), and the offset-aware
  `_$createRootItemAreas` (upstream PR #457). All live in the source now.
