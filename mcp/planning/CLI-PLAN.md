# Hoist React CLI Tool — Implementation Plan

## Context

MCP use with Claude can be blocked in some enterprise environments. We need CLI alternatives
(`hoist-docs`, `hoist-ts`) that wrap the same doc-registry and ts-registry logic so AI agents with
shell access can query hoist-react documentation and type information via bash commands instead of
MCP tool calls. As part of this work, we also remove the untested `mcp/prompts/` directory.

The full requirements spec is at `mcp/planning/CLI-PROMPT.md`.

---

## Part 1: Remove Prompts

### Delete `mcp/prompts/` directory
- Delete all 5 files: `index.ts`, `grid.ts`, `form.ts`, `tabs.ts`, `util.ts`
- Confirmed: `prompts/util.ts` helpers (`loadDoc`, `extractSection`, `formatSymbolSummary`,
  `formatKeyMembers`, `hoistConventionsSection`) are only imported within `mcp/prompts/`. No other
  code in the server depends on them. Safe to delete entirely.

### Modify `mcp/server.ts`
- Remove `import {registerPrompts} from './prompts/index.js';` (line 7)
- Remove `registerPrompts(server);` (line 18)

---

## Part 2: Extract Shared Formatters

The MCP tool handlers in `tools/docs.ts` and `tools/typescript.ts` format output inline. To avoid
duplicating that logic in the CLI, extract formatting into shared modules that both MCP tools and
CLI import.

### New file: `mcp/formatters/docs.ts`
Extract from `mcp/tools/docs.ts`:
- `CATEGORY_ORDER` and `CATEGORY_LABELS` constants (lines 20-27)
- `formatSearchResults(results, query): string` — the formatting block at lines 76-94
- `formatDocList(registry, category): string` — the formatting block at lines 120-141

These return plain strings. Callers (MCP tool or CLI) append their own context-specific tail text
(MCP says "use hoist://docs/{id} resource", CLI says "use: hoist-docs read <id>").

### New file: `mcp/formatters/typescript.ts`
Extract from `mcp/tools/typescript.ts`:
- `MAX_TYPE_LENGTH`, `truncateType()`, `toRelativePath()` (lines 22-33)
- `formatMember()`, `formatMemberIndexEntry()` helper functions (lines 40-78)
- `formatSymbolSearch(symbolResults, memberResults, query): string` — lines 133-160 (without tip)
- `formatSymbolDetail(detail, name): string` — lines 197-233 (without tip)
- `formatMembers(result, name): string` — lines 270-326

### Refactor `mcp/tools/docs.ts` and `mcp/tools/typescript.ts`
- Import from `../formatters/*.js` instead of inline formatting
- MCP tool handlers call formatter, append their own MCP-specific tip text, wrap result in
  `{content: [{type: 'text', text}]}`
- Behavior is identical to current; this is a pure refactor

**Tip text strategy:** Formatters return core data output only. Callers append context-appropriate
tips — MCP tools reference `hoist-get-members` / `hoist://docs/{id}`, CLI references
`hoist-ts members` / `hoist-docs read`.

---

## Part 3: CLI Entry Points

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Arg parsing | `commander` | Good `--help` generation (critical for LLM discovery), clean API, widely understood |
| Entry points | Two files in `mcp/cli/` | Maps to two bin commands, keeps each focused |
| Caching | Skip | 2-3s cold start is fine for AI agent use; avoids serialization complexity and staleness risk. Add later if needed. |
| Output | `stdout` for results, `stderr` for errors | Standard CLI practice, helps agents detect failures |

### New file: `mcp/cli/docs.ts`
Commander program with subcommands:
```
hoist-docs search <query> [--category package|concept|devops|conventions|all] [--limit N]
hoist-docs list [--category ...]
hoist-docs read <docId>
hoist-docs conventions          # shortcut: prints AGENTS.md content
hoist-docs index                # shortcut: prints docs/README.md content
```

Implementation:
- Import `buildRegistry`, `searchDocs`, `loadDocContent` from `../data/doc-registry.js`
- Import `resolveRepoRoot` from `../util/paths.js`
- Import formatters from `../formatters/docs.js`
- Build doc registry once at startup (synchronous, fast)
- Each subcommand: call registry function → format with shared formatter → write to stdout
- Append CLI-specific tips (e.g. "Read any document using: hoist-docs read <id>")
- `--help` includes usage examples via `commander`'s `.addHelpText('after', ...)`
- Exit 0 on success, non-zero on error, errors to stderr

### New file: `mcp/cli/ts.ts`
Commander program with subcommands:
```
hoist-ts search <query> [--kind class|interface|type|function|const|enum] [--limit N]
hoist-ts symbol <name> [--file <path>]
hoist-ts members <name> [--file <path>]
```

