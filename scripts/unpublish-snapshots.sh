#!/usr/bin/env bash
#
# unpublish-snapshots.sh
#
# Unpublishes SNAPSHOT pre-release versions of @xh/hoist from npm.
# Defaults to DRY RUN mode — pass --execute to actually unpublish.
#
# Usage:
#   ./unpublish-snapshots.sh                    # dry run, all SNAPSHOTs <= v79
#   ./unpublish-snapshots.sh --max-version 75   # dry run, SNAPSHOTs <= v75
#   ./unpublish-snapshots.sh --execute          # actually unpublish
#   ./unpublish-snapshots.sh --execute --delay 2  # unpublish with 2s delay between calls
#   ./unpublish-snapshots.sh --execute --token NPM_TOKEN  # use automation token (bypasses 2FA)
#
set -euo pipefail

##############################################################################
# Config / Defaults
##############################################################################
PACKAGE="@xh/hoist"
MAX_MAJOR_VERSION=79
DELAY_SECONDS=1
DRY_RUN=true
NPM_TOKEN="${NPM_TOKEN:-}"
LOG_FILE="unpublish-$(date +%Y%m%d-%H%M%S).log"

##############################################################################
# Parse args
##############################################################################
while [[ $# -gt 0 ]]; do
    case $1 in
        --execute)
            DRY_RUN=false
            shift
            ;;
        --max-version)
            MAX_MAJOR_VERSION="$2"
            shift 2
            ;;
        --delay)
            DELAY_SECONDS="$2"
            shift 2
            ;;
        --package)
            PACKAGE="$2"
            shift 2
            ;;
        --token)
            NPM_TOKEN="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--execute] [--max-version N] [--delay N] [--package PKG] [--token TOKEN]"
            echo ""
            echo "Options:"
            echo "  --execute          Actually unpublish (default is dry run)"
            echo "  --max-version N    Unpublish SNAPSHOTs with major version <= N (default: 79)"
            echo "  --delay N          Seconds to wait between unpublish calls (default: 1)"
            echo "  --package PKG      Package name (default: @xh/hoist)"
            echo "  --token TOKEN      npm automation/granular access token (bypasses 2FA)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

##############################################################################
# Preflight checks
##############################################################################
if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 is required but not found on PATH."
    exit 1
fi

echo "============================================="
echo " npm SNAPSHOT Unpublisher"
echo "============================================="
echo ""
echo "Package:          $PACKAGE"
echo "Max major version: $MAX_MAJOR_VERSION"
echo "Delay:            ${DELAY_SECONDS}s"
echo "Mode:             $(if $DRY_RUN; then echo 'DRY RUN'; else echo '*** LIVE — WILL UNPUBLISH ***'; fi)"
echo "Auth:             $(if [[ -n "$NPM_TOKEN" ]]; then echo 'automation token'; else echo 'npm login session'; fi)"
echo "Log file:         $LOG_FILE"
echo ""

# Set up auth — token takes precedence over interactive login
# Write a project-level .npmrc so the token is used for all npm commands.
if [[ -n "$NPM_TOKEN" ]]; then
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc_unpublish
    NPM_AUTH_ARGS=("--userconfig" ".npmrc_unpublish")
    trap 'rm -f .npmrc_unpublish' EXIT
else
    NPM_AUTH_ARGS=()
fi

# Check npm auth
if ! npm whoami "${NPM_AUTH_ARGS[@]}" 2>/dev/null; then
    echo "ERROR: Not authenticated to npm."
    echo "  Either run 'npm login' first, or pass --token <automation-token>."
    exit 1
fi
echo "Authenticated as: $(npm whoami "${NPM_AUTH_ARGS[@]}" 2>/dev/null)"
echo ""

##############################################################################
# Fetch all versions
##############################################################################
echo "Fetching all versions of $PACKAGE..."
ALL_VERSIONS_JSON=$(npm view "$PACKAGE" versions --json "${NPM_AUTH_ARGS[@]}" 2>/dev/null)

