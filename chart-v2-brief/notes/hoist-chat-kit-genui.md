# hoist-chat-kit generative UI - findings for Chart V2

Researched 2026-11-15. Read only. Paths are relative to the repo named in each section.
`[bb]` = hoist-chat-kit branch `genui-building-blocks` (worktree
`~/dev/hoist-chat-kit-worktrees/genui-building-blocks`). Line numbers are at `d800d74`.

## 1. Branches

All local only, no upstreams. Each newer branch contains the older ones (checked with
`git merge-base --is-ancestor`).

| Branch | Head | Date | Purpose |
|---|---|---|---|
| `genui-building-blocks` | `d800d74` | 2026-11-15 | Registers the new Hoist 91 blocks (`ProgressBar`, `Steps`, `KeyValueList`, `ItemList`, `Sparkline`, `Separator`) plus `RadioInput` and `Slider` as specs. D130, D131. **Most current - read this one.** |
| `genui-ui-formats` | `6f62aa8` | 2026-11-14 | Integration branch, about 75 commits off `develop`. Merges the three below. Base of `genui-building-blocks`. |
| `openui-interactive` | `a3c9e9d` | 2026-11-14 | OpenUI Lang state: `$variables`, `@Set`, `Query()`, the gate and call budget, forms and inputs. D126, D127, D129. |
| `genui-hoist-components` | `db5f85b` | 2026-11-14 | Specs over Hoist `TabContainer`, `Card`, `Banner`, `Badge`, `Separator`, `TreeMap`. Chart text escaping (`8bf3236`, `402f09c`). D128. |
| `ag-ui-shared-state` | `20fda42` | 2026-11-13 | `ChatModel.agentState` from AG-UI `STATE_SNAPSHOT` / `STATE_DELTA` (D125). Also carries `c532cb2`: text formats, partial adapter docs, OpenUI Lang format, metrics on Hoist `StatCard`. |
| `develop` | `a026941` | 2026-11-05 | 1.x line, now 2.0.0-SNAPSHOT. Has the catalog, grid, chart, metrics, card. No text formats, no OpenUI, no agent state. |
| `main` | - | 2026-11-02 | 1.0.0 release. |
| `spike/ag-ui-client` | `eb1a522` | 2026-10-17 | Old spike of the official AG-UI client and conformance corpus. Not genUI. |

- Chart code is identical on `genui-ui-formats` and `genui-building-blocks`. Chart files last
  changed on `genui-hoist-components` (escaping).
- Merge order (handoff `README.md`): hoist-react `genui-building-blocks` into `develop` (91
  snapshot), then kit `genui-ui-formats`, then kit `genui-building-blocks`, then Toolbox branches.
- Paired branches: hoist-react `genui-building-blocks` (`2dd8e8407`, new components),
  Toolbox `genui-building-blocks` (`42db92ea`, demo pages and OpenUI lab).
- hoist-react `chart-spike` has nothing genUI related (grep hits are only "genuine").

## 2. Architecture

### Core idea

- App owns a `ChatUiCatalog` of `ChatUiComponentSpec`s. Model may name only catalog components
  and pass only props that validate. Nothing the model writes runs as code.
  `[bb] genui/README.md:28-57`, D15 (`DECISIONS.md:354`).
- Every built-in spec is a thin layer over a hoist-react component (D124 `DECISIONS.md:2593`,
  D128 `:2680`, D130 `:2967`). The kit holds chat components only.
- Every answer is a `ChatUiDocument`: flat map of elements keyed by id, children by id, so it
  streams in any order. `[bb] genui/README.md:93-130`.

### Delivery modes (how the agent emits UI)

`[bb] genui/README.md:132-158`, D22 `:483`, D121 `:2498`.

