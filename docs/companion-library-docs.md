# Companion Library Docs

A companion library is an npm package that builds on Hoist. Examples are `@xh/hoist-chat-kit` and
a client firm's shared package of Hoist overrides and components. Such a library can serve its docs
and API to agents through [Hoist Docs](https://github.com/xh/hoist-docs), next to Hoist's own. It
needs no MCP server of its own.

The library builds a Hoist Docs index when it publishes and ships it inside its npm package, as
hoist-react does. When an app installs the library, Hoist Docs finds the index and serves its docs
and symbols with the same tools agents already use for Hoist.

## How It Works

1. The library's `prepack` script runs the Hoist Docs builder, which writes one index file: the
   docs listed in the library's doc registry, plus every exported TypeScript symbol and its members.
2. The file ships in the published package, and the library's `package.json` declares it.
3. In an app, Hoist Docs looks through the installed packages in `client-app/node_modules` for that
   declaration and serves every index it finds. The index is always the installed build, so a
   snapshot gets its own docs.

## Opting In

1. Write the docs as markdown files in the package: package READMEs, concept docs, or both. Use
   `##` and `###` headings. Search ranks and returns docs by section.
2. Add a registry file at `docs/doc-registry.json`. See [Registry Format](#registry-format).
3. Add the builder and declare the index in `package.json`:

   ```json
   {
     "name": "@acme/hoist-acme",
     "description": "Acme overrides and components for Hoist apps.",
     "scripts": {
       "prepack": "hoist-docs-build --root . --file hoist-docs/index.json.gz"
     },
     "hoistDocs": {"id": "acme", "index": "hoist-docs/index.json.gz", "exclude": ["test"]},
     "devDependencies": {"@xh/hoist-docs-builder": "^1.0.0"}
   }
   ```

   - `id` is the library's short name in the tools: agents pass it as `library`, and its doc ids
     carry it as a prefix (`acme:docs/README.md`). Pick one that will not clash with another
     library's.
   - `exclude` lists folders that hold no published source, left out of the symbol index.
   - If the package has a `files` field, add `hoist-docs` to it. Add `/hoist-docs/` to
     `.gitignore`.
4. The builder needs the package's dependencies installed, for type resolution, as any publish job
   already has them. It takes the version from `package.json`, so set the version before
   publishing, as `npm version` does.
5. Install the package in an app and call `hoist-ping` from the agent. It lists the library with
   its version and doc and symbol counts.

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
| `entries[].id` | Yes | Doc path relative to the package root. The builder rejects a path that leaves the package root. |
| `entries[].title` | No | Display title. Defaults to the id. |
| `entries[].description` | No | One sentence for list output and search ranking. |
| `entries[].keywords` | No | API names and topics. Terms here boost the doc in search. |
| `entries[].mcpCategory` | No | Category for filtering. Defaults to `package`. |
| `entries[].aliases` | No | Extra short names for the doc. |
| `entries[].mcpAudience` | No | Set to `maintainers` to leave the doc out of the index. See [Maintainer Docs](#maintainer-docs). |
| `mcpCategories` | No | Category ids and titles. An undeclared category gets a title from its id. |
| `mcpInstructions` | No | Guidance for agents, as a string or an array of lines. See [Agent Guidance](#agent-guidance). |
| `viewerCategories`, `entries[].viewerCategory` | No | Used by the Toolbox doc viewer. |

Use the hoist-react categories where they fit: `package`, `concept`, `devops`, `conventions`, and
`index`. Give the index doc the id `docs/README.md`.

## Agent Guidance

An `@xh` library can give agents short, direct guidance with `mcpInstructions` in its registry
file. Hoist Docs adds it to its server instructions under the library's name. Agents read server
instructions before they use any tool, so guidance reaches an agent that never searches the docs.

Hoist Docs uses guidance only from packages in the `@xh` scope, so an installed dependency cannot
steer the agent. A library outside it still ships its docs and symbols; its `mcpInstructions` are
dropped. Put what such a library changes about writing Hoist code at the top of its index doc
instead.

- **Keep it short.** The builder cuts guidance longer than 1,500 characters and logs a warning.
  Put the details in the docs, and point to them.
- **State rules, not features.** Name the Hoist API that the library replaces, and what to use
  instead.

## Maintainer Docs

Some docs are for the people who work on the library, not for the apps that use it. A guide to
writing the library's docs is one example. In an app, such a doc only adds noise to search
results. Mark the entry with `"mcpAudience": "maintainers"` and the builder leaves it out of the
index. The entry stays in the registry for other readers, such as the Toolbox doc viewer.

```json
{"id": "docs/doc-conventions.md", "mcpCategory": "conventions", "mcpAudience": "maintainers"}
```

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

## Limits

- **Installed packages only.** Hoist Docs looks at the packages directly in the app's
  `node_modules` (and their `@scope/` folders), not at nested dependencies.
- **Loaded at startup.** Restart the agent after an install changes a library.
- **Untrusted content.** All doc content is served as data, not as instructions, and the server
  instructions tell the agent so.
- **Problems are not fatal.** A missing or malformed declaration skips that library with a warning
  on stderr; Hoist's own docs are still served.
