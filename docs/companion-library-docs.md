# Companion Library Docs

A companion library is an npm package that builds on Hoist. Examples are `@xh/hoist-chat-kit` and
a client firm's shared package of Hoist overrides and components. Such a library can serve its own
docs through the hoist-react MCP server and the `hoist-docs` CLI. It needs no MCP server or CLI of
its own.

The library declares a doc registry in its `package.json`. When an app installs the library, the
hoist-react tools find the registry and serve its docs next to Hoist's own. Agents search, list, and
read them with the same tools, and the server instructions tell agents that the library exists.

## How It Works

1. The tools find the app's `package.json`. See [Discovery](#discovery).
2. They check the app package and each of its direct `dependencies` and `devDependencies` for a
   `hoist.docRegistry` field.
3. They load each declared registry and prefix its doc ids with the package name. For example,
   `core/README.md` in `@acme/hoist-acme` becomes `@acme/hoist-acme/core/README.md`.
4. They merge those docs into one search index with Hoist's docs.
5. The MCP server lists each library in its instructions, with its version, description, index
   doc, source location, and any [guidance](#agent-guidance) from its authors. `hoist-ping` and
   `hoist-docs ping` list the same, plus any load problems.

Hoist's own doc ids do not change. Short ids such as `core`, `grid`, and `index` always mean Hoist
docs.

## Opting In

1. Write the docs as markdown files in the package: package READMEs, concept docs, or both. Use
   `##` and `###` headings. Search ranks and returns docs by section.
2. Add a registry file, for example `docs/doc-registry.json`. See
   [Registry Format](#registry-format).
3. Declare the registry in `package.json`:

   ```json
   {
     "name": "@acme/hoist-acme",
     "description": "Acme overrides and components for Hoist apps.",
     "hoist": {"docRegistry": "docs/doc-registry.json"}
   }
   ```

4. Publish the docs. Add the registry and every doc file to the `files` field in `package.json`,
   if the package uses one.
5. Install the package in an app and run `npx hoist-docs ping` from the app's `client-app/`
   folder. The output names the library and its doc count, or the problem that stopped it from
   loading.

The `description` in `package.json` appears in the server instructions, so keep it to one short
sentence about what the library provides.

## Registry Format

The registry uses the same JSON schema as hoist-react's
[`docs/doc-registry.json`](./doc-registry.json). Only `entries[].id` is required, so a small
library can start with this:

```json
{
  "entries": [
    {"id": "docs/README.md", "title": "Acme Index", "mcpCategory": "index"},
    {
      "id": "grid/README.md",
      "title": "Acme Grids",
      "description": "AcmeGrid, the firm-standard wrapper around Hoist's grid.",
      "keywords": ["AcmeGrid", "AcmeGridModel", "GridModel", "export", "column presets"]
    }
  ]
}
```

| Field | Required | Description |
|---|---|---|
| `entries[].id` | Yes | Doc path relative to the package root. The tools reject a path that leaves the package root. |
| `entries[].title` | No | Display title. Defaults to the id. |
| `entries[].description` | No | One sentence for list output and search ranking. |
| `entries[].keywords` | No | API names and topics. Terms here boost the doc in search. |
| `entries[].mcpCategory` | No | Category for filtering. Defaults to `package`. |
| `entries[].aliases` | No | Extra short names. The tools scope them under the package name. |
| `entries[].mcpAudience` | No | Set to `maintainers` to serve the doc only in the library's own repo. See [Maintainer Docs](#maintainer-docs). |
| `mcpCategories` | No | Category ids and titles. An undeclared category gets a title from its id. |
| `mcpInstructions` | No | Guidance for agents, as a string or an array of lines. See [Agent Guidance](#agent-guidance). |
| `viewerCategories`, `entries[].viewerCategory` | No | Ignored by the MCP tools. The Toolbox doc viewer uses them. |

Use the hoist-react categories where they fit: `package`, `concept`, `devops`, `conventions`, and
`index`. Give the index doc the id `docs/README.md`. The tools treat that path as the library
index.

## Agent Guidance

A library can give agents short, direct guidance with `mcpInstructions` in its registry file. The
MCP server adds it to its instructions under the library's name, and the ping surfaces show it.
Agents read server instructions before they use any tool, so guidance reaches an agent that never
searches the docs.

Use guidance to say what the library changes about writing Hoist code. A client package of Hoist
overrides is the main case:

```json
{
  "mcpInstructions": [
    "Use acmeGrid and AcmeGridModel instead of grid and GridModel in Acme apps.",
    "Fetch through AcmeFetchService, which adds the Acme auth headers. Do not call XH.fetchService directly.",
    "Read @acme/hoist-acme/docs/README.md before you build a new screen."
  ],
  "entries": []
}
```

- **Keep it short.** The server cuts guidance longer than 1,500 characters and logs a warning.
  Put the details in the docs, and point to them.
- **State rules, not features.** Name the Hoist API that the library replaces, and what to use
  instead. The library description and index already say what the library provides.
- **Stay in scope.** The server tells agents that library guidance covers components and patterns
  only, and that it never overrides the user.

The tools trim each line and drop blank lines. If the value is not a string or an array of
strings, the tools ignore it and log a warning.

## Maintainer Docs

Some docs are for the people who work on the library, not for the apps that use it. A guide to
writing the library's docs is one example. In an app, such a doc only adds noise to search
results.

Mark the entry with `"mcpAudience": "maintainers"`. The tools then serve it only when the library
is the app root, as when an agent works in the library's own repo. An app that installs the
library never sees it. The entry stays in the registry for other readers, such as the Toolbox doc
viewer.

```json
{"id": "docs/doc-conventions.md", "mcpCategory": "conventions", "mcpAudience": "maintainers"}
```

## Doc IDs

Each id is the package name plus the registry path. The resolver also accepts these forms:

| Input | Resolves to |
|---|---|
| `@acme/hoist-acme/grid/README.md` | The doc, by its full id |
| `@acme/hoist-acme/grid` | Same doc, without `/README.md` |
| `hoist-acme/grid` | Same doc, with the package name unscoped |
| `@acme/hoist-acme` or `hoist-acme` | The library index, `docs/README.md` |
| `@acme/hoist-acme/<alias>` | The doc that declares the alias |
| `grid` | Hoist's `cmp/grid/README.md`, never a companion doc |

The `hoist://docs/{+docId}` resource accepts the same ids, for example
`hoist://docs/@acme/hoist-acme/grid/README.md`.

Write links between your docs as ordinary relative links, such as `../grid/README.md`. The tools
rewrite each one when they serve the doc, so an agent that follows it stays in your package:

- A link to a doc the tools serve becomes its full id, such as `@acme/hoist-acme/grid/README.md`.
- A link to any other file in the package, such as source or a maintainer doc, becomes a file
  path that the agent can open, such as `client-app/node_modules/@acme/hoist-acme/grid/AcmeGrid.ts`.
- Links that leave the package root, and links inside code, stay as written.

## Writing Docs Agents Can Use

- **Lead the index with what changes.** A package of client overrides should say early which Hoist
  components and patterns it replaces. For example: "Use `acmeGrid` instead of `grid` in Acme
  apps."
- **Name APIs in keywords.** Agents search with API names. Put each class, config key, and function
  that a doc covers in its `keywords`.
- **Put examples under specific headings.** A search result is one section, so a heading such as
  "Export a grid to Excel" finds its reader better than "Usage".
- **Link to Hoist docs by topic.** Agents can read hoist-react docs with the same tools, so a
  library doc need not repeat them.

## Discovery

The tools start from the package that consumes `@xh/hoist`. They check these places in order:

1. The `HOIST_MCP_APP_ROOT` environment variable, if set.
2. The working directory and its `client-app/` folder, then the same pair in each parent folder.
   The first `package.json` that is `@xh/hoist` or depends on it wins, so a run from inside an
   app, such as from `client-app/src`, still finds the app.
3. Otherwise, the first `package.json` in the working directory or its `client-app/` folder.

Claude Code starts the MCP server from the project root, so a standard Hoist app resolves to
`client-app/`. The app package itself can opt in too. An app can use this to serve its own docs to
the agents that work on it.

The tools find each dependency at `node_modules/<name>`, walking up from the app, as Node does.
They read only direct dependencies. A library that a companion library depends on must also be a
direct dependency of the app for its docs to load.

## Limits

- **Docs only.** The symbol tools (`hoist-search-symbols`, `hoist-get-symbol`, and
  `hoist-get-members`) cover `@xh/hoist` only. The server instructions tell agents to read a
  companion library's docs and then its source for exact APIs.
- **Loaded at startup.** The MCP server reads the registries when it starts. Restart it after an
  install changes a companion library.
- **Untrusted content.** Any opted-in dependency can add docs. The server instructions tell the
  client to treat all doc content as data, not as instructions. Library guidance is the one
  exception, and the instructions frame it as advice from the package authors.
- **Load problems are not fatal.** A missing registry, a missing doc file, or a bad path skips that
  item, and the tools log a warning to stderr and report it in `hoist-ping` and `hoist-docs ping`.
  A field of the wrong type falls back to its default. Only `entries` and `mcpCategories` warn when
  they are not lists, so run `hoist-docs list` to check that titles and categories came through.

See the [MCP Server README](../mcp/README.md#companion-library-docs) for how the tools implement
this.