| Mode | Wire | Notes |
|---|---|---|
| `tools` (default) | One client tool per component, `show_<name>`, `display: 'inline'`. Params = the props JSON Schema | Per-component tools judged more reliable than one union tool. Each render costs a model step. |
| display tools | Same tools registered by a server-run loop | Kit renders from the call input, no `execute`. |
| text format | UI in reply text. `tags` (`<ui-chart .../>`) default. `openui` (OpenUI Lang) via `genui/openui` | Cheapest in tokens. **No retry**: what the model writes is what the user sees (`genui/openui/README.md:318-331`). |
| `document` | `show_ui` tool taking a whole document, or `xh.chat.ui` data part | For nested layouts. |
| adapters | `ChatUiAdapter.translate(payload, {catalog, isPartial})` for a protocol payload in a data part (AG-UI `ACTIVITY_SNAPSHOT` or `xh.chat.data`) | Seam for A2UI. Kit ships `openUiLangAdapter()` only. `genui/README.md:743-790`. |

- "OpenUI" = Thesys OpenUI Lang. Kit uses `@openuidev/lang-core@1.1.0` (exact pin) for parser,
  prompt grammar, store, evaluator and query manager. Not its React renderer. D122 `:2550`,
  D127 `:2758`. Library is derived from the catalog as plain JSON Schema, no Zod.
- OpenUI args are **positional, in props-schema order** (default slot first, then props, then
  named slots). `genui/openui/README.md:84-90`. A rich spec yields long call signatures. Toolbox
  replay shows `DataChart` with 13 positional args:
  `DataChart("P&L by sector", "<id>", null, "pnl|desc", null, null, "millions", "column", "sector", ["pnl"], null, null, true)`
  (Toolbox `[bb] client-app/src/desktop/tabs/chatkit/openui/OpenUiReplay.ts:70`).
- Schema order also drives the generated instruction "write props in schema order", so streaming
  renders the first props first. `genui/README.md:356-357`.

### Validation

- Built-in JSON Schema subset, no Ajv (CSP forbids `new Function`). D32 `DECISIONS.md:604`.
  Constructor **throws** on unsupported keywords: `$ref`, `$defs`, `allOf`, `not`, `if`,
  `exclusiveMinimum`, `uniqueItems`, `multipleOf`, `prefixItems`, `patternProperties`.
  `genui/README.md:1011-1039`.
- Supported: `type` (incl. list), `required`, `properties`, `additionalProperties`, `enum`,
  `const`, `items`, `minItems`/`maxItems`, `minLength`/`maxLength`, `pattern`, `minimum`/`maximum`,
  `anyOf`, `oneOf`. Each has a defined partial-streaming behavior (table at `:1023-1035`).
- Spec `validate(props) => string[]` for cross-field checks, runs on complete props only.
- `additionalProperties: false` everywhere. Every array and string must be bounded.
- Caps per document: `maxElements` 50, `maxDepth` 8, `maxInlineRows` 500 (`:991-997`).

### Errors back to the model

- Tools mode: `execute` validates, and on failure throws
  `Invalid props - nothing was shown. Fix and retry:\n- <path>: <msg>`
  (`[bb] genui/ChatUiCatalog.ts:1251-1254`, `:1489-1492`). Paths like
  `series[0].data[3]: ...`, in a document `elements.chart.props.rows[3].value`.
- Success returns `spec.result(props)` or `Rendered <name> for the user.`
- Text formats get no retry. Invalid element renders as a fallback caption with "View input".
  The rest of the document still renders. The OpenUI gate refuses runaway programs with a
  plain-words caption. `genui/openui/README.md:182-260`.

### State

Three distinct mechanisms:

1. **Component state props** - `stateProps: ['value']` plus `context.setProp()`. Catalog keeps
   the value, or writes it to the document state when bound. Bound values are not
   schema-checked, so `render` must accept any value. `genui/README.md:359-400`, D126 `:2721`.
2. **Document state** - `ChatUiDocument.state: ChatUiStateSpec` with `create()` and `resolve()`.
   `resolve()` runs in a MobX observer and returns a plain document. OpenUI `$variables` run on
   this. `genui/README.md:792-858`.
