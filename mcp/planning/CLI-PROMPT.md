# Hoist React CLI Tool — Handoff from Architecture Discussion

## Instructions for the Coding Agent

Before writing any code: read the existing MCP server source at `mcp/` thoroughly — especially
`mcp/server.ts`, `mcp/data/doc-registry.ts`, `mcp/data/ts-registry.ts`, and `mcp/tools/*.ts`.
Understand how the registries work and how the MCP tools format their output. The CLI should
produce identical output to the MCP tools for the same inputs. Plan your approach and propose a
file structure before implementing.

This work has three parts:
1. **Remove prompts** from the existing MCP server (delete `mcp/prompts/`, update `server.ts`
   and `mcp/README.md`).
2. **Add CLI entry points** in `mcp/` that expose the documentation and TypeScript tools as
   shell commands.
3. **Test with independent agents** — spawn fresh subagents that use only the CLI to solve
   realistic hoist-react development tasks. Evaluate results, iterate, and improve until the
   CLI is reliably useful. See the "Testing and Validation" section for details.

## Context

We have an existing MCP server for hoist-react at `mcp/` in the repo
(https://github.com/xh/hoist-react/tree/develop/mcp). A client has blocked all MCP use with
Claude. We need a CLI alternative that wraps the same logic so that
Claude Code (and other shell-capable AI agents) can access hoist-react documentation and type
information via bash commands instead of MCP tool calls.

## The Existing MCP Server — What It Does

The MCP server is ~3,000 lines across 13 TypeScript files in `mcp/`. It provides:

### Documentation Tools
- **`hoist-search-docs`** — Keyword search across ~40 hoist-react READMEs/concept docs. Returns
  ranked results with context snippets. Params: `query` (string), `category` (enum:
  package|concept|devops|conventions|all), `limit` (1-20, default 10).
- **`hoist-list-docs`** — List all docs grouped by category. Param: `category` (same enum).
- **`hoist-ping`** — Health check. No params.

### TypeScript Tools
- **`hoist-search-symbols`** — Search classes, interfaces, types, functions by name. Also searches
  public members of 17 key framework classes (GridModel, Column, Store, FormModel, etc.). Params:
  `query` (string), `kind` (enum: class|interface|type|function|const|enum), `exported` (bool,
  default true), `limit` (1-50, default 20).
- **`hoist-get-symbol`** — Full detail for a specific symbol: signature, JSDoc, inheritance,
  decorators, source location. Params: `name` (string), `filePath` (optional string).
- **`hoist-get-members`** — All properties and methods of a class/interface with types, decorators,
  JSDoc. Params: `name` (string), `filePath` (optional string).

### Prompts — REMOVING
The MCP server includes three prompt builders (`create-grid`, `create-form`,
`create-tab-container`) in `mcp/prompts/`. These are untested and should be **removed from the
MCP server** as part of this work. Do not port them to the CLI. Delete the `mcp/prompts/`
directory and remove all prompt registrations from `server.ts`. Also remove the prompt-related
maintenance sections from `mcp/README.md`. If we bring these back later, it will likely be as
Claude Code skills rather than MCP prompts or CLI commands.

### Resources
- `hoist://docs/index` — The docs/README.md index.
- `hoist://docs/conventions` — AGENTS.md coding conventions.
- `hoist://docs/{+docId}` — Any doc by ID (e.g. `cmp/grid`).

### Key Architecture Internals
- **`mcp/data/doc-registry.ts`** — Hardcoded inventory of all docs with curated metadata (title,
  description, category, keywords). Not filesystem-scanned. ~40 entries.
- **`mcp/data/ts-registry.ts`** — Lazy ts-morph index of ~700 TypeScript files. Expensive init
  (~2-3s), then fast in-memory lookups. Parses AST for symbols/members. Has eager async init
  after server connect.
- **`mcp/util/paths.ts`** — Path traversal protection. `resolveDocPath()` rejects `..` segments.
- **`mcp/util/logger.ts`** — Stderr-only logging.

## The CLI Conversion Plan

### Design Principles
1. **Reuse all existing logic** — doc-registry, ts-registry, path safety. The CLI is a new entry
   point, not a rewrite.
2. **Two commands** (or one with subcommands — your call):
    - `hoist-docs` — Documentation search, list, and read.
    - `hoist-ts` — TypeScript symbol search, inspection, and member listing.
3. **Plain text on stdout** — The MCP server already formats results as plain text/markdown. The
   CLI just needs to print the same strings.
4. **`--help` is the discovery mechanism** — LLMs learn CLI tools by running `--help`. Make the
   help text clear and include usage examples.
5. **Exit codes** — Exit 0 on success, non-zero on error. Write errors to stderr. This is
   standard CLI practice and helps AI agents detect failures.

### Proposed CLI Surface

```
hoist-docs search <query> [--category package|concept|devops|conventions|all] [--limit N]
hoist-docs list [--category ...]
hoist-docs read <docId>            # e.g. hoist-docs read cmp/grid
hoist-docs conventions             # shortcut for AGENTS.md
hoist-docs index                   # shortcut for docs/README.md

hoist-ts search <query> [--kind class|interface|type|function|const|enum] [--limit N]
hoist-ts symbol <name> [--file <path>]
hoist-ts members <name> [--file <path>]
```

### TypeScript Index Caching

The MCP server amortizes the 2-3 second ts-morph init across a session. The CLI must cache the
index to disk so only the first invocation pays that cost.

**Approach: lazy disk cache with content-hash invalidation.**

1. On first `hoist-ts` call, build the ts-morph index normally (~2-3s). Serialize the symbol and
   member indexes to a JSON cache file.
2. Also compute and store a cache key — a hash derived from the source files that feed the index
   (e.g. a hash of the sorted list of relevant `.ts` file paths + their mtimes, or a hash of the
   aggregate file content). Keep the hashing cheap — mtimes are fine as a first pass.
3. On subsequent calls, read the cache key first. If it matches the current state of the source
   files, load the index from the JSON cache (fast). If it doesn't match, rebuild and rewrite.
4. Store the cache in `node_modules/.cache/hoist-ts/` (follows the convention used by Babel,
   ESLint, etc.). This location is already gitignored by convention and gets cleared on
   `npm ci` / `yarn install --immutable`, which is a natural invalidation point.

**Guiding principle: if the caching adds meaningful complexity — tricky edge cases, hard-to-debug
staleness, brittle serialization — drop it and accept the cold start on every call. A correct
2-3 second CLI is better than a fast but occasionally wrong one. Simplicity wins.**

### Entry Points and Packaging

- The CLI lives inside the existing `mcp/` directory — not a sibling. The doc-registry,
  ts-registry, path utilities, and all dependencies already live here. The CLI is just a second
  entry point into the same codebase.
- Add CLI entry point scripts (e.g. `mcp/cli-docs.ts`, `mcp/cli-ts.ts`, or a single
  `mcp/cli.ts` with subcommands — implementer's call).
- Register as bin commands in `package.json` so `npx hoist-docs` and `npx hoist-ts` work.
- Use a lightweight arg parser — `commander`, `yargs`, or even manual `process.argv` parsing
  given the simple surface.

### README Update

The `mcp/README.md` must be updated to reflect all changes:
- Document the new CLI tools (usage, examples, `--help` reference).
- Remove the Prompts section and all prompt-related maintenance tables.
- Update the architecture diagram and directory structure to show the CLI entry points.
- Update the "Extending" section if relevant.
- The README now covers both the MCP server and the CLI as two interfaces into the same
  underlying registries and utilities.

### CLAUDE.md Integration

The CLI should be documented in the project's `CLAUDE.md` (or `AGENTS.md`) so that AI agents
know to use it. Something like:

```markdown
## Hoist React Developer Tools (CLI)

When working with hoist-react, use these CLI tools for documentation and type information:

- `npx hoist-docs search "grid sorting"` — Search all hoist-react documentation
- `npx hoist-docs read cmp/grid` — Read a specific doc
- `npx hoist-ts search GridModel` — Find TypeScript symbols
- `npx hoist-ts members GridModel` — List all members of a class

Run `npx hoist-docs --help` and `npx hoist-ts --help` for full usage.
```

## What NOT to Change

- The doc-registry and ts-registry modules are the core value. Don't rewrite them.
- The path traversal safety in `util/paths.ts` should be used by the CLI too.
- The `mcp/prompts/` directory is being removed (untested code). Before deleting it, check
  whether `prompts/util.ts` contains shared helpers (like `loadDoc()` or `extractSection()`)
  that the doc-registry or tools also use. If so, extract those to a common util module first,
  then delete the prompts directory.

## Success Criteria

A developer (or AI agent) with no MCP support should be able to:
1. Search hoist-react docs by keyword and get ranked results with snippets.
2. Read any specific doc by ID.
3. Search for TypeScript symbols/members and get type information.

All via shell commands, with no MCP server running, no network access, no credentials.

## Testing and Validation — Required

After the implementation is complete, do NOT consider this work done. The next phase is
essential: spin up independent review and testing agents to validate the CLI in realistic
conditions.

### The Testing Loop

1. **Spawn fresh subagents** that have no context from the implementation work. Each agent
   should play the role of "I'm a coding agent working on a hoist-react application problem."
   Give them realistic tasks, such as:
    - "I need to build a grid with sortable columns and row grouping. Find the relevant
      hoist-react documentation and the GridModel API."
    - "I'm getting a type error with `FormModel.values`. Look up the FormModel members and
      find the right usage pattern."
    - "What's the recommended way to handle tab refresh in hoist-react? Search the docs."
    - "I need to understand the Store and StoreRecord classes. Get me their type signatures
      and members."
    - "Search for documentation about activity tracking in hoist-react."

2. **The testing agents should use ONLY the CLI** — `hoist-docs` and `hoist-ts` commands via
   bash. They should discover the tools via `--help`, formulate their own queries, and
   iteratively search and refine until they find what they need (or can't).

3. **Each testing agent reports back** with:
    - What they searched for (exact commands run).
    - What they got back (quality and relevance of results).
    - Whether they found what they needed to complete their task.
    - Any gaps, confusing output, missing docs, or dead ends.

4. **The coordinating agent evaluates the reports** and identifies patterns:
    - Are search results well-ranked? Do the right docs surface for common queries?
    - Are TypeScript symbol lookups returning useful, complete information?
    - Is the `--help` output sufficient for an agent to figure out the CLI without prior
      knowledge?
    - Are there common hoist-react development tasks where the CLI falls short?

5. **Iterate.** If testing reveals issues — poor search relevance for certain terms, missing
   keywords in the doc registry, unhelpful output formatting, confusing `--help` text — fix
   them and re-test. This is not a single pass. Continue until the testing agents are
   consistently getting good results across a range of realistic tasks.

### What Good Looks Like

A testing agent given a realistic hoist-react development task should be able to:
- Discover the CLI tools from `--help` alone.
- Find relevant documentation within 1-2 search queries.
- Look up type information and get useful, accurate results.
- Not hit dead ends where the tool returns nothing useful for a reasonable query.

If a testing agent is struggling, that's a signal to improve the CLI, not a signal that the
agent is bad at searching.

## Why This Approach

The current MCP-vs-CLI discourse in the AI tooling community (Feb/March 2026) broadly supports
CLI as an equally effective — and in some ways superior — interface for AI coding agents:

- **Token efficiency**: MCP tool schemas consume context tokens from session start. CLI tools
  cost ~0 tokens until invoked, with progressive disclosure via `--help`.
- **Debuggability**: Developers can run the same commands the AI runs. No JSON-RPC log spelunking.
- **Security simplicity**: "It's a read-only CLI that searches docs" is easier to approve than
  "it's an MCP server" for security teams with blanket MCP bans.
- **Broader compatibility**: Works with any agent that has shell access, not just MCP clients.

The functional gap vs. the MCP server is small: loss of `@`-mention resource completion and
potentially slower TypeScript lookups without the persistent process. Neither is a dealbreaker.
