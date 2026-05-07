# golden-layout (forked)

Forked from [`golden-layout` 1.5.9](https://www.npmjs.com/package/golden-layout/v/1.5.9),
which is effectively unmaintained. Used only by Hoist's desktop `DashContainer`.

## Why fork

- Upstream is dead. v2.x is a rewrite that dropped React support — not a viable upgrade.
- We already maintained three monkey-patches against its internals (React 18 `createRoot`,
  touch-drag, root drop-zone offset). Owning the source is cheaper than tracking diverged
  upstream.
- It's the sole reason `jquery` was in our dependency tree.
- We use a narrow slice — no popouts, no config minification, no IE quirks.

See [#4336](https://github.com/xh/hoist-react/issues/4336) for full rationale.

## Layout

```
index.js          public entry; applies Hoist patches and re-exports GoldenLayout
styles.scss       Hoist style overrides
impl/
  js/             forked source, ESM (originally globals + IIFE)
    index.js      barrel; imports source files in dependency order, default-exports LayoutManager
    ns.js         the shared `lm` namespace, exported as ESM
    LayoutManager.js, controls/, items/, utils/, container/, errors/, config/
  css/            base + light theme
  golden-layout.d.ts   upstream types (patched as we go)
```

## Status

- **Phase 0 (vendored):** copied `src/js`, `dist/goldenlayout.js`, types, CSS into `impl/`.
- **Phase 1 (deleted dead code):** removed `BrowserPopout`, `ConfigMinifier`, popout/sub-window
  plumbing, cross-window event propagation, related config and labels (~933 LOC).
- **`golden-layout` npm dep dropped** from `package.json`. `jquery` remains until Phase 2 finishes.
- **Phase 2 (in progress):** porting ~230 jQuery call sites to DOM APIs, then dropping `jquery`.

The three monkey-patches in `index.js` will be folded into the source files as Phase 2 progresses.