# Filter to SNAPSHOT versions at or below the max major version
TARGETS=$(echo "$ALL_VERSIONS_JSON" | MAX_MAJOR_VERSION="$MAX_MAJOR_VERSION" python3 -c "
import json, sys, os
max_ver = int(os.environ['MAX_MAJOR_VERSION'])
versions = json.load(sys.stdin)
targets = []
for v in versions:
    if 'SNAPSHOT' not in v.upper():
        continue
    try:
        major = int(v.split('.')[0])
    except ValueError:
        continue
    if major <= max_ver:
        targets.append(v)
print('\n'.join(targets))
")

TOTAL=$(echo "$TARGETS" | grep -c . || true)

if [[ "$TOTAL" -eq 0 ]]; then
    echo "No SNAPSHOT versions found matching criteria. Nothing to do."
    exit 0
fi

echo "Found $TOTAL SNAPSHOT versions to unpublish."
echo ""

# Show summary by major version
echo "$TARGETS" | python3 -c "
import sys
from collections import Counter
lines = [l.strip() for l in sys.stdin if l.strip()]
counts = Counter(int(v.split('.')[0]) for v in lines)
for k in sorted(counts):
    print(f'  v{k}: {counts[k]} versions')
"
echo ""

##############################################################################
# Confirmation (only in live mode)
##############################################################################
if ! $DRY_RUN; then
    echo "WARNING: This will permanently unpublish $TOTAL versions."
    echo ""
    read -r -p "Type 'yes' to proceed: " CONFIRM
    if [[ "$CONFIRM" != "yes" ]]; then
        echo "Aborted."
        exit 1
    fi
    echo ""
fi

##############################################################################
# Unpublish loop
##############################################################################
SUCCESS=0
FAILED=0
SKIPPED=0
COUNT=0

echo "--- Starting at $(date) ---" | tee -a "$LOG_FILE"

while IFS= read -r VERSION; do
    [[ -z "$VERSION" ]] && continue
    COUNT=$((COUNT + 1))
    FULL="${PACKAGE}@${VERSION}"

    if $DRY_RUN; then
        echo "[$COUNT/$TOTAL] DRY RUN: would unpublish $FULL"
        echo "DRY_RUN $FULL" >> "$LOG_FILE"
        SUCCESS=$((SUCCESS + 1))
    else
        printf "[%d/%d] Unpublishing %s ... " "$COUNT" "$TOTAL" "$FULL"

        if OUTPUT=$(npm unpublish "$FULL" --force "${NPM_AUTH_ARGS[@]}" 2>&1); then
            echo "OK"
            echo "OK $FULL" >> "$LOG_FILE"
            SUCCESS=$((SUCCESS + 1))
        else
            # Check for common non-fatal errors
            if echo "$OUTPUT" | grep -qi "404\|not found\|not in.* registry"; then
                echo "SKIP (already gone)"
                echo "SKIP $FULL — already unpublished" >> "$LOG_FILE"
                SKIPPED=$((SKIPPED + 1))
            else
                echo "FAILED"
                echo "FAIL $FULL — $OUTPUT" >> "$LOG_FILE"
                FAILED=$((FAILED + 1))
            fi
        fi

        # Rate limiting
        if [[ $COUNT -lt $TOTAL ]]; then
            sleep "$DELAY_SECONDS"
        fi
    fi
done <<< "$TARGETS"

##############################################################################
# Summary
##############################################################################
echo ""
echo "============================================="
echo " Complete"
echo "============================================="
echo "  Total:   $TOTAL"
echo "  Success: $SUCCESS"
echo "  Skipped: $SKIPPED"
echo "  Failed:  $FAILED"
echo "  Log:     $LOG_FILE"
echo "============================================="
echo "--- Finished at $(date) ---" | tee -a "$LOG_FILE"
