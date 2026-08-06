# Package Manager Options for Hoist React and Hoist Applications

*Prepared August 2026. Reviews the current Yarn Classic (v1) based workflow across hoist-react,
hoist-dev-utils, and consuming applications, and evaluates modern package managers (npm, Yarn
Berry v4, pnpm, Bun) as replacements. Includes results from an empirical compatibility test of the
Hoist packaging pattern under each manager.*

---

## Executive Summary

**Yarn Classic v1 is frozen software.** Its last release (1.22.22) shipped in March 2024, all
development effort moved to Yarn Berry back in 2020, and two low-severity ReDoS CVEs filed against
it in 2025 will never be fixed in a published 1.x release. It has none of the supply-chain defenses
(lifecycle-script gating, release-age cooldowns) that every modern package manager added in
response to the 2025 npm worm attacks, and when new Node releases break it (as Node 22.5.0 did),
the fix has to come from Node.

**The good news: Hoist is far less locked-in than it might appear.** The library publishes plain
TypeScript source to npm with no install scripts or package-manager-specific hooks, apps are
single-package projects (no workspaces), and the FontAwesome private registry is configured via
standard `.npmrc` entries that npm, pnpm, and Bun all read natively. The real coupling lives in one
file - `configureWebpack.js` in hoist-dev-utils - which assumes a flat, physically-hoisted
`node_modules` layout in three specific ways (detailed below).

**Empirical testing confirms:** a miniature reproduction of the Hoist packaging pattern (raw-TS
library + build-tools package + consuming app) builds successfully today, unmodified, under npm,
Bun, Yarn 4 (`nodeLinker: node-modules`), and pnpm (`nodeLinker: hoisted`). Only pnpm's default
*isolated* (symlinked) mode breaks - in two well-understood ways, both fixable entirely within
hoist-dev-utils with ~10 lines of changes (`require.resolve()` on loaders/presets +
`fs.realpathSync()` on the babel include path).

**Recommendation in brief:**

1. **Phase 0 (do regardless of any migration):** Harden `configureWebpack.js` to be
   layout-agnostic. Cheap, backward-compatible, and it unblocks *every* package manager at once -
   including for client teams who may want to adopt pnpm on their own schedule.
2. **Primary recommendation: pnpm** - start apps with `nodeLinker: hoisted` (zero build-config
   risk), move to the stricter default isolated mode once dev-utils is hardened. Best combination
   of speed, disk/bandwidth efficiency (directly relevant to the FontAwesome bandwidth cap),
   supply-chain security defaults, and ecosystem momentum.
3. **Lowest-friction alternative: Yarn Berry v4** with `nodeLinker: node-modules` - keeps the
   `yarn` muscle memory and the in-repo-bundled-binary distribution model, converts v1 lockfiles
   automatically, and keeps `resolutions` as-is. Avoid Plug'n'Play.
4. **Keep npm as the supported fallback** for corporate client environments - it already is today,
   and nothing proposed here changes that.
5. **Bun: not recommended as the standard** - impressive speed, but known proxy/corporate-network
   issues and lockfile portability quirks make it a poor default for XH's client environments.
   Fine as an individual-developer experiment on non-critical projects.

---

## 1. Current State Review

### 1.1 How the library is built and published

- `@xh/hoist` is published to npm as **raw TypeScript source**. There is no bundling or
  transpilation at publish time; `prepack` runs `tsc --build` to emit **declarations only**
  (`emitDeclarationOnly: true` → `build/types`). Consuming apps compile Hoist source themselves.
- The hoist-react repo pins **Yarn 1.22.22** three ways: the `packageManager` field in
  `package.json`, a bundled portable copy at `.yarn/releases/yarn-1.22.22.cjs`, and `.yarnrc`'s
  `yarn-path`. Toolbox's `client-app` does exactly the same.
- `resolutions` (a Yarn-originated field) pins `@types/react`, `@types/react-dom`, and `core-js`
  in both hoist-react and Toolbox.
