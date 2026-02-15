---
phase: 01-mcp-server-foundation
plan: 01
subsystem: infra
tags: [mcp, typescript, tsx, zod, node, stdio, devDependencies]

# Dependency graph
requires: []
provides:
  - MCP devDependencies installed (@modelcontextprotocol/sdk, zod, tsx)
  - 4-layer bundle isolation (import-chain, tsconfig, npmignore, devDependencies)
  - Node-targeted MCP tsconfig with Node16 module resolution
  - Stderr-only logger utility for MCP server code
affects: [01-02-mcp-server-foundation]

# Tech tracking
tech-stack:
  added: ["@modelcontextprotocol/sdk@1.26.0", "zod@4.3.6", "tsx@4.21.0"]
  patterns: ["stderr-only logging via console.error", "Node16 module resolution for MCP code", "4-layer bundle isolation"]

key-files:
  created: ["mcp/tsconfig.json", "mcp/util/logger.ts"]
  modified: ["package.json", "tsconfig.json", ".npmignore"]

key-decisions:
  - "Accepted zod v4.3.6 (yarn resolved) over research-recommended v3.25 -- SDK supports both ^3.25 || ^4.0"
  - "Used noEmit:true in MCP tsconfig -- tsx handles execution, tsc only type-checks"

patterns-established:
  - "All MCP logging must use mcp/util/logger.ts (stderr-only, never stdout)"
  - "MCP dependencies always devDependencies, never dependencies"
  - "MCP code lives in top-level mcp/ directory, excluded from root tsconfig and .npmignore"

# Metrics
duration: 4min
completed: 2026-02-13
---

# Phase 1 Plan 1: MCP Infrastructure Setup Summary

**MCP SDK, zod, and tsx installed as devDependencies with 4-layer bundle isolation and stderr-only logger utility**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-13T06:56:48Z
- **Completed:** 2026-02-13T07:00:29Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Installed @modelcontextprotocol/sdk v1.26.0, zod v4.3.6, and tsx v4.21.0 as devDependencies
- Established 4-layer bundle isolation: import-chain separation, tsconfig exclusion, .npmignore exclusion, devDependencies
- Created Node-targeted MCP tsconfig with Node16 module resolution for ESM sub-path imports
- Created stderr-only logger utility with debug gating via HOIST_MCP_DEBUG env var

## Task Commits

Each task was committed atomically:

1. **Task 1: Install MCP dependencies and configure package.json** - `d13884460` (chore)
2. **Task 2: Configure bundle isolation (tsconfig, npmignore)** - `aa315c89f` (chore)
3. **Task 3: Create MCP tsconfig and stderr logger utility** - `b2fd6be0f` (feat)

## Files Created/Modified
- `package.json` - Added devDependencies (SDK, zod, tsx), bin.hoist-mcp, scripts.hoist-mcp
- `yarn.lock` - Updated with all transitive dependencies
- `tsconfig.json` - Added "mcp" to exclude array
- `.npmignore` - Added "mcp" and "bin" entries
- `mcp/tsconfig.json` - Node-targeted TypeScript config with Node16 module resolution
- `mcp/util/logger.ts` - Stderr-only logger with info/warn/error/debug methods

## Decisions Made
- Accepted zod v4.3.6 (resolved by yarn) instead of research-recommended v3.25 -- the MCP SDK explicitly supports both `^3.25 || ^4.0` as peer/dependency range, and the plan instructed to use whatever yarn resolves
- Used `noEmit: true` in MCP tsconfig since tsx handles runtime execution and tsc is only used for type-checking

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All MCP dependencies installed and importable
- Bundle isolation fully in place across all 4 layers
- Logger utility ready for use by server entry point and all handlers
- Ready for Plan 02: MCP server entry point and placeholder tool/resource registration

## Self-Check: PASSED

All created files verified present. All 3 task commits verified in git log.

---
*Phase: 01-mcp-server-foundation*
*Completed: 2026-02-13*
