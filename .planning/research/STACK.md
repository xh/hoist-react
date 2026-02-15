# Stack Research

**Domain:** MCP Server + TypeScript Documentation Tooling (embedded in a TypeScript/React UI framework)
**Researched:** 2026-02-11
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@modelcontextprotocol/sdk` | `~1.26.0` | MCP server implementation exposing resources/tools/prompts to LLMs | The official Anthropic-maintained TypeScript SDK. Only credible option -- all alternatives (mcp-framework, FastMCP) are wrappers around this SDK. Actively maintained, shipping weekly. Requires Node >= 18. **Confidence: HIGH** |
| `ts-morph` | `~27.0.2` | Programmatic TypeScript type/interface extraction | The standard wrapper over the TypeScript Compiler API. Version 27 bundles TypeScript 5.9 internally (no separate TS peer dep needed), directly matching hoist-react's TS 5.9.2. Provides `getInterfaces()`, `getProperties()`, `getType()` for structured extraction of public API surface. **Confidence: HIGH** |
| `typedoc` | `~0.28.16` | API documentation generation from TypeScript source | The standard TypeScript documentation generator. v0.28 explicitly supports TypeScript `5.0.x` through `5.9.x` via peer dependency. Outputs both HTML and JSON. The JSON output enables a future custom Hoist SPA consumer without lock-in. **Confidence: HIGH** |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^4.0` | Schema validation for MCP tool input parameters | Required peer dependency of `@modelcontextprotocol/sdk`. Used to define input schemas for MCP tools. The SDK's `server.tool()` API accepts Zod schemas directly. hoist-react does not currently use zod -- install as devDep. **Confidence: HIGH** |
| `tsx` | `~4.21.0` | TypeScript execution without compilation step | Run the MCP server via `yarn mcp` without a build step. Uses esbuild under the hood -- 20-30x faster startup than tsc compilation. Recommended over ts-node for dev tooling. Node >= 18. **Confidence: HIGH** |
| `typedoc-plugin-markdown` | `~4.10.0` | Markdown output from TypeDoc | Generates Markdown instead of HTML -- useful if docs are consumed in GitHub, Docusaurus, or a custom pipeline. Peer dep on typedoc 0.28.x. Install only if Markdown output is preferred over HTML. **Confidence: HIGH** |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@modelcontextprotocol/inspector` (`0.20.0`) | Visual debugging/testing of MCP servers | Run via `npx @modelcontextprotocol/inspector`. Shows registered resources, tools, prompts. Invaluable during development. Do NOT install as project dep -- use via npx. **Confidence: HIGH** |
| TypeDoc JSON output (`--json` flag) | Structured API data for custom consumption | TypeDoc can emit a `docs.json` alongside or instead of HTML. The JSON follows the `JSONOutput.ProjectReflection` interface. This decouples type extraction from rendering -- can feed a custom Hoist SPA later. |

## Installation

```bash
# Dev dependencies only -- this tooling never ships to production
yarn add -D @modelcontextprotocol/sdk zod tsx ts-morph typedoc

