# Hoist-React Documentation Conventions

Reference guide for writing and updating hoist-react package documentation.

## README Structure

Each package README follows a 7-section template:

### 1. Overview
What the package does and why it exists. Include key features as a bullet list.

### 2. Architecture
Key classes, their relationships, and class hierarchy diagrams using ASCII art:
```
ModelName
├── property: Type           # Description
├── property: Type[]         # Description
└── Methods:
    ├── methodAsync()        # Description
    └── method()             # Description
```

### 3. Configuration Pattern
How to configure/create instances. Show the Spec-to-Object pattern if applicable.
Use constructor-based initialization for complex models (GridModel, FormModel, etc.).

### 4. Common Usage Patterns
Code examples for typical use cases. Use element factory style (not JSX):
```typescript
panel({
    title: 'Users',
    items: [grid({model: gridModel})],
    bbar: toolbar(button({text: 'Save'}))
})
```

### 5. Properties/API Reference
Tables summarizing key configuration options. Format:
```markdown
| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Description here. Fold default values into the description |
```
Do NOT include a separate "Default" column — fold defaults into descriptions.

### 6. Extension Points
How to customize or extend behavior.

### 7. Related Packages
Links to connected packages using relative paths.

## Tone and Content Guidelines

- Write for both AI assistants and human developers
- Prioritize patterns and relationships over exhaustive API documentation
- Include runnable code examples
- Explain "why" not just "what"
- Reference specific files where helpful (e.g., `See Column.ts for full API`)
- Keep examples practical and representative of real usage

## Anti-Pattern Documentation

Use a two-part approach:

1. **Inline warnings** — `**Avoid:**` prefix for brief notes near relevant content
2. **Common Pitfalls section** — Dedicated section at end for significant anti-patterns

For correct vs incorrect code, use markers:
```typescript
// ✅ Do: Description of correct approach
correctCode();

// ❌ Don't: Description of what's wrong and why
incorrectCode();
```

## Terminology Conventions

- Use `config` when referring to model or class constructor args
- Reserve `props` for actual React Component props
- Prefer direct assignment for `@bindable` properties (`model.myProp = value`)
  over calling auto-generated setters (`model.setMyProp(value)`)
- Only call explicit `setFoo()` when the class defines one (it likely has extra logic)

## Code Example Conventions

- Use element factory style over JSX
- No `myApp.` prefix in localStorageKey examples (auto-namespaced by framework)
- Show constructor-based initialization for complex models
- Keep examples practical — show real patterns from Toolbox when possible

## Documentation Index Entry Format

When a new package README is completed, add an entry to the relevant section in
`/docs/README.md` under "Package Documentation". Format:

```markdown
| [`/package/`](../package/README.md) | One-sentence description | Key, Topics, Listed, Here |
```

(Note: paths are relative from `docs/`, so package READMEs use `../` prefix.)

Place entries in the appropriate category section:
- **Core Framework** — `/core/`, `/data/`, `/svc/`
- **Components** — `/cmp/` and sub-packages, `/desktop/`, `/mobile/`
- **Utilities** — `/format/`, `/appcontainer/`, `/utils/`, `/promise/`, `/mobx/`
- **Concepts** — Cross-cutting docs in `/docs/`
- **Other Packages** — Everything else

## Documentation Roadmap

Track progress in `docs/README-ROADMAP.md`:
- Update status from `Planned` → `Done` with a link when a README is completed
- Add new entries for newly created sub-packages
- Add progress notes with date stamps for documentation sessions

When updating the roadmap, also ensure the corresponding entry in `docs/README.md` is added
or updated to keep the documentation index in sync.
