#!/bin/bash
#
# SessionStart hook for Claude Code on the web. Installs hoist-react dependencies so that lint
# and typecheck (and Toolbox verification runs - see setup-toolbox.sh) work in remote sessions.
# No-ops in local sessions, where developers manage their own installs.
#
# Requires configuration on the claude.ai/code environment - see README.md in this directory.
set -euo pipefail

# Only relevant on Claude Code on the web.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
    exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Auth for the FontAwesome Pro registry (npm.fontawesome.com), required by `pnpm install`.
# Warn and exit 0 (rather than fail the session) if not configured - the session is still
# useful for read-only work, it just cannot install deps.
if [ -z "${FONTAWESOME_NPM_AUTH_TOKEN:-}" ]; then
    echo 'session-start: WARNING - FONTAWESOME_NPM_AUTH_TOKEN is not set; skipping pnpm install.' >&2
    echo 'session-start: Add it as an environment variable on your claude.ai/code environment.' >&2
    exit 0
fi
if ! grep -qs 'npm.fontawesome.com/:_authToken' ~/.npmrc; then
    echo "//npm.fontawesome.com/:_authToken=${FONTAWESOME_NPM_AUTH_TOKEN}" >> ~/.npmrc
fi

# Quick reachability probe - the environment's network policy must allow npm.fontawesome.com.
# An HTTP status of 000 means the connection itself failed (typically a policy denial); any
# real HTTP response means the registry is reachable.
status=$(curl -s -m 10 -o /dev/null -w '%{http_code}' https://npm.fontawesome.com/ || true)
if [ "$status" = "000" ]; then
    echo 'session-start: WARNING - npm.fontawesome.com is unreachable; skipping pnpm install.' >&2
    echo 'session-start: Allow the domain in the environment network policy (see .claude/hooks/README.md).' >&2
    exit 0
fi

pnpm install || {
    echo 'session-start: WARNING - pnpm install failed; lint/typecheck will not run until deps install.' >&2
    exit 0
}

echo 'session-start: hoist-react dependencies installed.'