3. **AG-UI shared state** - `ChatModel.agentState`, plain JSON, observable. `STATE_SNAPSHOT`
   replaces, `STATE_DELTA` JSON-patches. Sent back on each request as `state`. App writes with
   `setAgentState()` only between turns (`canSetAgentState`). `prepareAgentState` injects app
   values per step. Kit does not render or store it - shape is the agent's. D125 `:2616`,
   `[bb] core/README.md:585-687`, `docs/protocols.md:60`.

Plus `contextProviders` (`core/README.md:554-583`): `getContext()` runs before every step, sent
as `ChatRunRequest.context` (AG-UI `context` entry). The documented way to tell the model the
current state of a grid or dashboard.

### Rendering

- Spec `render(props, context)` returns a Hoist component, may use hooks (`useLocalModel`).
- Built-ins (`[bb] desktop/cmp/genui/README.md:66-87`): grid (`ChatUiGrid` preview plus Hoist
  `Grid` full tier), **chart (Hoist `Chart`)**, metrics (`StatCardStrip` with `Sparkline` trend),
  card, stack, text, tabs (`TabContainer`), section (`Card`), callout (`Banner`), badges,
  divider (`Separator`), treemap (Hoist `TreeMap`), progress, steps, keyValues, list, form,
  button, eight inputs.
- Two tiers: inline preview and an expanded full tier in the chat side panel or a dialog
  (`desktop/cmp/genui/README.md:132-148`).

### User edits back to the agent

- Actions (`chatUiActionSchema()`): `send` (user message plus flat `context` of at most 8 short
  values), `openUrl`, `navigate`, `callTool`, `app`, `state`. Each shows exactly what it sends.
  `genui/README.md:676-712`, D17, D56.
- Forms send field values as `send` context; lists as JSON (D129, D131).
- OpenUI `@ToAssistant(...)` maps to `send`. `Query()` re-runs listed read-only client tools
  when `$variables` change, **without** the model seeing results. No `Mutation()`.
- `setAgentState()` between turns. `contextProviders` every step.
- No path reports a user's change to a chart (the expanded view's type and axis switchers are
  local only, `desktop/cmp/genui/ChatUiChartView.ts:139`).

## 3. Charts today

Files (`[bb]`): `desktop/cmp/genui/ChatUiChart.ts`, `ChatUiChartView.ts`,
`impl/ChatUiChartData.ts`, `impl/ChatUiChartMenu.ts`, `genui/ChatDataView.ts`.

- `chatUiChartSpec(opts)` (`ChatUiChart.ts:147-155`) returns one of two specs:
  - inline (`:157-257`): `{title?, type, xAxis?, yAxis?, series}`.
  - by reference (`:259-302`): `{title?, data: artifactId, ...ChatChartView}`, with
    `dataProps: [{name: 'data', pageSize: maxRows, maxRows}]`.
- Types: `line | column | bar | area | pie` inline; the view adds `scatter`
  (`ChatDataView.ts:60`). One y-axis only. Single `yAxis.format` and `decimals`.
- No Highcharts passthrough. Spec maps plain props to a Highcharts config in
  `toHighchartsConfig()` (`impl/ChatUiChartData.ts:50-114`): `animation: false`, transparent
  background, compact axis labels, shared tooltip, donut pie with `innerSize: '50%'`.
- `ChartModel` created once the type and axes are complete, with `xhImpl: true`
  (`ChatUiChart.ts:537-548`). Layout changes call `setHighchartsConfig()`; series stream into
  the same model via `setSeries()` (`:461-478`).
- Inline series are converted to an artifact for the expanded view (`toChartArtifact()`,
  `ChatUiChartData.ts:244`), so the full tier always draws a `ChatChartView` over an artifact.
- `validateChartProps()` (`ChatUiChartData.ts:334-374`): pie takes exactly one series of named
  slices; datetime axis needs `[date, value]` pairs; no more values than categories.