- `.npmrc` maps the `@fortawesome` scope to `npm.fontawesome.com`; CI appends the auth token to
  `.npmrc` at build time. **FontAwesome Pro enforces a bandwidth cap**, which Toolbox CI already
  works around with hand-rolled yarn-cache-dir caching and lockfile-drift detection.
- CI (GitHub Actions) uses `yarn install --frozen-lockfile`, `yarn lint`, and `yarn audit
  --groups dependencies` with v1's severity-bitmask exit codes. Publishing itself already goes
  through **npm** (`npm publish --tag next` / `npm publish`).

### 1.2 How apps consume the library (hoist-dev-utils + webpack)

Every app checks in a small `webpack.config.js` that delegates to `configureWebpack()` from
`@xh/hoist-dev-utils`. Three design decisions in that file define the package-manager coupling:

1. **Physical-path resolution of `@xh/hoist`.** The config computes
   `hoistPath = path.resolve(basePath, 'node_modules/@xh/hoist')` and uses it for the babel-loader
   `include` array (so Hoist's raw TS gets transpiled), the polyfills entry point, and
   `CopyWebpackPlugin`. This assumes the package physically lives at that path - true for flat
   layouts, false for pnpm's default symlink layout (webpack resolves modules to their *realpath*
   under `node_modules/.pnpm/...`, so the `include` silently stops matching).

2. **Phantom (undeclared) dependency resolution by design.** hoist-dev-utils declares webpack,
   babel-loader, sass-loader, css-loader, postcss-loader, etc. as *its* dependencies, and apps get
   the whole build toolchain transitively. Loaders are referenced by bare string (`'babel-loader'`)
   and babel presets by name (`'@babel/preset-typescript'`), which only resolve from the app root
   when the layout is flat-hoisted. The existing `resolveLoader.modules` fallback pointing at
   `node_modules/@xh/hoist-dev-utils/node_modules` covers yarn/npm nested-duplicate cases but does
   not exist as a physical path under pnpm.

3. **Graceful-but-undeclared peeks at consumer packages.** `configureWebpack.js` does
   `require('@xh/hoist/package')` and `require('react')` without declaring them - both are
   try/catch-guarded and used only for version logging, so under a strict layout they degrade to
   logging `NOT_FOUND` rather than failing.

