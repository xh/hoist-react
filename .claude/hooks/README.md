# Claude Code on the Web - Session Hooks

Scripts supporting [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web)
sessions on this repo. They no-op in local sessions.

* **`session-start.sh`** - registered as a `SessionStart` hook in `.claude/settings.json`. Writes
  FontAwesome Pro registry auth to `~/.npmrc` and runs `pnpm install`, so `pnpm lint` and
  `pnpm typecheck` work out of the box. Degrades gracefully (with a warning) if the environment
  is missing the configuration below.
* **`setup-toolbox.sh`** - on-demand (not run at session start). Clones `xh/toolbox` as a sibling
  of this checkout and writes a `toolbox/.env` for a fully self-contained run - transient H2
  in-memory database and form-based login, no MySQL or OAuth required. Enables live verification
  of hoist-react changes via `./gradlew bootRun` + `pnpm startWithHoist`.

## Required environment configuration (claude.ai/code)

Configure the web environment used for hoist-react sessions as follows. On Team/Enterprise plans,
an org Owner should create this once as a **shared environment** (claude.ai/admin-settings →
Cloud environments) so every developer gets the same variables, network policy, and setup script
without configuring anything themselves. Environment variables, network policy, and setup scripts
cannot be checked into the repo - only the hooks and settings in `.claude/` are.

Recommended setup script for the environment (runs once, cached across sessions):

```bash
echo "//npm.fontawesome.com/:_authToken=${FONTAWESOME_NPM_AUTH_TOKEN}" >> ~/.npmrc
pnpm install
```

`session-start.sh` remains as a per-session fallback; its `pnpm install` is quick when deps are
already installed by the setup script.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `FONTAWESOME_NPM_AUTH_TOKEN` | Auth token for the FontAwesome Pro npm registry. Required for `pnpm install`. |

### Network policy domain allowlist

The environment's default `Trusted` network policy allows common package registries but not
everything these scripts need. In the environment dialog, set **Network access** to `Custom`,
check **Also include default list of common package managers**, and list the missing domains one
per line in **Allowed domains** (see
[Cloud environments - Allow specific domains](https://code.claude.com/docs/en/cloud-environments#allow-specific-domains)):

```
npm.fontawesome.com
central.sonatype.com
repo.grails.org
```

| Domain | Needed for | In default `Trusted` list? |
|--------|-----------|----------------------------|
| `npm.fontawesome.com` | FontAwesome Pro packages (`pnpm install` - both repos) | **No - must add** |
| `central.sonatype.com` | Maven snapshots, e.g. `hoist-core` SNAPSHOT builds (Toolbox server) | **No - must add** |
| `repo.grails.org` | Grails framework artifacts (Toolbox server) | **No - must add** |
| `registry.npmjs.org` | npm packages (`pnpm install` - both repos) | Yes |
| `github.com` | `git clone` of `xh/toolbox` (`setup-toolbox.sh`) | Yes |
| `services.gradle.org` | Gradle wrapper distribution (Toolbox server) | Yes |
| `plugins.gradle.org` | Gradle plugin portal, e.g. the dotenv plugin (Toolbox server) | Yes |
| `repo1.maven.org` | Maven Central artifacts (Toolbox server) | Yes |

The Toolbox server rows are only needed if sessions will run the full Toolbox app;
`npm.fontawesome.com` alone is enough for lint/typecheck of hoist-react itself.

Note that a blocked domain may surface as an HTTP error from the sandbox proxy rather than a
connection failure, in which case `session-start.sh`'s reachability probe passes and the
subsequent `pnpm install` fails instead - the hook still exits cleanly with a warning.
