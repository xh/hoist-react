# Hoist React v91 Upgrade Notes

> **From:** v90.x → v91.0.0 | **Released:** unreleased | **Difficulty:** 🎉 TRIVIAL

## Overview

Hoist React v91 has no runtime breaking changes. Its one required step applies to development
tooling only.

- **MCP server and CLIs removed (required if your agents use them)** - hoist-react no longer ships
  the stdio MCP server or the `hoist-mcp`, `hoist-docs` and `hoist-ts` CLIs. The same tools are
  served over HTTP by the [Hoist Docs](https://github.com/xh/hoist-docs) service - see Step 1.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v90.x.

## Upgrade Steps

### 1. Point Agents at a Hoist Docs Server

`node_modules/@xh/hoist/bin/hoist-mcp.mjs` and the `npx hoist-docs` / `npx hoist-ts` commands no
longer exist. The Hoist Docs service serves the same tools - `hoist-search-docs`,
`hoist-read-doc`, `hoist-search-symbols`, `hoist-get-symbol`, `hoist-get-members` and the rest -
over MCP Streamable HTTP, and covers hoist-core as well.

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
    "hoist-docs": {"type": "http", "url": "https://<your Hoist Docs server>/mcp"}
  }
}
```

Use the URL XH provides, or your own on-prem instance's URL behind your MCP gateway. Pass
`library: "react"` and `version` to a tool to match your app's hoist-react version - otherwise
the server answers for the newest version it holds.

Also update:

- Permission allowlists that name the old server, such as `mcp__hoist-react__*` in
  `.claude/settings.json`, to the new server name (`mcp__hoist-docs__*`).
- `enabledMcpjsonServers` entries naming `hoist-react`.
- Agent instructions (`CLAUDE.md`, `AGENTS.md`) that tell agents to run `npx hoist-docs` or
  `npx hoist-ts`. Point them at the MCP tools, or at the docs under
  `node_modules/@xh/hoist/docs/` when no server is available.

## Verification Checklist

- [ ] No config or instructions reference `hoist-mcp.mjs`, `npx hoist-docs` or `npx hoist-ts`.
- [ ] `hoist-ping` from your agent reports the Hoist Docs server and its loaded versions.

## Reference

- [Hoist Docs](https://github.com/xh/hoist-docs) - the service, its design, and running it locally
- [`docs-index/README.md`](../../docs-index/README.md) - building the index the service serves