Also relevant: app `build`/`start` scripts invoke bare `webpack` / `webpack-dev-server` binaries
that arrive transitively (empirically this keeps working under every manager tested, including
strict pnpm, which links hoisted dependencies' bins into the root `node_modules/.bin`), the
`inlineHoist` dev mode aliases a sibling `../../hoist-react` checkout, and dev-utils' own README
documents a `yarn link` workflow.

### 1.3 What is genuinely Yarn-v1-specific today

| Usage | Where | Portability |
|---|---|---|
| `resolutions` field | hoist-react, Toolbox, likely all apps | Yarn 4 keeps it; pnpm reads it (also has `pnpm.overrides`); Bun supports it (top-level entries only); npm needs translation to `overrides` |
| `yarn install --frozen-lockfile` | All CI workflows | `yarn install --immutable` (v4), `pnpm install --frozen-lockfile` (auto-on in CI), `npm ci`, `bun install --frozen-lockfile` |
| `yarn upgrade` refresh flow | Toolbox snapshot CI | `yarn up` (v4), `pnpm update`, `npm update` |
| `yarn audit --groups dependencies` + bitmask exit codes | hoist-react CI | `yarn npm audit` (v4), `pnpm audit --prod`, `npm audit --omit=dev` - all with different exit-code semantics; the CI step needs rework per manager |
| `yarn cache dir` caching | Toolbox CI | Equivalent per manager; pnpm's content-addressable store is a categorical improvement here |
| `yarn link` docs | dev-utils README | Every manager has an equivalent (`yarn link`, `pnpm link`, `npm link`, `bun link`) |
| Bundled `.yarn/releases/*.cjs` + `yarn-path` | hoist-react, apps | Yarn 4 has the same model (`yarnPath`); others pin via `packageManager` field + their own installers |
| `yarn.lock` v1 | everywhere | Yarn 4 auto-converts; `pnpm import` converts; `bun install` auto-imports; npm re-resolves (`npm i --package-lock-only`) |

### 1.4 Doc posture

`docs/development-environment.md` already states XH uses "both `yarn` (v1) and `npm`" and notes
npm "has been found to work better in some corporate environments with intensive workstation
and/or network-level antimalware and other file scanning." So npm is a supported path today, and
per-project package-manager choice is already an accepted reality. Any migration is therefore
about changing the *default recommendation and XH-managed repos*, not about forcing one tool on
every client.

---

## 2. Why Move Off Yarn 1

- **Frozen upstream.** Maintenance mode since January 2020; last release 1.22.22 (March 2024); no
  formal EOL but no activity either. Registry `yarn@latest` still resolves to 1.22.22.
- **Unfixed CVEs.** CVE-2025-8262 (ReDoS in the hosted-git fragment parser, remotely triggerable)
  and a companion ReDoS in the request manager are filed against `yarn <= 1.22.22`. Low severity,
  but no fixed 1.x release exists or will exist.
- **Node compatibility is on borrowed time.** Node 22.5.0 broke `yarn install` outright (fixed on
  the *Node* side in 22.5.1, because Yarn 1 won't ship fixes). Yarn Berry shipped workarounds for
  Node 22.22.3 / 24.16.0 behavior changes in July 2026; Yarn 1 never will.
- **No modern supply-chain defenses.** Yarn 1 runs all lifecycle scripts unconditionally and has
  no release-age gate. After the September/November 2025 "Shai-Hulud" npm worm waves (~800
  packages, 132M monthly downloads compromised at peak; payload moved to `preinstall`), every
  actively-maintained manager shipped mitigations: pnpm 10 blocks dependency lifecycle scripts by
  default and added `minimumReleaseAge` (24h default in pnpm 11); Bun has default-deny scripts +
  `trustedDependencies` and a cooldown setting; Yarn 4.10 added `npmMinimalAgeGate`; npm 11.10
  added `min-release-age`. Yarn 1 users get none of this.
- **`--frozen-lockfile` is unreliable.** Long-standing v1 bug where some out-of-sync
  lockfile/manifest states pass silently - the exact failure mode a CI install check exists to
  catch. All modern equivalents (`--immutable`, `npm ci`, pnpm frozen) are strict.
- **Corepack is not a savior.** Node's TSC voted (March 2025) to stop distributing Corepack;
  Node 25+ no longer bundles it. Pinning via bundled binary (current approach, also Yarn 4's
  `yarnPath`) or per-manager installers is the durable pattern.

---

## 3. Empirical Compatibility Test

To ground this review, the Hoist packaging pattern was reproduced in miniature and actually built
under each manager (Node 22.22, August 2026): a `fake-hoist` package publishing raw `.ts` source, a
`fake-dev-utils` package declaring webpack/babel-loader/preset-typescript as its dependencies and
exporting a `configureWebpack()` mirroring the real one's resolution logic (bare-string loaders,
`path.resolve('node_modules/fake-hoist')` babel include, nested-node_modules resolveLoader
fallback, try/catch `require` peek), and an app consuming both as tarballs, importing TS-only
syntax from `fake-hoist/core` through webpack.

| Package manager | Layout | Install | `.bin/webpack` | Build |
|---|---|---|---|---|
| Yarn 1.22.22 (baseline) | flat hoisted | ✅ | ✅ | ✅ |
| npm 10.9.7 | flat hoisted | ✅ | ✅ | ✅ |
| Bun 1.3.11 (default) | flat hoisted | ✅ | ✅ | ✅ |
| Yarn 4.18.0, `nodeLinker: node-modules` | flat hoisted | ✅ | ✅ | ✅ |
| pnpm 10.33.0, `node-linker=hoisted` | flat hoisted | ✅ | ✅ | ✅ |
| **pnpm 10.33.0 (default, isolated)** | symlinked | ✅ | ✅ | ❌ **fails twice** (see below) |
| pnpm 10.33.0 (isolated) + patched dev-utils | symlinked | ✅ | ✅ | ✅ |

The two independent failures under default pnpm, each reproduced in isolation:

1. **Loader resolution:** `Module not found: Error: Can't resolve 'babel-loader'` - the bare
   string can't resolve from the app root, and the `.../hoist-dev-utils/node_modules` fallback
   path doesn't physically exist in the symlinked layout.
2. **Babel include mismatch:** with loaders fixed but the include path left as
   `path.resolve('node_modules/fake-hoist')`, the build fails with `Module parse failed:
   Unexpected token ... export interface` - webpack realpaths the module to
   `node_modules/.pnpm/...`, the `include` no longer matches, and raw TS reaches webpack
   untranspiled.

**Both fixes live entirely in dev-utils** (no app changes, and they are no-ops on flat layouts):

```js
// 1. Resolve loaders/presets/plugins from dev-utils' own dependencies:
loader: require.resolve('babel-loader'),
presets: [require.resolve('@babel/preset-typescript'), ...],

// 2. Realpath the hoist include so it matches webpack's resolved module paths:
const hoistPath = fs.realpathSync(path.resolve(basePath, 'node_modules/@xh/hoist'));
```

Notably, `node_modules/.bin/webpack` worked under *every* manager including strict pnpm - so app
`build`/`start` scripts calling bare `webpack` are not a migration blocker.

*(Test harness preserved in the session scratchpad; trivially re-creatable - three small packages
and a build script.)*

---

## 4. Options

### Option A - Status quo hardening (no migration)

Stay on Yarn 1, but: pin Node LTS versions known to work, keep `.yarn/releases` bundling, treat
`yarn audit` results with the knowledge that install-time script execution is ungated, and rely on
lockfile discipline as the only supply-chain defense.

- **Effort:** none. **Risk now:** low. **Risk trajectory:** steadily worsening (Node compat,
  unfixed CVEs, no security features). Reasonable for another year or two, not a strategy.

### Option B - npm (make the existing fallback the default)

npm 10/11 ships with Node LTS - nothing to install, maximum corporate-environment compatibility
(already the documented workaround for antimalware-heavy client sites).

- **Works today** per the empirical test; `.npmrc` FontAwesome config carries over verbatim.
- **Changes:** translate `resolutions` → `overrides` (syntax differs; simple top-level pins
  translate directly, but npm requires overrides to agree with direct-dep specs); regenerate
  lockfiles; CI: `npm ci`, `npm audit --omit=dev` (different exit semantics - simpler than v1's
  bitmask), drop the bundled `.yarn` dirs.
- **Gains:** zero-install-tooling, trusted-publishing/OIDC momentum on the registry side,
  `min-release-age` cooldown (npm 11.10+).
- **Loses:** still the slowest installer of the four; lifecycle scripts still run by default
  (only blunt `--ignore-scripts`); no content-addressable store (FontAwesome bandwidth cap still
  needs CI cache hand-tuning).
- **Verdict:** perfectly viable, minimal-surprise, but leaves speed and security wins on the table.

### Option C - Yarn Berry v4 (`nodeLinker: node-modules`)

The "same brand, modern engine" path. Yarn 4.18 (July 2026) is actively maintained with monthly
releases.

- **Works today** per the empirical test with `nodeLinker: node-modules` (a first-class,
  permanently supported mode - **avoid Plug'n'Play**, which is default and would fight the
  raw-TS/webpack-include architecture and the long tail of tooling).
- **Migration:** `yarn set version stable` per repo; v1 lockfile **auto-converts** on first
  install; `resolutions` carries over unchanged; `yarnPath` + `.yarn/releases` bundling works
  exactly like today (and sidesteps the Corepack removal entirely). **`.npmrc` is not read** -
  FontAwesome scope/auth must move to `.yarnrc.yml` (`npmScopes.fortawesome.npmRegistryServer` +
  `npmAuthToken` via env var), and CI must export the token env var instead of appending to
  `.npmrc`.
- **CI:** `--immutable` (auto-on when `CI=true`), `yarn up` replaces `yarn upgrade`, `yarn npm
  audit` replaces `yarn audit`. `actions/setup-node` `cache: yarn` supports Berry (with a known
  ordering gotcha if relying on Corepack; bundled `yarnPath` avoids it).
- **Gains:** maintained tooling, global cache (default on), `npmMinimalAgeGate` cooldown (4.10+),
  hardened CLI, familiar command surface for developers.
- **Loses/risks:** lifecycle scripts still run by default (no pnpm/Bun-style gating);
  `.yarnrc.yml` config migration touches every repo + CI; Berry's ergonomics (e.g. `yarn dlx`,
  changed `yarn global`) are a small retraining cost. Yarn's ecosystem mindshare is now clearly
  behind pnpm's.