- Text escaping: every name, category and title is HTML-escaped because Highcharts reads it as
  markup; `decodeExportData` reverses it for CSV (`ChatUiChartData.ts:445-458`). D128.
- Limits: schema `maxSeries` 8, `maxPoints` 500, by-ref `maxRows` 5,000. Inline draws at most
  `maxInlineSeries` 5, sampled to `maxInlinePoints` 500 (`ChatUiChart.defaults`).
- Card UI: title in a 28px header strip, fixed height `--xh-chat-chart-height` (220px, 160px
  compact), legend only for 2+ series, 2nd series dashed, menu with Copy Image, Download PNG,
  Download CSV, Expand. `aria-label` on the plot. `desktop/cmp/genui/README.md:271-308`.
- States: `building`, `waiting`, `loading`, `ready`, `missing`, `tooLarge`, `failed`, `empty`,
  `invalid` (`ChatUiChart.ts:387-392`). Empty offers "Show as Table".
- Other chart-like specs: `metrics.trend: number[]` draws a Hoist `Sparkline`; `treemap` over
  Hoist `TreeMap` needs `heatmap` and `treemap` Highcharts modules.
- Toolbox OpenUI lab registers both `chart` and `dataChart` (by ref) - `[bb] Toolbox
  client-app/src/desktop/tabs/chatkit/openui/OpenUiLabCatalog.ts`.

Noted limitations:

- A `Query()` result carries no artifact, so `DataChart` cannot chart it; the lab tells the model
  to copy `firstRows` into an inline `Chart` (`genui/openui/README.md:641-643`, lab
  `INSTRUCTIONS`).
- A view applies only to the loaded page; apply it only when `handle.isComplete`
  (`genui/README.md:660-666`).
- Older list-shaped specs, the chart included, fail as a whole past `maxItems`. The four new
  specs show the first N and "N more not shown" (`52fcfe7`). Handoff calls the catalog-wide fix
  open (`hoist-chat-kit.md`, "Open questions").
- Live run 1: model drew unrelated price series as "trends" when no tool had the history
  (`live-run-2026-11-15.md`). Fixed only by prompt text (`d800d74`, Toolbox `42db92ea`), not
  yet tried live.
- Live run 3: progress intents fixed at the default `$limit`; spec cannot compute an intent from
  state.

## 4. Building blocks and family rules

**Building blocks (D130, `DECISIONS.md:2967-3000`; handoff `README.md`):**

- When the catalog needs a block that Hoist lacks, build it **in hoist-react** as a
  general-purpose component any Hoist app would use. Then register it in the kit as a spec.
- The block takes plain data, renders text as text, copes with odd values.
- Kit must not build the block itself, nor patch a Hoist gap with CSS or a wrapper.
- Spec rules from D128 (`:2680-2720`):
  - Plain data, matched by position (no functions, no `TabConfig`).
  - Model text is never markup (escape for Highcharts, rendered markdown for `Banner`).
  - One Hoist model for the life of the component, updated as props stream.
  - Catalog name says what it is for, not the implementation.
- Naming: public genUI names start `ChatUi` / `chatUi`, factories end `Spec` (D18 `:427`).

**Family rules (handoff `family-rules.md`)** for new hoist-react components:

1. Null means unset: `null` and `undefined` both take the default, spec per numeric prop.
2. Blank caption-like `ReactNode` props (`label`, `title`, `subtitle`, ...) render nothing when
   null, boolean, or empty/whitespace string. Use `isBlankNode()` from `@xh/hoist/utils/react`.
3. Display values: booleans are data, not blank (`KeyValueList` shows `true` / `false`).
4. Intent colors via per-component vars `--xh-<component>-<intent>-color` in
   `styles/vars.scss`. No component SCSS reads `--xh-intent-*` directly.
5. Long text wraps. No ellipsis unless there is a `titleIfTruncated` tooltip.
6. `label` is always a visible caption. Accessible name goes through
   `domAttrs: {'aria-label': ...}`.