# Optional: Markdown output plugin
yarn add -D typedoc-plugin-markdown
```

All dependencies are devDeps. The MCP server runs locally during development only. Nothing here enters the production bundle.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@modelcontextprotocol/sdk` (official) | `mcp-framework` | Never for this project. mcp-framework is a wrapper adding CLI scaffolding and opinionated project structure -- overhead without value when embedding into an existing library. |
| `ts-morph` | Raw TypeScript Compiler API | Only if ts-morph's abstraction proves too limiting for a specific extraction task. ts-morph exposes `.compilerNode` / `.compilerObject` escape hatches for direct compiler API access, so this should rarely be needed. |
| `ts-morph` | `@microsoft/api-extractor` | **Not for this project.** api-extractor bundles TypeScript 5.8.2 internally and does NOT yet support TS 5.9 (open issue [#5319](https://github.com/microsoft/rushstack/issues/5319)). It also works from `.d.ts` output only, requiring a build step. ts-morph works directly on source and bundles TS 5.9. |
| `typedoc` | Custom ts-morph extraction + hand-built renderer | Only if TypeDoc's output format proves fundamentally unsuitable for the Hoist SPA docs vision. TypeDoc's JSON output is extensible and can feed a custom React renderer, making a full custom pipeline premature. |
| `typedoc` | `api-documenter` (Microsoft) | **Not for this project.** Requires `@microsoft/api-extractor` as input, inheriting its TS 5.9 incompatibility. Also produces less flexible output than TypeDoc. |
| `tsx` | `ts-node` | Only in CI environments where ts-node is already configured. tsx is faster for dev server startup (esbuild-based). No type checking at runtime -- but the MCP server is dev tooling, not production code, so runtime type checking adds latency without value. |
| `zod` v4 | `zod` v3.25 | The MCP SDK accepts `^3.25 || ^4.0`. Use v4 (current latest: 4.3.6) since this is a new installation with no existing zod usage to migrate. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@microsoft/api-extractor` | Bundles TS 5.8.2, does not support TS 5.9.2. Works only from `.d.ts` files requiring a build step. Historically lags 1-2 TypeScript releases behind. | `ts-morph` 27 (bundles TS 5.9, works on source files directly) |
| `mcp-framework` | Wrapper around the official SDK adding scaffolding, file conventions, and CLI tooling. All overhead for an embedded server in an existing repo. | `@modelcontextprotocol/sdk` directly |
| `ts-node` | Slower startup than tsx (uses tsc under the hood). Heavier configuration. No advantage for a dev-only MCP server. | `tsx` |
| `JSDoc` / `documentation.js` | JavaScript-first tools. Do not understand TypeScript's type system (generics, mapped types, conditional types). Would miss most of hoist-react's public API surface. | `typedoc` |
| `console.log()` in MCP server | Writes to stdout, which corrupts the stdio JSON-RPC transport. | `console.error()` (writes to stderr) or a file-based logger |
| SSE transport for MCP | Deprecated in the MCP specification in favor of Streamable HTTP. For a local dev server, stdio is simpler and correct. | `StdioServerTransport` |

## Stack Patterns by Variant

**If serving only READMEs and pre-extracted type summaries (simpler):**
- Use `@modelcontextprotocol/sdk` with `StdioServerTransport`
- Expose READMEs as MCP resources with `text/markdown` MIME type
- Pre-extract type summaries at build time using ts-morph, serve as static resources
- Lower runtime complexity, faster server startup

**If serving live type information on-demand (richer but heavier):**
- Use ts-morph `Project` initialized once at server startup
- Expose MCP tools like `get-interface-props` that query ts-morph on-demand
- Higher startup cost (ts-morph initializes the TS compiler), but always current
- Cache parsed project to avoid re-parsing on every request

**If generating human-browsable docs for the website (HTML):**
- Use `typedoc` with default HTML theme
- Run as a separate yarn script (`yarn docs:html`)
- Output to `build/docs/` (gitignored)

**If generating docs for a custom Hoist SPA:**
- Use `typedoc --json build/docs/api.json` to produce structured data
- Feed JSON into a custom React app that renders API docs in Hoist's style
- Use `typedoc-json-parser` (npm) to simplify consumption of the JSON
- This approach decouples extraction from rendering

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@modelcontextprotocol/sdk@1.26.0` | Node >= 18, `zod@^3.25 \|\| ^4.0` | SDK imports from `zod/v4` internally. Maintains backwards compat with v3.25+. |
| `ts-morph@27.0.2` | TypeScript 5.9 (bundled) | Bundles its own TypeScript. Does NOT use project's installed TypeScript by default. Use `compilerOptions` in ts-morph `Project` constructor to align with hoist-react's tsconfig. |
| `typedoc@0.28.16` | TypeScript `5.0.x - 5.9.x` (peer dep) | Uses project's installed TypeScript via peer dep. Confirmed compatible with 5.9.2. |
| `typedoc-plugin-markdown@4.10.0` | `typedoc@0.28.x` | Must match typedoc major.minor. |
| `tsx@4.21.0` | Node >= 18 | Uses esbuild internally. No type checking -- just execution. |

## MCP SDK v2 Considerations

The MCP TypeScript SDK v2 is anticipated in Q1 2026. Key points:

- **v1.x will receive bug fixes and security updates for >= 6 months after v2 ships.** No urgency to migrate.
- v2 is expected to bring Streamable HTTP improvements and protocol-level changes. For a stdio-based local server, impact should be minimal.
- **Recommendation:** Build on v1.x now. The `McpServer` + `StdioServerTransport` API is stable and the core pattern is unlikely to change fundamentally in v2. Pin to `~1.26.0` to avoid unexpected breaking changes if v2 lands on npm.
- **Confidence: MEDIUM** -- v2 timeline is based on community discussion, not an official Anthropic announcement with a hard date.

## Sources

- [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk) -- official repo, server docs, examples (HIGH confidence)
- [MCP TypeScript SDK npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) -- version 1.26.0, peer deps, engines verified via `npm view` (HIGH confidence)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts) -- protocol spec for resources, tools, prompts (HIGH confidence)
- [ts-morph GitHub](https://github.com/dsherret/ts-morph) -- v27.0.0 changelog confirms TS 5.9 support, TypeScript bundling (HIGH confidence)
- [ts-morph documentation](https://ts-morph.com/details/interfaces) -- interface/type extraction API (HIGH confidence)
- [TypeDoc GitHub](https://github.com/TypeStrong/typedoc) -- v0.28 peer dep supports TS 5.9.x, verified via `npm view` (HIGH confidence)
- [TypeDoc JSON output API](https://typedoc.org/api/modules/JSONOutput.html) -- JSONOutput.ProjectReflection interface (HIGH confidence)
- [typedoc-plugin-markdown](https://typedoc-plugin-markdown.org/docs) -- v4.10.0, peer dep on typedoc 0.28.x (HIGH confidence)
- [api-extractor TS 5.9 issue](https://github.com/microsoft/rushstack/issues/5319) -- open issue requesting TS 5.9.2 support, confirming incompatibility (HIGH confidence)
- [MCP resources specification](https://modelcontextprotocol.info/docs/concepts/resources/) -- resource templates, URI patterns, MIME types (HIGH confidence)
- [tsx npm](https://www.npmjs.com/package/tsx) -- v4.21.0, Node >= 18, esbuild-based (HIGH confidence)
- Community discussion on MCP v2 timeline (MEDIUM confidence -- not officially confirmed by Anthropic)

---
*Stack research for: MCP Server + TypeScript Documentation Tooling*
*Researched: 2026-02-11*