- **Verdict:** the lowest-friction genuine upgrade. Right choice if keeping `yarn` commands and
  the bundled-binary model is valued over best-in-class security defaults.

### Option D - pnpm (recommended)

pnpm 10/11 (10.x current-stable line through 2025; 11.0 April 2026 requires Node 22+) is the
fastest-growing manager, standard across the Vite/Vue/Nuxt/Turborepo ecosystems.

- **Two-step adoption path:**
  - **Step 1 (now, zero build risk):** per-app `node-linker=hoisted` - full npm-style flat
    layout, no symlinks, everything works unchanged per the empirical test - while still getting
    the content-addressable store (files hard-linked from a global store), strict frozen installs
    in CI, `pnpm import` lockfile conversion from `yarn.lock`, lifecycle-script blocking, and
    `minimumReleaseAge`.
  - **Step 2 (after dev-utils hardening ships):** drop to the default isolated layout for full
    phantom-dependency strictness - at that point Hoist apps get the strictest, most
    correct-by-construction layout in the ecosystem.
- **FontAwesome bandwidth cap:** this is where pnpm is categorically better. Every unique file
  version downloads once per machine, ever - branch switches, `node_modules` wipes, and second
  checkouts re-link from the store with zero registry traffic, and version bumps fetch only
  changed files. Toolbox CI's hand-rolled cache-restore-keys workaround becomes largely moot
  (`cache: 'pnpm'` in setup-node, or `pnpm/action-setup` with built-in caching).
