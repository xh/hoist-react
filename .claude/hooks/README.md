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

### Setup script

Setup scripts run as root in `/workspace`, *above* the cloned repo, once per environment cache
build (the filesystem is then snapshotted and reused by later sessions). Do **not** run
`pnpm install` here - there is no `package.json` in `/workspace`, so it fails with
`ERR_PNPM_NO_PKG_MANIFEST` and blocks every session from starting. hoist-react's dependency
install belongs in `session-start.sh`.

Use the setup script for two things that make Toolbox runs fast and reliable:

1. **Maven Central mirror.** The sandbox's shared egress IPs get rate-limited by Maven Central
   (Cloudflare `HTTP 429`) on cold dependency bursts, and a single 429 makes Gradle disable the
   repository for the rest of the build. `repo.grails.org/grails/core` is an Artifactory virtual
   repo that proxies Central and is already on the allowlist below; a Gradle init script puts it
   first. This is sandbox-only and does not touch either repo's `build.gradle`.
2. **Pre-clone Toolbox and warm the Gradle cache** so per-session `bootRun` skips the downloads
   entirely. `setup-toolbox.sh` reuses a checkout it finds at `/workspace/toolbox`.

Recommended setup script (must exit 0 and finish in under ~5 minutes; every step is non-fatal):

```bash
#!/bin/bash
# hoist-react cloud environment setup. Runs once per environment cache build, as root, in /workspace.

# 1. Prefer repo.grails.org (proxies Maven Central) to avoid Central's 429 rate limits in the sandbox.
mkdir -p ~/.gradle/init.d
cat > ~/.gradle/init.d/central-mirror.gradle <<'EOF'
def MIRROR = 'https://repo.grails.org/grails/core'
allprojects { p ->
    [p.buildscript.repositories, p.repositories].each { handler ->
        def m = handler.maven { url = MIRROR }
        handler.remove(m)
        handler.addFirst(m)
    }
}
EOF

# 2. Pre-clone Toolbox and warm the Gradle dependency cache. `assemble` resolves the full runtime
#    classpath; if it pushes the script past the 5-minute limit, fall back to `dependencies`.
if [ ! -d /workspace/toolbox/.git ]; then
    git clone --depth 1 https://github.com/xh/toolbox /workspace/toolbox || true
fi
if [ -d /workspace/toolbox ]; then
    (cd /workspace/toolbox && ./gradlew --no-daemon -q assemble -x test) \
        || echo 'setup: Gradle warm-up failed (non-fatal); bootRun will download on first run.'
fi
```

The cache is rebuilt whenever the setup script or the allowlist changes, and roughly weekly, so
the pre-cloned Toolbox can be up to a week stale. Sessions should `git -C ../toolbox pull` before
relying on it, or `setup-toolbox.sh` can be taught to do so.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `FONTAWESOME_NPM_AUTH_TOKEN` | Auth token for the FontAwesome Pro npm registry. Required for `pnpm install`. |
| `APP_TOOLBOX_JS_LICENSES` | Optional. Hoist instance-config override for Toolbox's `jsLicenses` app config, e.g. `{"agGrid":"<key>"}`. Without it the fresh H2 database starts unlicensed and ag-Grid shows its watermark. Only needed if sessions run Toolbox. |

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