7. Fill width as a block. No `width: 100%` in SCSS.
8. Shared vocabulary: `omit?: boolean` on entry shapes, null entries skipped, numbering counts
   visible entries, `labelPosition` vocabularies documented, `status: 'error'` is not an
   `Intent`.
9. Docs: section in `cmp/README.md` and row in `docs/README.md`.
10. Specs test contracts, not render detail.
11. Changelog bullets at most three lines; TSDoc lines within 100 chars.

## 5. Integration points for a Chart V2 spec

A new chart registers as a `ChatUiComponentSpec`, normally returned by a `chatUi<Name>Spec(opts)`
factory in `desktop/cmp/genui/`.

`[bb] genui/ChatUiComponentSpec.ts:40-115` (doc comments removed):

```ts
export interface ChatUiComponentSpec<P = PlainObject> {
    name: string;
    toolName?: string;
    description: string;
    props: PlainObject;                          // JSON Schema, tool input schema
    validate?: (props: P) => string[];
    render: (props: P, context: ChatUiRenderContext) => ReactNode;
    result?: (props: P) => string;
    example?: P;
    slots?: string[];
    dataProps?: (string | ChatUiDataPropSpec)[];
    stateProps?: string[];
    standalone?: boolean;
}
export interface ChatUiDataPropSpec { name: string; pageSize?: number; maxRows?: number; }
```

`ChatUiRenderContext` (`:138-171`) adds `catalog`, `element`, `children`, `slots`,
`data: Record<string, ChatDataHandle>`, `artifacts`, `runActionAsync(action)`,
`setProp(name, value)`, plus `part`, `isPartial`, `state`, `chatModel`, `messageId`.

Chart view grammar (`[bb] genui/ChatDataView.ts:42-80`):

```ts
export interface ChatDataView {
    columns?: (string | ChatDataViewColumn)[];
    sortBy?: string;                 // 'field' or 'field|desc'
    filter?: ChatDataFilter[];       // ops: eq neq gt gte lt lte in notNull
    top?: number;
    units?: ChatDataUnits;           // none thousands millions billions
}
export type ChatChartType = 'line' | 'column' | 'bar' | 'area' | 'pie' | 'scatter';
export interface ChatChartView extends ChatDataView {
    type: ChatChartType;
    x: string;
    y: string[];
    groupBy?: string;
    stacking?: 'normal' | 'percent';
    colorBySign?: boolean;
}
```

Current inline props (`[bb] desktop/cmp/genui/ChatUiChart.ts:58-91`):

```ts
export interface ChatUiChartSpecProps {
    title?: string;
    type: ChatUiChartType;            // 'line' | 'column' | 'bar' | 'area' | 'pie'
    xAxis?: {type?: 'category' | 'datetime'; categories?: string[]; title?: string};
    yAxis?: {title?: string; format?: ChatUiNumberFormat; decimals?: number};
    series: ChatUiChartSeries[];      // {name, data: (number | [number | string, number])[]}
}
```

Reusable schema pieces:

- `CHAT_DATA_VIEW_PROPERTIES`, `CHAT_CHART_VIEW_PROPERTIES` (`genui/ChatDataView.ts:86`,
  `:149-167`), `findDataViewProblems()`, `applyDataView()`.
- `CHAT_UI_NUMBER_FORMAT_SCHEMA` (`number | percent | currency | none`, percent takes a
  fraction) and `CHAT_UI_DECIMALS_SCHEMA` (0-6) in `desktop/cmp/genui/ChatUiFormat.ts:10-22`.
- `fmtChatUiNumber`, `chatUiFrame`, `chatUiSkeleton`, `chatUiExpandButton`
  (`desktop/cmp/genui/ChatUiFrame.ts`).
- `chatUiActionSchema({types})` for any click-through actions.
- `ChatUiSpecOptions {name?, description?}` (`desktop/cmp/genui/Types.ts`), extended per factory
  with limits.

Tool definition shape that reaches the model (`genui/ChatUiCatalog.ts:1243-1279`, `:113-117`):