- **Supply-chain:** the strongest, most battle-tested defaults - dependency lifecycle scripts
  blocked since v10 (Jan 2025) with an `onlyBuiltDependencies` allowlist, `minimumReleaseAge`
  cooldown (24h default in v11), plus `pnpm audit --prod` for the CI audit gate.
- **Config:** `.npmrc` FontAwesome scope/auth lines carry over verbatim (auth/registry settings
  are exactly what pnpm keeps in `.npmrc`; its other settings live in `pnpm-workspace.yaml`).
  `resolutions` is read for compatibility; `pnpm.overrides` is the native form. One caveat: since
  v10.34.2 pnpm won't expand `${ENV_VAR}` credentials from a *repo-local* `.npmrc` - CI should
  write the token to the user-level `.npmrc` or keep appending the literal token as today.
- **Costs:** developers install pnpm (standalone binary, `npm i -g pnpm`, or Corepack while it
  lasts; pin via `packageManager` field); retrain `yarn X` → `pnpm X` (near-1:1 command surface);
  isolated mode (step 2) may surface *app-level* phantom dependencies that were silently working
  via hoisting - each is a one-line `pnpm add` fix and arguably a latent bug found; the
  `inlineHoist` sibling-checkout workflow needs a validation pass.
- **Verdict:** best long-term destination on every axis XH cares about - speed, disk, the
  FontAwesome cap, security defaults, momentum - with a genuinely low-risk on-ramp via
  `node-linker=hoisted`.

### Option E - Bun (install-only)

Bun 1.3.x's `bun install` is a legitimate standalone package manager (hoisted layout by default
for single-package projects; text `bun.lock` since 1.2 with auto-import of `yarn.lock` v1;
`.npmrc` scoped-registry + authToken support; default-deny lifecycle scripts; passed the empirical
test unmodified) and is the fastest installer by a wide margin (~4-5x pnpm in third-party
benchmarks).

- **Why not as the standard:** recurring corporate-proxy failures (install hangs behind proxies,
  no `.npmrc` proxy support, Windows proxy-detection bugs) are disqualifying for XH's
  client-site profile - the exact environments where the docs already steer people to npm;
  `bun.lock` embeds absolute registry URLs (non-portable across mirror/proxy setups);
  `resolutions` support is top-level-only; `minimumReleaseAge` has a known lockfile-bypass bug;
  and adoption as a PM (distinct from the runtime) remains a small fraction of pnpm's.
