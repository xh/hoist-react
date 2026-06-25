# Build and Publish

Hoist-React uses [GitHub Actions](https://docs.github.com/en/actions) for continuous integration
and npm publishing. All workflow definitions live in `.github/workflows/`.

## CI (`ci.yml`)

Runs automatically on pushes and pull requests to `develop`. Includes two independent jobs:

- **Lint** — installs dependencies via `yarn install --frozen-lockfile` and runs `yarn lint`.
  Skipped on scheduled runs.
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

## Required Secrets

| Secret | Used By | Purpose |
|--------|---------|---------|
| `FONTAWESOME_PACKAGE_TOKEN` | CI, Snapshot, Release | Auth token for the Font Awesome Pro npm registry (`npm.fontawesome.com`) |
| `NPM_TOKEN` | Snapshot, Release, Unpublish | Auth token for publishing to the npm public registry |
| `GITHUB_TOKEN` | Release | Provided automatically by GitHub Actions; used for `gh release create` |

Font Awesome Pro packages are sourced from the official Font Awesome registry at
`npm.fontawesome.com` (configured in `.npmrc`). The `FONTAWESOME_PACKAGE_TOKEN` secret is appended
to `.npmrc` at build time rather than being checked into source control.