Implementation:
- Import `searchSymbols`, `searchMembers`, `getSymbolDetail`, `getMembers` from `../data/ts-registry.js`
- Import formatters from `../formatters/typescript.js`
- All subcommands are async (ts-registry uses lazy init via `ensureInitialized()`)
- `search` calls both `searchSymbols` and `searchMembers` (matching MCP tool behavior)
- `--exported` defaults to true (matching MCP tool), not exposed as a flag
- Append CLI-specific tips (e.g. "Tip: Use `hoist-ts members` to see all members...")
- `--help` includes usage examples
- Exit 0 on success, non-zero on error

### New files: `bin/hoist-docs.mjs` and `bin/hoist-ts.mjs`
Follow exact pattern of existing `bin/hoist-mcp.mjs`:
- `#!/usr/bin/env node`
- Resolve `tsx` via `createRequire` + `require.resolve('tsx/package.json')`
- `execFileSync(process.execPath, [tsxCli, entryPath], {stdio: 'inherit'})`
- Forward exit codes

### Modify `package.json`
Add bin entries:
```json
"bin": {
  "hoist-mcp": "bin/hoist-mcp.mjs",
  "hoist-docs": "bin/hoist-docs.mjs",
  "hoist-ts": "bin/hoist-ts.mjs"
}
```

Add `commander` as a dependency (not devDependency — needed at runtime by CLI consumers).

---

## Part 4: Documentation Updates

### Modify `mcp/README.md`
- Remove all prompt-related sections:
  - Prompts subsection in tool reference
  - Prompt maintenance tables
  - "Adding a New Prompt" extending section
  - Prompts entries in directory structure and data flow diagrams
- Add "## CLI Tools" section documenting both `hoist-docs` and `hoist-ts` with usage and examples
- Update directory structure to show `cli/` and `formatters/` directories
- Update architecture overview to show CLI as a second entry path alongside MCP

### Modify `AGENTS.md`
Add section for AI agent discoverability:
```markdown
## Hoist React Developer Tools (CLI)

When working with hoist-react, use these CLI tools for documentation and type information:

- `npx hoist-docs search "grid sorting"` — Search all hoist-react documentation
- `npx hoist-docs read cmp/grid` — Read a specific doc
- `npx hoist-ts search GridModel` — Find TypeScript symbols
- `npx hoist-ts members GridModel` — List all members of a class

Run `npx hoist-docs --help` and `npx hoist-ts --help` for full usage.
```

---

## Part 5: Testing & Validation

After implementation, spawn independent subagents with no implementation context, each given a
realistic hoist-react development task. Each agent uses only CLI commands (`hoist-docs`, `hoist-ts`)
to discover tools via `--help`, search, and refine.

### Test scenarios
- "Build a grid with sortable columns and row grouping. Find the relevant docs and GridModel API."
- "Getting a type error with `FormModel.values`. Look up FormModel members and find correct usage."
- "What's the recommended way to handle tab refresh? Search the docs."
- "Understand the Store and StoreRecord classes. Get their type signatures and members."
- "Search for documentation about activity tracking in hoist-react."

### Success criteria
- Agent discovers CLI tools from `--help` alone
- Finds relevant documentation within 1-2 search queries
- TypeScript lookups return useful, accurate results
- No dead ends for reasonable queries

Iterate on search relevance, help text, and output formatting based on agent feedback.

---

## Implementation Sequence
1. Remove prompts (Part 1)
2. Extract formatters (Part 2) — refactor only, verify MCP tools still produce same output
3. Add CLI entry points + bin launchers (Part 3)
4. Install commander, update `package.json` bin entries
5. Manual smoke test: `npx hoist-docs --help`, `npx hoist-docs search "grid"`, etc.
6. Update documentation (Part 4)
7. Subagent testing loop (Part 5)

---

## File Summary

### New Files
| File | Purpose |
|------|---------|
| `mcp/formatters/docs.ts` | Shared doc output formatting |
| `mcp/formatters/typescript.ts` | Shared TS output formatting |
| `mcp/cli/docs.ts` | `hoist-docs` CLI entry point |
| `mcp/cli/ts.ts` | `hoist-ts` CLI entry point |
| `bin/hoist-docs.mjs` | Node launcher for hoist-docs |
| `bin/hoist-ts.mjs` | Node launcher for hoist-ts |

### Modified Files
| File | Change |
|------|--------|
| `mcp/server.ts` | Remove prompt registration |
| `mcp/tools/docs.ts` | Use shared formatters |
| `mcp/tools/typescript.ts` | Use shared formatters |
| `package.json` | Add bin entries, add commander dependency |
| `mcp/README.md` | Remove prompts, add CLI docs |
| `AGENTS.md` | Add CLI tools section |

### Deleted Files
| File | Reason |
|------|--------|
| `mcp/prompts/index.ts` | Untested, being removed |
| `mcp/prompts/grid.ts` | Untested, being removed |
| `mcp/prompts/form.ts` | Untested, being removed |
| `mcp/prompts/tabs.ts` | Untested, being removed |
| `mcp/prompts/util.ts` | Only used by prompts |
