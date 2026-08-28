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

Configure the web environment used for hoist-react sessions as follows.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `FONTAWESOME_NPM_AUTH_TOKEN` | Auth token for the FontAwesome Pro npm registry. Required for `pnpm install`. |

### Network policy domain allowlist

If using a restricted network policy, allow these domains (`registry.npmjs.org` is allowed by
default and need not be listed):

| Domain | Needed for |
|--------|-----------|
| `npm.fontawesome.com` | FontAwesome Pro packages (`pnpm install` - both repos) |
| `services.gradle.org` | Gradle wrapper distribution (Toolbox server) |
| `plugins.gradle.org` | Gradle plugin portal, e.g. the dotenv plugin (Toolbox server) |
| `repo1.maven.org` | Maven Central artifacts (Toolbox server) |
| `repo.grails.org` | Grails framework artifacts (Toolbox server) |
| `central.sonatype.com` | Maven snapshots, e.g. `hoist-core` SNAPSHOT builds (Toolbox server) |

The first four rows in the Toolbox group are only needed if sessions will run the full Toolbox
app; `npm.fontawesome.com` alone is enough for lint/typecheck of hoist-react itself.