- **Verdict:** fine for individual developers to try locally (it coexists harmlessly - the repo's
  lockfile remains the source of truth); not the recommended team standard in 2026.

---

## 5. Cross-Cutting Work (applies to any option)

1. **Harden `configureWebpack.js` (hoist-dev-utils) - highest-leverage single change:**
   - `require.resolve()` every loader string and babel preset/plugin name (dev-utils declares
     them all, so this is correct under every layout, including the current one).
   - `fs.realpathSync()` the computed `@xh/hoist` path (and `babelIncludePaths` entries, e.g.
     Toolbox's `@xh/package-template`) before use in `include`/entry/CopyWebpackPlugin. Wrap in a
     safe fallback for paths that don't exist yet (inline mode).
   - Keep the existing `resolveLoader` fallback for back-compat; it becomes redundant once
     loaders are `require.resolve`d.
   - Consider declaring `@xh/hoist` and `react` as optional peerDependencies (or keep try/catch
     - it degrades gracefully; strict-pnpm builds would just log `NOT_FOUND`, and in practice
     pnpm's internal hoisting usually still resolves them).
   - Result: **hoist-dev-utils becomes package-manager-agnostic**, and client teams can adopt any
     manager without waiting on XH. Ship in dev-utils v14; note in hoist-react
     version-compatibility docs.
2. **`resolutions` audit:** the standard trio (`@types/react`, `@types/react-dom`, `core-js`) are
   simple top-level pins that translate to every manager's override mechanism. Document the
   per-manager equivalent in the app upgrade notes.
3. **CI recipes:** provide reference GitHub Actions snippets per manager (install pinning, cache,
   frozen install, audit gate with correct exit-code handling, FontAwesome token injection - note
   Yarn 4 moves it out of `.npmrc`, pnpm keeps it there).
4. **Docs:** update `development-environment.md` (currently yarn-v1/npm-centric),
   `build-and-deploy-app.md` (`yarn build` examples), dev-utils README (`yarn link` workflow), and
   Toolbox README/scripts (`yarn start`, `startWithHoist` chains) for the chosen default.
5. **`inlineHoist` validation:** the sibling-checkout dev mode aliases physical paths in both
   trees; test the chosen manager on both sides (and mixed combinations during transition).
6. **Node/Corepack:** don't build the plan around Corepack (removed from Node 25+). Pin via
   `packageManager` + each manager's own install story (Yarn 4: bundled `yarnPath`; pnpm:
   standalone binary/global install; npm: bundled with Node).

---

## 6. Recommended Path

**Phase 0 - now, no commitment (dev-utils v14):** ship the `require.resolve` +
`fs.realpathSync` hardening above. Zero behavior change on current flat layouts (verified
empirically - the patched config builds identically under yarn1/npm), and it removes the only hard
technical blocker for every modern manager.

**Phase 1 - pilot (1-2 sprints later):** convert Toolbox's `client-app` to pnpm with
`node-linker=hoisted`: `pnpm import` (converts `yarn.lock`), swap CI to `pnpm/action-setup` +
frozen install + `pnpm audit --prod`, adopt `minimumReleaseAge` and the lifecycle-script
allowlist. Convert the hoist-react repo itself the same way (it's just lint/tsc/MCP tooling - the
lowest-risk repo of all). Run both for a full release cycle, including the `inlineHoist` workflow
and a FontAwesome-bandwidth observation.

**Phase 2 - roll out:** update docs and CI templates; recommend pnpm-hoisted as the XH default
for new apps; migrate XH-managed apps opportunistically; keep npm as the documented fallback for
constrained client environments (unchanged from today). Client teams migrate on their own
schedule - nothing in Phase 0-1 forces them.

**Phase 3 - optional strictness:** once dev-utils v14 is the ecosystem floor, flip pnpm to its
default isolated layout per-app for phantom-dependency protection, fixing any app-level undeclared
imports it surfaces.

**Decision checkpoint:** if, during Phase 1, the team finds pnpm's ergonomics or client-site
compatibility unsatisfying, Yarn Berry v4 (`nodeLinker: node-modules`, bundled `yarnPath`) is the
fallback recommendation - same Phase 0 prerequisite, smaller retraining, weaker security defaults.

### Implementation branches (August 2026)

The Phase 0 and Phase 1 changes are staged on the following branches for review:

- **hoist-dev-utils** `claude/layout-agnostic-module-resolution` - the Phase 0
  `configureWebpack.js` hardening (validated end-to-end under pnpm isolated + yarn 1 flat).
- **hoist-react** `claude/build-package-manager-review-7r98m6` (this branch) - pnpm conversion of
  the repo's own tooling: `packageManager` pin, `pnpm-workspace.yaml` (hoisted linker +
  `minimumReleaseAge` with `@xh/*` excluded), scripts, CI workflows, docs.
