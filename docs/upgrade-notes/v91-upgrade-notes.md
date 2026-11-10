# Hoist React v91 Upgrade Notes

> **From:** v90.x → v91.0.0 | **Released:** unreleased | **Difficulty:** 🎉 TRIVIAL

## Overview

Hoist React v91 has no runtime breaking changes. Its one required step applies to development
tooling only.

- **MCP server and CLIs removed (required if your agents use them)** - hoist-react no longer ships
  the stdio MCP server or the `hoist-mcp`, `hoist-docs` and `hoist-ts` CLIs. The same tools come
  from [Hoist Docs](https://github.com/xh/hoist-docs) (`@xh/hoist-docs`), added as a dev
  dependency - see Step 1.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v90.x.

## Upgrade Steps

### 1. Switch Agents to Hoist Docs

`node_modules/@xh/hoist/bin/hoist-mcp.mjs` and the `npx hoist-docs` / `npx hoist-ts` commands no
longer exist. Hoist Docs serves the same tools - `hoist-search-docs`, `hoist-read-doc`,
`hoist-search-symbols`, `hoist-get-symbol`, `hoist-get-members` and the rest - for hoist-core as
well, from one MCP server built on the MCP TypeScript SDK v2 (the 2026-07-28 spec, and the 2025
handshake older clients use). The agent launches it over stdio, as before, and it answers for the
Hoist versions your app has installed.

**Add the dependency:**

```bash
cd client-app && pnpm add -D @xh/hoist-docs
```

**Find affected config:**

```bash
grep -rn "hoist-mcp\|npx hoist-docs\|npx hoist-ts" .mcp.json CLAUDE.md AGENTS.md .claude 2>/dev/null
```

**Before** (`.mcp.json`):

```json
{
  "mcpServers": {
    "hoist-react": {
      "type": "stdio",
      "command": "node",
      "args": ["client-app/node_modules/@xh/hoist/bin/hoist-mcp.mjs"]
    }
  }
}
```

**After:**

```json
{
  "mcpServers": {
    "hoist-docs": {
      "type": "stdio",
      "command": "node",
      "args": ["client-app/node_modules/@xh/hoist-docs/bin/hoist-docs.mjs"]
    }
  }
}
```

Point at the package's own launcher, as above, rather than `node_modules/.bin/hoist-docs`. On
first start for a Hoist version, the tool fetches that version's docs index through npm - so your
`.npmrc` registry and proxy settings apply - and caches it. Organizations that front MCP servers
with a gateway can run the same package over HTTP instead (`hoist-docs --http`); see the Hoist
Docs README.

Also update:

- Permission allowlists that name the old server, such as `mcp__hoist-react__*` in
  `.claude/settings.json`, to the new server name (`mcp__hoist-docs__*`).
- `enabledMcpjsonServers` entries naming `hoist-react`.
- Agent instructions (`CLAUDE.md`, `AGENTS.md`) that tell agents to run `npx hoist-docs` or
  `npx hoist-ts`. Point them at the MCP tools, or at the docs under
  `node_modules/@xh/hoist/docs/` when the tool is not set up.
- hoist-core's tools were named `hoist-core-*`. Hoist Docs serves one set of `hoist-*` tools for
  both libraries; pass `library: "core"` to scope a call to hoist-core.

## Verification Checklist

- [ ] No config or instructions reference `hoist-mcp.mjs`, `npx hoist-docs` or `npx hoist-ts`.
- [ ] `hoist-ping` from your agent reports Hoist Docs and your app's Hoist versions.

## Reference

- [Hoist Docs](https://github.com/xh/hoist-docs) - the tool, its design, and gateway deployment
- [`docs-index/README.md`](../../docs-index/README.md) - building the index the service serves
