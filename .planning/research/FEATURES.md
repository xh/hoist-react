# Feature Research

**Domain:** MCP server for framework documentation + human-browsable docs
**Researched:** 2026-02-11
**Confidence:** HIGH (based on analysis of 10+ documentation MCP servers, multiple vendor implementations, and the MCP specification)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Search documentation by keyword/topic** | Every documentation MCP server (Context7, Microsoft Learn, Google DevKnowledge, AWS, Ref.Tools) provides search. LLMs need to find relevant docs without knowing exact paths. | MEDIUM | Hybrid approach recommended: simple text matching for v1, semantic search as a differentiator later. Context7 uses `query-docs`, Microsoft uses `microsoft_docs_search`, Google uses `SearchDocumentChunks`. |
| **Retrieve full document content** | All major MCP servers (Microsoft `docs_fetch`, Google `GetDocument`, AWS `read_documentation`) provide full-page retrieval. The LLM needs to read the actual content after finding it. | LOW | Hoist already has 13 package READMEs + 6 concept docs. Serve these as MCP resources or via a tool. |
| **List available documentation** | LLMs need to discover what documentation exists. Context7 resolves library IDs first; Microsoft/Google list searchable content. Without discoverability, the LLM can't find what it doesn't know to ask for. | LOW | Expose the `docs/README.md` index structure programmatically. Map it to MCP resource listings or a `list_packages` tool. |
| **TypeScript type/interface lookup** | This is the primary value proposition per PROJECT.md. MCP-Typescribe proves this pattern works: `search_symbols`, `get_symbol_details`, `list_members`, `get_parameter_info`. Without type info, LLMs guess at API signatures. | HIGH | Requires TypeScript extraction pipeline (ts-morph or TypeDoc JSON). MCP-Typescribe uses TypeDoc JSON as input. This is the biggest build item. |
| **Structured tool descriptions with JSON Schema** | MCP spec requires it. Every MCP server validates inputs with Zod/JSON Schema. LLMs rely on tool descriptions to decide when and how to call tools. | LOW | Standard MCP SDK practice. Use `@modelcontextprotocol/sdk` + Zod for all tool definitions. |
| **stdio transport** | Standard local MCP transport. Claude Code, Cursor, VS Code all support it. This is how 90%+ of local MCP servers run. | LOW | Built into `@modelcontextprotocol/sdk`. Essentially free. |
| **Token-efficient responses** | Ref.Tools built their entire value proposition on this: returning only the most relevant ~5k tokens instead of 20k+ of raw docs. LLM context windows are finite; flooding them with irrelevant content degrades quality. | MEDIUM | Chunk documents, return targeted sections. For READMEs, return relevant subsections rather than entire files. For type lookups, return signatures + JSDoc, not full source. |
| **Clear tool naming and descriptions** | The Arcade.dev "54 Patterns" research shows that tools can return correct data and still fail if the agent can't figure out *when* to call them. Tool names and descriptions are the primary UX for LLMs. | LOW | Follow naming conventions from successful servers: `search_*`, `get_*`, `list_*`. Keep descriptions concise and action-oriented. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Embedded in the framework itself** | Unlike Context7/Nia/Ref.Tools (external SaaS) or docs-mcp-server (generic scraper), this ships *with* the framework source. Zero setup for developers using Hoist. No indexing step, no external service, no API key. Always in sync because it reads source directly. | LOW | This is an architectural advantage, not a feature to build. The decision to embed in hoist-react is already made per PROJECT.md. |
| **Convention/pattern documentation tools** | Beyond API reference, serve Hoist's coding conventions (from AGENTS.md), architectural patterns (component/model/service), and "how to do X" guidance. No existing MCP documentation server does this well -- they focus on API reference. | MEDIUM | Expose AGENTS.md and concept docs (lifecycle, persistence, auth) as queryable content. A `get_conventions` or `get_pattern` tool would be unique. |
| **Type hierarchy and relationship navigation** | MCP-Typescribe offers `get_type_hierarchy`, `find_implementations`, and `find_usages`. Going further: show how Hoist's HoistModel/HoistService/hoistCmp relate, which classes implement which interfaces, what a component's model provides. | HIGH | Depends on TypeScript extraction. ts-morph can traverse inheritance chains. This is where the "framework knowledge" becomes more than just search. |
| **MCP Prompts for common development tasks** | MCP prompts are user-controlled templates that guide LLM interactions. No documentation MCP server currently offers prompts. Examples: "Create a new Hoist grid panel", "Add a form with validation", "Build a tab container". | MEDIUM | Prompts are a distinct MCP primitive from tools/resources. They return structured message sequences. High-leverage for developer onboarding. |
| **Context-aware filtering by package/concern** | Let LLMs narrow queries to specific packages (grid, form, data) or concerns (styling, persistence, lifecycle). Reduces noise, increases relevance. Context7 supports topic filtering; most others don't. | LOW | Add optional `package` or `topic` parameters to search/lookup tools. Low complexity with high UX impact. |
| **Human-browsable documentation SPA** | A custom Hoist-built documentation browser that showcases the framework itself. Serves as both documentation and a demo of what Hoist can build. TypeDoc generates static HTML; a Hoist SPA would be interactive, searchable, and themeable. | HIGH | Stretch goal per PROJECT.md. Would be a powerful showcase. Could reuse the same data layer (TypeDoc JSON + READMEs) that the MCP server uses. |
| **llms.txt / llms-full.txt generation** | Emerging standard for AI-friendly documentation. GitBook, Mintlify, and Fern all auto-generate these. A single markdown file summarizing all docs with URLs. Low effort, broad compatibility beyond just MCP. | LOW | Generate from `docs/README.md` index. One-time script. Enables ChatGPT, Claude, and other non-MCP tools to consume docs efficiently. |
| **Code example retrieval** | Microsoft's MCP server has a dedicated `code_sample_search` tool. Google plans to add "specific code sample objects." Hoist's READMEs contain inline examples; a dedicated tool to find them would help LLMs produce idiomatic code. | MEDIUM | Parse code blocks from READMEs and package source. Could also index Toolbox examples. Depends on content chunking infrastructure. |
| **Streamable HTTP transport** | Enables remote/shared MCP server access. The MCP spec (2025-06-18) standardizes this. Microsoft Learn and Google DevKnowledge use it. Useful for team scenarios or CI/CD integration. | MEDIUM | Not needed for v1 (local-first per PROJECT.md constraints), but the MCP SDK supports it. Good future-proof option. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Semantic/vector search at v1** | docs-mcp-server and Nia use embeddings + vector search for "intelligent" retrieval. Sounds sophisticated. | Requires embedding model (OpenAI API key or local model), vector database (SQLite-vec), chunking pipeline, and ongoing re-indexing. Massive complexity increase for a framework with ~20 docs. Overkill for a bounded corpus. | Simple keyword/topic search with manual section targeting. The corpus is small enough that exact matching + smart chunking beats embeddings. Add semantic search later if the corpus grows significantly. |
| **Real-time web scraping/indexing** | docs-mcp-server scrapes websites and re-indexes. Nia indexes remote repos. Seems useful for "always current" docs. | Hoist's MCP server is *embedded in the source*. It reads files directly. Scraping adds network dependencies, staleness concerns, and failure modes that don't exist when you own the content. | Read files from disk at query time. The docs are in the repo. No scraping needed. |
| **Full exhaustive API reference at v1** | TypeDoc can generate documentation for every export. Seems like the "complete" approach. | Hoist-react has hundreds of exported symbols. Generating and serving all of them overwhelms LLM context and buries the useful information. MCP-Typescribe works because it lets you drill into specific symbols on demand, not dump everything. | Targeted type lookups: search symbols, get details on demand. Build the extraction pipeline to handle any symbol, but don't pre-generate a catalog of everything. |
| **Authentication/access control** | Enterprise MCP servers (AWS, Azure) use OAuth 2.1 and IAM. Seems like good security practice. | This is a local development tool reading open-source framework docs. Auth adds setup friction that directly contradicts the "zero setup" advantage. No sensitive data is being served. | No auth for v1. If the server ever goes remote/shared, add API key auth at that point. |
| **Multi-version documentation** | Context7 and docs-mcp-server support version-specific queries. Useful for libraries with multiple production versions. | Hoist apps typically track a single version of hoist-react. The MCP server reads from the current checkout. Multi-version support requires maintaining indexed snapshots of each version -- significant complexity for a use case that doesn't exist today. | Serve the current checkout's docs. Version is whatever branch is checked out. If multi-version becomes needed later, generate versioned TypeDoc JSON snapshots. |
| **AI-powered doc generation/maintenance** | Mintlify offers an "AI agent" that writes and maintains docs via PRs. Sounds like a productivity multiplier. | Conflates two concerns: serving docs (the MCP server's job) and writing docs (a separate workflow). Building doc generation into the MCP server bloats scope and creates a tool that does two things poorly instead of one thing well. | Keep doc authoring as a separate Claude Code workflow. The MCP server's job is serving, not writing. |
| **Interactive "Try It" console in docs SPA** | Redocly and ReadMe offer live API exploration. Compelling for API documentation. | Hoist components render in a browser context with MobX state, ag-Grid, and a full React tree. You can't meaningfully "try" a `GridModel` in an isolated playground without substantial sandboxing infrastructure. Toolbox already serves this purpose. | Link to Toolbox examples from the docs SPA. Toolbox *is* the interactive playground. |

## Feature Dependencies

```
[Search docs by keyword]
    +-- enables --> [Context-aware filtering by package]
    +-- enables --> [Code example retrieval]

[Retrieve full document content]
    +-- enables --> [Token-efficient responses] (chunking subsections)

[List available documentation]
    +-- enables --> [llms.txt generation] (same index data)

[TypeScript extraction pipeline] (ts-morph or TypeDoc JSON)
    +-- required by --> [TypeScript type/interface lookup]
    +-- required by --> [Type hierarchy and relationship navigation]
    +-- required by --> [Human-browsable docs SPA] (API reference data source)

[MCP SDK + stdio transport]
    +-- required by --> ALL MCP tools
    +-- enhances with --> [Streamable HTTP transport] (future)

[Convention/pattern documentation tools]
    +-- independent (uses existing AGENTS.md + concept docs)

[MCP Prompts for development tasks]
    +-- enhanced by --> [Search docs] (prompts can reference docs)
    +-- enhanced by --> [Type lookup] (prompts can reference types)
    +-- independent at base level (can ship with hardcoded templates)

[Human-browsable docs SPA]
    +-- requires --> [TypeScript extraction pipeline] (for API reference)
    +-- enhanced by --> [Search docs] (shared search infrastructure)
    +-- requires --> [Retrieve full document content] (shared content layer)
```

### Dependency Notes

- **TypeScript extraction pipeline is the critical-path dependency.** Both MCP type lookups and the docs SPA need it. Choosing ts-morph vs TypeDoc JSON early unblocks both paths. MCP-Typescribe's approach (TypeDoc JSON) is proven and simpler; ts-morph offers more runtime flexibility.
- **Search and content retrieval are foundational.** Most other features build on the ability to find and serve documentation. Ship these first.
- **Prompts are independent.** They can ship as hardcoded templates without requiring search or type infrastructure. Good for early value delivery.
- **llms.txt generation reuses the documentation index.** Nearly free once the content listing is built.
- **The docs SPA is the most dependent feature.** It requires the TypeScript extraction pipeline, the content retrieval layer, and ideally the search infrastructure. This is correctly identified as a stretch goal.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the concept.

- [x] **List packages and docs** -- Expose the docs/README.md index as a discoverable listing. LLMs can see what's available. *LOW complexity.*
- [x] **Retrieve README content** -- Serve package READMEs and concept docs by path or package name. *LOW complexity.*
- [x] **Search docs by keyword/topic** -- Text-based search across READMEs with optional package filter. *MEDIUM complexity.*
- [x] **Get conventions/patterns** -- Serve AGENTS.md content and concept docs (lifecycle, persistence, etc.) as queryable content. *LOW complexity.*
- [x] **stdio transport** -- Standard local MCP transport. *FREE with SDK.*

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **TypeScript type lookup** -- `search_symbols`, `get_symbol_details`, `list_members` using ts-morph or TypeDoc JSON. *Trigger: v1 works and LLMs struggle with type signatures.*
- [ ] **Type hierarchy navigation** -- `get_type_hierarchy`, `find_implementations`. *Trigger: type lookup is working and users need relationship context.*
- [ ] **MCP Prompts** -- Templated prompts for common Hoist development tasks. *Trigger: v1 validates the tool-based approach, prompts add developer onboarding value.*
- [ ] **Code example retrieval** -- Dedicated tool to find code examples from READMEs and Toolbox. *Trigger: LLMs produce non-idiomatic code despite having docs.*
- [ ] **Token-efficient chunking** -- Return relevant subsections instead of full documents. *Trigger: LLM responses degrade from context overload.*
- [ ] **llms.txt generation** -- Generate llms.txt and llms-full.txt from docs index. *Trigger: want non-MCP AI tools to consume docs.*

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Human-browsable docs SPA** -- Custom Hoist-built documentation browser. *Why defer: largest scope item, depends on TypeScript extraction and content infrastructure being solid. Stretch goal.*
- [ ] **Streamable HTTP transport** -- Remote/shared MCP server access. *Why defer: local-first per constraints. Add when team/CI scenarios arise.*
- [ ] **Hoist Core (Java) MCP parity** -- Parallel MCP server for the Java backend. *Why defer: future project, but architecture should accommodate it now.*
- [ ] **Semantic/vector search** -- Embedding-based search for natural language queries. *Why defer: corpus is too small to justify the infrastructure. Revisit if docs grow 10x+.*

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| List packages and docs | HIGH | LOW | P1 |
| Retrieve README content | HIGH | LOW | P1 |
| Search docs by keyword | HIGH | MEDIUM | P1 |
| Get conventions/patterns | HIGH | LOW | P1 |
| stdio transport | HIGH | LOW | P1 |
| TypeScript type lookup | HIGH | HIGH | P1.5 |
| Token-efficient chunking | MEDIUM | MEDIUM | P2 |
| MCP Prompts | MEDIUM | MEDIUM | P2 |
| Code example retrieval | MEDIUM | MEDIUM | P2 |
| Type hierarchy navigation | MEDIUM | HIGH | P2 |
| llms.txt generation | LOW | LOW | P2 |
| Context-aware package filtering | MEDIUM | LOW | P2 |
| Human-browsable docs SPA | HIGH | HIGH | P3 |
| Streamable HTTP transport | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (README serving + search + conventions)
- P1.5: Must have for full value (type lookups -- the core differentiator)
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Context7 | MCP-Typescribe | docs-mcp-server | Microsoft Learn MCP | Google DevKnowledge | Ref.Tools | **Hoist MCP (planned)** |
|---------|----------|----------------|-----------------|---------------------|---------------------|-----------|-------------------------|
| Doc search | resolve + query | search_symbols | hybrid vector+FTS | semantic search | SearchDocumentChunks | ref_search | keyword + package filter |
| Full doc retrieval | query-docs | get_symbol_details | search_docs | docs_fetch | GetDocument | ref_read | get_readme, get_doc |
| Type/API lookup | No | Yes (9 tools) | No | No | No | No | Yes (planned) |
| Code examples | Inline in docs | No | No | code_sample_search | Planned | No | Yes (planned) |
| Version support | Yes | No | Yes | Yes | Yes (24hr re-index) | No | No (current checkout) |
| Token efficiency | Topic filtering | On-demand drill-down | Chunk-based | Markdown conversion | Markdown (planned structured) | Session-aware dropout | Subsection chunking |
| Transport | HTTP + stdio | stdio | stdio | Streamable HTTP | HTTP | Streamable HTTP | stdio (v1) |
| Auth required | No | No | No | No | API key | API key | No |
| Embedded/self-hosted | Remote SaaS | Local (your TypeDoc) | Local | Remote | Remote | Remote SaaS | Embedded in framework |
| Convention/pattern docs | No | No | No | No | No | No | Yes (planned) |
| MCP Prompts | No | No | No | No | No | No | Yes (planned) |
| llms.txt | No | No | No | No | No | No | Yes (planned) |

**Key takeaway:** No existing MCP documentation server combines type/API lookup with framework convention documentation and embedded delivery. MCP-Typescribe is closest for type information but doesn't serve narrative docs. Context7 and the vendor servers (Microsoft, Google, AWS) serve narrative docs but have no type awareness. The Hoist MCP server's unique position is bridging both -- and doing it from inside the framework source with zero configuration.

## Sources

- [Context7 MCP Server](https://github.com/upstash/context7) -- Upstash, open-source documentation MCP server
- [MCP-Typescribe](https://github.com/yWorks/mcp-typescribe) -- yWorks, TypeScript API documentation MCP server
- [docs-mcp-server](https://github.com/arabold/docs-mcp-server) -- Andre Rabold, open-source documentation scraper/indexer
- [Microsoft Learn MCP Server](https://github.com/MicrosoftDocs/mcp) -- Official Microsoft documentation MCP
- [Google Developer Knowledge API](https://developers.googleblog.com/introducing-the-developer-knowledge-api-and-mcp-server/) -- Google, documentation API + MCP
- [AWS Documentation MCP Server](https://awslabs.github.io/mcp/servers/aws-documentation-mcp-server) -- AWS Labs
- [Ref.Tools MCP Server](https://docs.ref.tools/mcp/tools) -- Token-efficient documentation MCP
- [Nia MCP Server](https://www.trynia.ai/) -- Documentation context augmentation
- [GitBook MCP Servers](https://gitbook.com/docs/publishing-documentation/mcp-servers-for-published-docs) -- Auto-generated MCP from published docs
- [Mintlify AI-Native Documentation](https://www.mintlify.com/docs/ai-native) -- AI-native documentation platform with MCP generation
- [llms.txt Specification](https://llmstxt.org/) -- Standard for AI-friendly documentation format
- [MCP Specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/server/resources) -- Official MCP protocol spec
- [54 Patterns for MCP Tools](https://blog.arcade.dev/mcp-tool-patterns) -- Arcade.dev, MCP tool design patterns
- [MCP Resources vs Tools](https://workos.com/blog/mcp-features-guide) -- WorkOS guide to MCP primitives
- [MCP Server Best Practices 2026](https://www.cdata.com/blog/mcp-server-best-practices-2026) -- CData
- [Best MCP Servers 2026](https://www.builder.io/blog/best-mcp-servers-2026) -- Builder.io survey

---
*Feature research for: Hoist MCP Server & Documentation Tooling*
*Researched: 2026-02-11*
