#!/bin/bash
#
# SessionStart hook for Claude Code on the web. Installs hoist-react dependencies so that lint
# and typecheck (and Toolbox verification runs - see setup-toolbox.sh) work in remote sessions.
# No-ops in local sessions, where developers manage their own installs.
#
# Also safe to run by hand. In a multi-repository web session (hoist-react + toolbox) the session
# root is /workspace, above both checkouts, so Claude Code does not load either repo's
# .claude/settings.json and this hook never fires automatically. Run it yourself in that case:
#
#   /workspace/hoist-react/.claude/hooks/session-start.sh
#
# Requires configuration on the claude.ai/code environment - see README.md in this directory.
set -euo pipefail

# Only relevant on Claude Code on the web.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
    exit 0
fi

# Resolve the hoist-react checkout from this script's own location. CLAUDE_PROJECT_DIR is only
# set when Claude Code runs the hook, and in a multi-repo session it would point at /workspace.
HOIST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOOLBOX_CLIENT_DIR="$(dirname "$HOIST_DIR")/toolbox/client-app"
cd "$HOIST_DIR"

# Auth for the FontAwesome Pro registry (npm.fontawesome.com), required by `pnpm install`.
# Warn and exit 0 (rather than fail the session) if not configured - the session is still
# useful for read-only work, it just cannot install deps.
if [ -z "${FONTAWESOME_NPM_AUTH_TOKEN:-}" ]; then
    echo 'session-start: WARNING - FONTAWESOME_NPM_AUTH_TOKEN is not set; skipping pnpm install.' >&2
    echo 'session-start: Add it as an environment variable on your claude.ai/code environment.' >&2
    exit 0
fi
# Replace (not just append) the auth line - a stale or empty line left by e.g. an environment
# setup script would otherwise shadow the real token.
if [ -f ~/.npmrc ]; then
    grep -v 'npm.fontawesome.com/:_authToken' ~/.npmrc > ~/.npmrc.tmp || true
    mv ~/.npmrc.tmp ~/.npmrc
fi
echo "//npm.fontawesome.com/:_authToken=${FONTAWESOME_NPM_AUTH_TOKEN}" >> ~/.npmrc

# Quick reachability probe - the environment's network policy must allow both the registry
# (npm.fontawesome.com) and the download host it redirects tarballs to (dl.fontawesome.com).
# An HTTP status of 000 means the connection itself failed (typically a policy denial); any
# real HTTP response means the host is reachable.
for host in npm.fontawesome.com dl.fontawesome.com; do
    status=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "https://$host/" || true)
    if [ "$status" = "000" ]; then
        echo "session-start: WARNING - $host is unreachable; skipping pnpm install." >&2
        echo 'session-start: Allow the domain in the environment network policy (see .claude/hooks/README.md).' >&2
        exit 0
    fi
done

pnpm install --frozen-lockfile || {
    echo 'session-start: WARNING - pnpm install failed; lint/typecheck will not run until deps install.' >&2
    exit 0
}
echo 'session-start: hoist-react dependencies installed.'

# A sibling Toolbox checkout (multi-repo session, or one created by setup-toolbox.sh) needs its
# client deps for the same reason. Non-fatal - Toolbox's own hook covers Toolbox-rooted sessions.
if [ -f "$TOOLBOX_CLIENT_DIR/package.json" ]; then
    (cd "$TOOLBOX_CLIENT_DIR" && pnpm install --frozen-lockfile) \
        && echo 'session-start: toolbox client dependencies installed.' \
        || echo 'session-start: WARNING - toolbox client pnpm install failed (non-fatal).' >&2
fi
