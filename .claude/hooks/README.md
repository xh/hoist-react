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

**Leave the environment's setup script empty** (or limit it to VM-level provisioning such as
`apt install`). Setup scripts run in `/workspace`, *above* the cloned repo, so a `pnpm install`
there fails with `ERR_PNPM_NO_PKG_MANIFEST` and blocks the session from starting. Dependency
installs belong in `session-start.sh`, which runs inside the repo after Claude Code launches and
already writes the FontAwesome auth to `~/.npmrc`.

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
dl.fontawesome.com
central.sonatype.com
repo.grails.org
```

| Domain | Needed for | In default `Trusted` list? |
|--------|-----------|----------------------------|
| `npm.fontawesome.com` | FontAwesome Pro registry metadata (`pnpm install` - both repos) | **No - must add** |
| `dl.fontawesome.com` | FontAwesome Pro tarballs - the registry 307-redirects downloads here | **No - must add** |
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

## Known sandbox limitations

Verified against a live web session. These are properties of the sandbox, not of the hooks or of
Toolbox itself - allowlisting more domains will not resolve them.

### Maven Central rate-limits Gradle hard enough to block `bootRun`

Dependency resolution routinely fails with a Cloudflare rate limit:

```
> Could not GET 'https://repo.maven.apache.org/maven2/.../grails-data-hibernate5-7.2.2.jar'.
  Received status code 429 from server: Too Many Requests
```

A single 429 poisons the whole build - Gradle reports `Repository MavenRepo is disabled due to
earlier error below` and cascades into dozens of unrelated resolution failures. Both
`repo.maven.apache.org` and `repo1.maven.org` are affected (same Cloudflare edge). This is rate
limiting, not a blocked domain: a manual `curl` of the identical URL returns the artifact.

Retrying converges only slowly, since each attempt caches whatever it managed to fetch. The
reliable fix is to prefer a mirror, and `setup-toolbox.sh` installs one for you:
`repo.grails.org/grails/core` is an Artifactory virtual repo that proxies Maven Central and is
already on the allowlist above, serving the full dependency set including the Gradle plugin portal
artifacts. With the mirror in place a cold `bootRun` completes with zero 429s.

The mirror is written to `~/.gradle/init.d/central-mirror.gradle` - global Gradle config, so it
applies to any build in the session without touching project files. The hook only writes it when
`CLAUDE_CODE_REMOTE=true`, and never overwrites an existing file, so a local developer's Gradle
setup is left alone. Delete the file to opt back out.

### The GitHub API is restricted, so the home page GitHub panels stay empty

The sandbox proxy intercepts all `api.github.com` traffic and applies two independent
restrictions:

| Restriction | Effect |
|-------------|--------|
| **GraphQL blocked outright** | `POST /graphql` returns 403 - only pinned PR-review ops are served |
| **REST gated by repo scope** | Repos not attached to the session return 403, *even when public* |

The proxy also strips the caller's `Authorization` header and injects its own credential, so the
token supplied by the app is never consulted - a deliberately bogus token still succeeds against
an in-scope repo.

`GitHubService` uses GraphQL exclusively, so the Hoist Commits and Hoist Releases panels cannot
populate under any configuration, including for repos that *are* in scope:

```
GitHubService [ERROR] | Failure fetching commits for hoist-react | api.github.com/graphql : null
```

**Recommendation: set `APP_TOOLBOX_GIT_HUB_ACCESS_TOKEN=none`.** `GitHubService` skips all work
when `gitHubAccessToken` is `none`, logging a single warning instead of attempting 4 repos x 2
doomed GraphQL calls. Note that *unsetting* the variable does not achieve this - `ConfigService`
then creates the config from its BootStrap default of `realTokenGoesHere`, which is not `none`, so
the service runs anyway and merely fails faster. Measured startup cost of the GitHub refresh:

| `APP_TOOLBOX_GIT_HUB_ACCESS_TOKEN` | Behaviour | Cost |
|------------------------------------|-----------|------|
| A real PAT | 8 calls, hang, then `CancellationException` | ~182s |
| Unset | 8 calls, fast `401 Bad credentials` | ~1.1s |
| `none` | No calls at all - clean skip warning | none |

Setting it to `none` also keeps a real PAT out of the environment config, where the proxy's
credential injection means it would go unused anyway.

The Docs tab is a *separate* code path that falls back to REST, so it would fail the same way for
any repo not in the session's scope:

```
DocsService [ERROR] | Failed to resolve hoist-core content source
  | GitHub API returned 403 for https://api.github.com/repos/xh/hoist-core/tarball/develop
```

That fallback is avoided rather than fixed. `DocsService.resolveSource` prefers a **local sibling
checkout** over GitHub whenever `isLocalDevelopment` is set, so it is enough to have
`../hoist-core/docs/README.md` on disk - which is why `setup-toolbox.sh` clones `xh/hoist-core`
alongside `xh/toolbox`. Plain `git clone` from `github.com` is already allowlisted, so this needs no
API access at all. Both sources then resolve from disk, exactly as they do on a developer's laptop:

```
LocalContentSource [INFO] | Using local content source: /workspace/hoist-react
LocalContentSource [INFO] | Using local content source: /workspace/hoist-core
```

Do not reach for repo scope here. It is the more costly option and not a targeted one - the proxy
injects its own credential for every allowlisted repo, so scope granted for the app is equally
available to the agent driving the session. There is no app-only grant.

### The running app is not reachable from a browser

`localhost:3000` and `localhost:8080` live inside the session container with no port forwarding
out. Verifying UI changes means driving a headless browser from inside the session and capturing
screenshots. Chromium is pre-installed at `/opt/pw-browsers` with `PLAYWRIGHT_BROWSERS_PATH`
already pointing at it - do not run `playwright install`. The `playwright` npm package itself is
not present in either repo and needs a one-off `npm i playwright` in a scratch directory.

Note also that `webpack-dev-server` compiles silently, so grepping its log for a "compiled" line
will hang. Poll for readiness instead:

```bash
curl -s -m 30 -o /dev/null -w '%{http_code}' http://localhost:3000/app
```

Expect a first-compile time of roughly 60-90s.
