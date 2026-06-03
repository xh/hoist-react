#!/bin/bash
#
# SessionStart hook for Claude Code on the web.
#
# Authenticates the private @fortawesome (FontAwesome Pro) npm registry and installs
# dependencies, so node_modules is available for `tsc`, ESLint, and Stylelint during
# remote sessions. The FontAwesome token is read ONLY from the FONTAWESOME_NPM_AUTH_TOKEN
# environment variable (configured as a secret in the environment settings) - it is never
# stored in the repository.
#
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment - local sessions manage
# their own dependencies.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Write the FontAwesome registry auth token to ~/.npmrc (merged with the repo's committed
# .npmrc, which sets the @fortawesome registry). Idempotent: any prior managed line is
# stripped before the current token is appended.
npmrc="$HOME/.npmrc"
touch "$npmrc"
grep -v '//npm.fontawesome.com/:_authToken=' "$npmrc" > "$npmrc.tmp" 2>/dev/null || true
mv "$npmrc.tmp" "$npmrc"

if [ -n "${FONTAWESOME_NPM_AUTH_TOKEN:-}" ]; then
  echo "//npm.fontawesome.com/:_authToken=${FONTAWESOME_NPM_AUTH_TOKEN}" >> "$npmrc"
  yarn install
else
  echo "WARNING: FONTAWESOME_NPM_AUTH_TOKEN is not set." >&2
  echo "         The private @fortawesome registry will return 401 and dependency install" >&2
  echo "         will fail. Add the token as a secret named FONTAWESOME_NPM_AUTH_TOKEN in" >&2
  echo "         the environment settings to enable installation." >&2
  # Attempt install anyway (auth may be configured elsewhere), but do not fail the session.
  yarn install || echo "WARNING: 'yarn install' failed - continuing without full node_modules." >&2
fi