- **toolbox** `claude/pnpm-migration` - pnpm conversion of `client-app` and its CI workflows.

**Required follow-up before merging the hoist-react and toolbox branches:** `pnpm-lock.yaml` could
not be generated in the sandbox where these branches were prepared, because `pnpm import` needs
FontAwesome Pro registry credentials to fetch package metadata. A developer (or CI) with the FA
token must run `pnpm import && pnpm install` in each repo (hoist-react root; toolbox
`client-app/`), verify, commit the resulting `pnpm-lock.yaml`, and delete `yarn.lock` in the same
commit. `yarn.lock` has been intentionally left in place on both branches as the version-pinning
source for that import. CI installs (`--frozen-lockfile`) will fail until this is done.

---

## Appendix A - Key facts and sources

- **Yarn 1:** frozen since Jan 2020; last release 1.22.22 (Mar 2024); CVE-2025-8262
  (GHSA-9xhp-f235-5v37) + companion ReDoS, no fixed 1.x release; Node 22.5.0 breakage
  (nodejs/node#53943). Not registry-deprecated; no formal EOL.
- **Yarn Berry:** v4.18.0 (2026-07-29), ~monthly minors; v1 lockfile auto-conversion;
  `nodeLinker: node-modules` first-class; `.npmrc` not read (use `npmScopes`/`npmAuthToken`);
  `resolutions` supported; `--immutable` auto-on in CI; `npmMinimalAgeGate` since 4.10;
  `yarnPath` bundling ≈ current model. (yarnpkg.com/migration/guide)
- **pnpm:** 10.x stable line (10.33 tested here); 11.0 (Apr 2026, Node 22+, `minimumReleaseAge`
  default 24h, `pnpm ci`); lifecycle scripts blocked by default since 10.0 (Jan 2025);
  `pnpm import` converts `yarn.lock`; `.npmrc` = auth/registry settings, other config in
  `pnpm-workspace.yaml`; `node-linker=hoisted` = npm-style flat layout while keeping the
  content-addressable store; repo-local `.npmrc` `${ENV}` credential expansion removed in
  10.34.2. (pnpm.io/settings/node-modules, pnpm.io/blog/releases/11.0)
- **Bun:** 1.3.x; text `bun.lock` + auto-import of yarn.lock v1 (since 1.2); `.npmrc` scoped
  registry/token support (since 1.1.18); isolated linker available (1.2.19+), hoisted default for
  single-package projects; default-deny lifecycle scripts + `trustedDependencies`; known
  corporate-proxy issue cluster (oven-sh/bun #24035, #25541, #29646 et al.); `resolutions`
  top-level-only (#6608).
- **npm:** 10.9.x on Node 22 LTS, 11.x on Node 24 LTS; `overrides` semantics differ from
  `resolutions` (npm/rfcs 0036); `min-release-age` since 11.10 (Feb 2026); registry-side
  trusted-publishing/OIDC push post-Shai-Hulud.
- **Corepack:** removed from Node 25+ (TSC vote Mar 2025); still bundled (experimental) in
  Node 22/24 for their lifetimes.
- **Supply-chain context:** Sept 2025 chalk/debug phishing compromise; Sept + Nov 2025
  Shai-Hulud worm waves (~800 packages, preinstall payloads, CISA alert 2025-09-23) - the
  motivating events for script-gating and cooldown features.
- **webpack/pnpm mechanics:** webpack `resolve.symlinks` defaults true → realpathed module paths
  under `.pnpm` (webpack#1643); bare-string loader resolution under pnpm (webpack#5087); fixes =
  `require.resolve` + realpath'd includes (the approach CRA/react-scripts and webpack-encore
  took).

## Appendix B - Install-speed and file-count measurements

Measured on the same miniature reproduction (156 packages, Node 22.22, Linux, fast local storage -
ratios transfer to slower filesystems, absolute times do not; a real Hoist app resolves ~1,240
packages, so scale absolute numbers up accordingly).

**Warm-cache full reinstall** (`node_modules` deleted, package-manager cache/store intact - the
"branch switch / fresh checkout / broken node_modules" case):

| Manager | Time | vs yarn1 |
|---|---|---|
| Bun 1.3 | 0.1s | ~27x faster |
| pnpm (hoisted or isolated) | 0.9-1.0s | ~3x faster |
| Yarn 4 (node-modules linker) | 2.6s | ~parity |
| npm 10 | 2.5s | ~parity |
| Yarn 1.22.22 | 2.7s | baseline |

**No-op install** (lockfile unchanged, `node_modules` present - what Toolbox's `start` script runs
on every launch): all managers 0.3-0.7s; Bun ~0.03s. Not a differentiator.

Cold-cache (first-ever download) times are network-bound and broadly similar; the differentiator
there is that pnpm's store makes *re*-downloads never happen again across projects and branches
(relevant to the FontAwesome bandwidth cap).

**Project file counts for the identical dependency tree** - the key result for environments where
filesystem operations are expensive (VDI, roaming profiles, aggressive antivirus):

| Layout | Files in project | Notes |
|---|---|---|
| yarn1 / npm / Bun / Yarn 4 (nm) / pnpm hoisted | ~5,728 | flat copies |
| pnpm isolated | ~5,775 + 400 symlinks | **hard links are still directory entries** - same file count, but file *content* is not copied (metadata-only links when store and project share a filesystem; silently falls back to copying across volumes) |
| **Yarn 4 Plug'n'Play** | **166** (157 zips + `.pnp.cjs`) | **~34x fewer files** - no `node_modules` at all; but **breaks the current Hoist build** (verified): dev-utils' physical `node_modules/@xh/hoist` paths and raw-TS babel include don't exist under PnP, and native-binary deps (e.g. `sass-embedded`) get "unplugged" to disk anyway. Adopting PnP is a real dev-utils redesign, not the Phase-0 hardening. |

Implications for slow/virtualized filesystems: pnpm reduces bytes written (links, not copies) and
eliminates repeat registry downloads, but does *not* reduce the number of filesystem entries an
antivirus scan or file enumeration must walk. Only PnP does that. If VDI file-count pain becomes a
priority driver, PnP is the endgame option to design toward - after the Phase-0/pnpm work, and
priced as its own project. Practical VDI mitigations that apply today regardless of manager:
point the package-manager store/cache at a local non-roaming volume (noting the pnpm same-volume
hardlink constraint) and exclude it from real-time AV scanning where policy allows.

## Appendix C - Empirical test summary

Miniature reproduction (Node 22.22.2, Linux, Aug 2026): `fake-hoist` (raw `.ts` source +
`static/polyfills.js`, mirrors `@xh/hoist` packaging), `fake-dev-utils` (declares
webpack ~5.107 / babel-loader ~10.1 / preset-typescript as deps; `configureWebpack()` clone of the
real resolution logic), app importing TS-only syntax (`interface`, `implements`, `private`,
type annotations) from `fake-hoist/core` through the generated config, installed from packed
tarballs. Verification = successful webpack compile + confirmed absence of raw TS in the bundle.
Results as tabulated in §3; the two isolated-pnpm failures were reproduced independently
(loaders-only fix → `Module parse failed ... export interface`; full fix → clean build).
