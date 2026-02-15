# Phase 4: Developer Prompts - Context

**Discussed:** 2026-02-13
**Source:** Organic discussion during plan review (pre-execution)

## Decision Point: Should Phase 4 ship prompts or defer them?

### Background

Phases 1-3 deliver tools and resources that return raw framework data (doc search, type lookup,
member inspection). Phase 4 shifts to serving *opinionated compositions* — templated prompts that
combine docs, types, conventions, and code templates into structured starting points. This is a
qualitatively different kind of output: the MCP server moves from "here's the data" to "here's
how you should use it."

### Arguments For (ship as foundation)

- Concrete starting point beats blank page — easier to review/edit a template than author from scratch
- Validates Phase 2/3 architecture by composing docs + types together for the first time
- Completes the MCP primitive set (resources, tools, prompts)
- Small incremental cost (~10-15 min execution based on project velocity)
- Iteration is cheap — prompts are strings in TypeScript files

### Arguments Against (defer until feedback)

- No evidence of need — DEVX-01 was written speculatively, not from user demand
- False authority risk — wrong patterns from the official MCP server are worse than no patterns
- Review burden — someone who knows Hoist must verify every code template and convention claim
- Team is still absorbing MCP — premature to optimize before understanding the problem space
- Feedback-driven content (after using Phase 2/3 tools) would target real problems, not guessed ones

### Key Risk Identified

Prompt content will be authored by an LLM executor reading READMEs, not by a Hoist expert.
Code templates should be treated as "reasonable first drafts that compile" and will need human
review before being considered authoritative guidance. The claim that conventions are "the #1
thing LLMs get wrong" was an unsupported assumption — actual pain points are unknown until the
team uses the tools in practice.

## Decisions

- **Proceed with Phase 4 as planned.** Ship prompts as a useful foundation with the understanding
  that content is first-draft quality and will need iteration based on real usage.
- **Prompt content is not authoritative until reviewed.** The team should review code templates,
  conventions blocks, and section selections after execution. Treat as starting points, not
  finished artifacts.

## Claude's Discretion

- Implementation architecture (file structure, utility design, registration pattern)
- Which doc sections to extract for each prompt
- Which type members to highlight
- Code template structure and argument handling
- Token budget allocation within the 2000-4000 target range

## Deferred Ideas

- Additional prompts beyond the core 3 (create-service, create-dashboard, create-mobile-view)
- Feedback mechanism for tracking prompt effectiveness
- Pre-warming ts-morph on server start (keep lazy init for now)
