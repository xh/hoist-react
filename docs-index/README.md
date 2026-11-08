# Docs Index Builder

Builds the index file that the [Hoist Docs](https://github.com/xh/hoist-docs) service serves. Hoist
Docs is a Hoist application that gives AI coding assistants structured access to Hoist
documentation and API reference over MCP, and gives people a docs viewer for the same content.

This directory is development tooling. It is not published in the npm package, and apps never run
it.

## What the index holds

One JSON file per hoist-react version, in the schema described in the hoist-docs repo's
`docs/index-schema.md`:

- every doc registered in [`docs/doc-registry.json`](../docs/doc-registry.json), with its markdown
- every TypeScript symbol, with its signature, JSDoc, import path, and - for classes and
  interfaces - all own and inherited members, precomputed
- the member search index

The service splits docs into sections, ranks search results, and formats tool output. Nothing here
runs at query time.

## Building

```bash
pnpm build:index                  # writes build/docs-index/react-<version>.json
pnpm build:index --out <dir>      # write elsewhere, e.g. a local hoist-docs checkout's indexes/
pnpm build:index --gzip           # write react-<version>.json.gz
```

The build parses the source with ts-morph and takes about 15 seconds. The symbol and member indexes
are cached under `node_modules/.cache/hoist-docs-index` between runs.

## Using the MCP tools

Agents connect to a Hoist Docs server over HTTP. This repo's [`.mcp.json`](../.mcp.json) points
at `HOIST_DOCS_MCP_URL`, defaulting to a local server on port 8080. See the hoist-docs README for
running one locally against indexes built here.

The tools are `hoist-search-docs`, `hoist-list-docs`, `hoist-read-doc`, `hoist-search-symbols`,
`hoist-get-symbol`, `hoist-get-members` and `hoist-ping`. They cover hoist-core as well as
hoist-react.

## Layout

| Path | Purpose |
| --- | --- |
| `cli/build-index.ts` | Entry point for `pnpm build:index`. Assembles and writes the index. |
| `cli/build-index.spec.ts` | Schema conformance checks for the built index. |
| `data/doc-registry.ts` | Loads `docs/doc-registry.json`. |
| `data/ts-registry.ts` | ts-morph symbol and member extraction. |
| `data/import-paths.ts` | Resolves the package barrel that re-exports each symbol. |
| `data/index-cache.ts` | Disk cache of the symbol and member indexes. |

## Maintaining

- Run `pnpm test:docs-index` after changing anything here. CI runs it on every PR.
- A change to the shape of the index must bump `SCHEMA_VERSION` in `cli/build-index.ts` and be
  matched in the hoist-docs service, which refuses schema versions it does not know.
- Search ranking lives in the hoist-docs service. Its parity spec checks it against the search this
  directory used to contain.
