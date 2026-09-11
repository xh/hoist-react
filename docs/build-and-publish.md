# Build and Publish

Hoist-React uses [GitHub Actions](https://docs.github.com/en/actions) for continuous integration
and npm publishing. All workflow definitions live in `.github/workflows/`.

## CI (`ci.yml`)

Runs automatically on pushes and pull requests to `develop`. Includes two independent jobs:

- **Lint** — installs dependencies via `pnpm install --frozen-lockfile`, then runs `pnpm lint` and
  `pnpm typecheck` as distinct steps. Also gates on a clean production-dependency audit
  (`pnpm audit --prod --audit-level high`). Skipped on scheduled runs.
- **CodeQL** — runs GitHub's CodeQL security analysis for JavaScript/TypeScript. Runs on push, PR,
  and on a weekly schedule.

## Deploy Snapshot (`deploySnapshot.yml`)

Publishes a SNAPSHOT build to npm on every push to `develop`. Can also be triggered manually via
`workflow_dispatch` with an optional version override.

- The version is sourced from `package.json` (e.g. `82.0.0-SNAPSHOT`). A timestamp is appended
  automatically to ensure each snapshot is unique.
- Snapshots are published with the `next` dist-tag so they don't affect `latest`.
- Linting runs as part of this workflow — a lint failure will block the publish.
- Uses `concurrency` with `cancel-in-progress: true` to avoid redundant builds when multiple pushes
  land in quick succession.
- After publishing, polls `npm view @xh/hoist@next` until the registry resolves the `next` dist-tag
  to the version just published (10 minute limit). Publishing returns once npm accepts the tarball,
  but the new version is not guaranteed to be resolvable at that moment.
- Finally fires a `repository_dispatch` (`hoist-react-snapshot`) to `xh/toolbox`, which rebuilds
  and redeploys Toolbox against the new snapshot. The dispatch authenticates as the org-owned
  **XH Build Bot** GitHub App via a short-lived installation token minted by
  `actions/create-github-app-token`, scoped to the toolbox repo with Contents: write. Toolbox runs
  triggered this way show `xh-build-bot[bot]` as the actor.

## Deploy Release (`deployRelease.yml`)

Publishes a numbered release to npm. **Manually triggered** from the `master` branch via
`workflow_dispatch`. Requires two inputs:

- **Release Version** — a semver string (e.g. `82.0.0`). Must be exactly one increment (major,
  minor, or patch) from the latest existing release tag.
- **Is Hotfix** — check when releasing a hotfix to a version other than the latest. Requires the
  workflow to be run from a branch other than `master` or `develop`.

The workflow validates the version strictly (semver format, no duplicate tags, correct increment
relative to existing tags), then:

1. Sets the version in `package.json`.
2. Publishes to npm (with the default `latest` dist-tag).
3. Creates and pushes a `vX.Y.Z` git tag.
4. Creates a GitHub Release with auto-generated notes. Hotfixes are marked as not-latest so they
   don't supplant the most recent mainline release.

## Unpublish Snapshots (`unpublishSnapshots.yml`)

Removes old SNAPSHOT pre-release versions from npm. **Manually triggered** via `workflow_dispatch`.
This is run periodically to clean up snapshot versions from older major releases (typically ~N-2 and
below), keeping the npm registry tidy without affecting current or recent development lines.

Inputs:

- **Mode** — `dry-run` (default) previews what would be removed; `execute` actually unpublishes.
- **Max Version** — unpublish SNAPSHOTs with a major version at or below this value (required).
- **Delay** — seconds between unpublish calls for rate limiting (default: 1).
- **Package** — package name (default: `@xh/hoist`).

## Dependabot (`dependabot.yml`)

Automated dependency update PRs are configured for both GitHub Actions and npm dependencies, each
checking weekly.

## Required Secrets and Variables

| Name | Type | Used By | Purpose |
|------|------|---------|---------|
| `FONTAWESOME_PACKAGE_TOKEN` | Secret | CI, Snapshot, Release | Auth token for the Font Awesome Pro npm registry (`npm.fontawesome.com`) |
| `NPM_TOKEN` | Secret | Snapshot, Release, Unpublish | Auth token for publishing to the npm public registry |
| `XH_BUILD_BOT_PRIVATE_KEY` | Secret | Snapshot | Private key for the XH Build Bot GitHub App, used to mint the Toolbox dispatch token |
| `XH_BUILD_BOT_CLIENT_ID` | Variable | Snapshot | Client ID of the XH Build Bot GitHub App |
| `GITHUB_TOKEN` | Secret | Release | Provided automatically by GitHub Actions; used for `gh release create` |

The XH Build Bot app is registered under the xh GitHub org and installed org-wide. Its credentials
(app ID, client ID, and private key) are kept in the team 1Password vault under
"GitHub App: XH Build Bot". To rotate, generate a new private key on the app's settings page, update
the 1Password item and the `XH_BUILD_BOT_PRIVATE_KEY` secret here and in hoist-core, then revoke the
old key.

Font Awesome Pro packages are sourced from the official Font Awesome registry at
`npm.fontawesome.com` (configured in `.npmrc`). The `FONTAWESOME_PACKAGE_TOKEN` secret is appended
to `.npmrc` at build time rather than being checked into source control.