```ts
{ name: `show_${name}`, description: `${description}\n\nCalling this tool shows the component
  to the user, inline in the chat.`, parameters: spec.props, display: 'inline' }
// export: ChatUiToolSchema {name, description, parameters}
```

Schema conventions to follow:

- `type: 'object'`, `additionalProperties: false`, explicit `required`, every array `maxItems`,
  every string `maxLength`, `pattern` paired with `maxLength`.
- No `$ref` / `$defs` / `allOf` / `if` - inline shared types, move cross-field rules to
  `validate`.
- Props in priority order (layout first, data last), since OpenUI args are positional and
  streaming renders in schema order. Keep the required ones few and first.
- Descriptions are model-facing: say when to use the type, with a short example
  (`ChatUiChart.ts:353-362`). `example` feeds the prompt; the OpenUI prompt spec checks that each
  example it writes parses and renders (`f641d71`).
- Handle partial props: render a skeleton until the type and axes are complete, drop the last
  array item while partial, create the Hoist model once and update in place.
- Escape all model text before it reaches Highcharts.
- Catalog `version` is a hash of names, descriptions, schemas, examples, etc. Changing the chart
  schema changes it; stored replies need `migrations` keyed by the old version
  (`genui/README.md:736-741`).
- Prompt size matters: full lab catalog prompt about 28,000 chars (`hoist-chat-kit.md`).
- Kit `@xh/hoist` floor is 91 (D130). A Chart V2 in hoist-react would raise it again.

Prior art outside the chat: Toolbox `feature/chat-kit-guide-ui` (2026-10-28) Weather V2
Dashboard Agent (`client-app/src/examples/weatherv2/`). Client tools `set_dashboard`,
`add_widget`, `update_widget`, ... edit a `DashCanvas` spec. Inline answers use `chatUiChartSpec`.
Kit's own `dashCanvasTools` helper with a per-view `settingsSchema` was withdrawn (D51, D80
`DECISIONS.md:1471`; code on `archive/helpers`).

## 6. Open problems a chart spec could help with

- **No dashboard placement path in the kit.** genUI charts render inline in chat or the side
  panel. Placing a chart on a dashboard next to a grid is app tools over `DashCanvas` today.
  A serializable Chart V2 config could be one schema shared by `show_chart` and a dashboard
  widget's settings.
- **No feedback of chart edits.** Expanded-view type and axis switches never reach the model.
  A chart model that serializes its current view could feed `contextProviders` or a `send`.
- **Query results cannot be charted by reference.** Only inline copies of `firstRows`. A chart
  over a plain row array (not just an artifact) would close this.
- **Made-up trends.** Model fills a trend slot with unrelated series (live run 1). A chart spec
  that names the source of each series (tool result id) and its unit would make this checkable
  in `validate`.
- **State-derived styling.** A spec cannot compute intent or thresholds from `$variables`
  (live run 3). Plot lines or bands bound to a `$variable` (for example a limit) would be a
  natural chart prop.
- **Fail-whole past limits.** Chart still fails its schema past `maxSeries` / `maxPoints`. The
  newer pattern is "show first N, say N more not shown" (`52fcfe7`). Text formats get no retry,
  so this matters there.
- **One y-axis, one number format per chart, no panes, no plot lines or bands.** Financial uses
  (dual axis, price plus volume, drawdown, limit lines) are not expressible.
- **Long positional signatures in OpenUI.** `DataChart` already takes 13 args. A richer chart
  needs nested option objects or several narrower specs to stay writable.
- **Escaping.** Every model string to Highcharts must be escaped (D128). A Chart V2 that takes
  formatter strings or HTML labels must keep that rule.
- **v2 kit breaking changes still to confirm** (`hoist-chat-kit.md`): `AgUiCodecConfig.state`
  removed, `ChatUiMetrics` removed, `ChatUiAdapter.translate()` takes a context object. Issue #33:
  a LangGraph capture and Toolbox example for AG-UI shared state.
