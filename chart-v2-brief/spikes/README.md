# Chart V2 spikes

One shared, library-neutral JSON spec rendered by three libraries. Plain browser JS with UMD
builds, so every page opens straight from the file system.

## Run

```bash
pnpm start        # install, vendor UMD builds into ./vendor, serve on :4173 and open index.html
```

Or run `pnpm install && pnpm vendor` once, then open `index.html`, `gallery.html` or
`control.html` directly. `vendor/` is not committed.

## Layout

| Path | What |
|---|---|
| `shared/specs.js` | The seven shared chart specs (pure JSON) |
| `shared/data.js` | Seeded synthetic data as named sources with typed fields |
| `shared/transforms.js` | Library-neutral transforms: rebase, returns, drawdown, SMA, histogram, normal fit |
| `shared/theme.js` | Hoist light and dark tokens, CVD-validated palette, formatters |
| `shared/harness.js` | Gallery harness and adapter contract |
| `shared/control.js` | Control-surface demo: one action API, two drivers, validation |
| `adapters/*.js` | One adapter per library: spec to native config |
| `scripts/shoot.mjs` | Headless Chrome runner: timings, console errors, screenshots |
| `scripts/control-check.mjs` | Drives the control demo through its agent tool calls |
| `scripts/bundle-size.mjs` | Tree-shaken min + gzip bundle sizes per library |
| `scripts/vendor.mjs` | Copies UMD builds from `node_modules` into `vendor/` (gitignored) |
| `portable/` | The `Portable<T>` type and its type-check assertions (`../notes/portable-spec-pattern.md` 2.3) |
| `stress-*.json`, `gallery-results.json`, `bundle-sizes.json` | Raw measured results cited in `../findings/07-spike-results.md` |
| `shots/` | Screenshots from the runs |

## Reproduce the measurements

```bash
node scripts/shoot.mjs --chart stress --hover --json stress-run1.json          # default paths
node scripts/shoot.mjs --chart stress --libs highcharts --perf gpu --hover      # Highcharts Boost
node scripts/shoot.mjs --chart stress --points 1000000                          # 4 x 1M points
node scripts/shoot.mjs --theme dark,light --out shots/final                     # all charts, both themes
node scripts/bundle-size.mjs
```

AG Charts runs without a key, so it shows a trial watermark.
