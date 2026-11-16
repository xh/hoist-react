# 11 - GenUI and agent integration

How Chart V2 plugs into hoist-chat-kit generative UI and into in-app agents that build reports.
Sources: `../notes/hoist-chat-kit-genui.md` (branches read: `genui-building-blocks` @ `d800d74`,
the most current; also `genui-ui-formats`, `openui-interactive`, `genui-hoist-components`,
`ag-ui-shared-state`, `develop`, `main`).

## 1. Where chat-kit is today

- The app owns a `ChatUiCatalog` of `ChatUiComponentSpec`s. Each is a thin layer over a
  hoist-react component, with a JSON Schema for props (a subset: no `$ref`, `allOf`, `if`;
  `additionalProperties: false`; every array and string bounded).
- Default delivery is one tool per component, `show_<name>`. Bad props return
  `Invalid props - nothing was shown. Fix and retry:` plus path-prefixed problems.
- The chart spec today (`chatUiChartSpec`) is a small inline chart over Highcharts: line,
  column, bar, area, pie; one y-axis; one number format; at most 8 series and 500 points; it
  fails whole past its caps. No panes, no plot bands, no time-series features.
- Open problems the handoff notes list that Chart V2 can close: no path to place a chart on a
  dashboard; user edits to a chart never reach the agent; `Query()` rows cannot be charted by
  reference; the model drew unrelated series as "trends"; financial charts are not expressible;
  OpenUI calls get long (13 positional args already).
- chat-kit hand-writes its own portable grid column and form rule types. The portable pattern
  (09 section 8, 14) lets it use Hoist's instead, starting with charts.

## 2. Design principles

1. **One JSON shape, three uses.** The portable `TimeSeriesChartSpec` is the chat tool input, the
   dash widget's saved definition, and what `getSpec()` returns. The agent learns one shape, and
   it is the same shape a developer writes in code.
2. **Charts reference data; they do not carry it.** The agent names a source (on the widget) and
   fields (`series[].field`). Hoist loads the data. A series must name a real field of a real
   source, and validation checks that. This removes the "made-up trend" failure. Inline data
   stays only for small chat answers, under the existing caps.
3. **Hoist validates, not the library.** No vendor publishes a JSON Schema (02). Hoist owns the
   schema and a semantic validator that knows the store's fields and the registries.
4. **The agent schema is a hand-written profile, not the full type.** No `highchartsConfig`, no
   literal colors, bounded enums. Keeps the prompt small.
5. **One tool per model method.** The agent never gets the Highcharts instance, and every tool
   writes exactly one layer, as the UI does (10).

## 3. Tools an agent calls

### 3.1 Discovery

```ts
list_data_sources(): {sources: {id, label, description, kind: 'timeSeries' | 'table' | 'matrix'}[]}

describe_data_source({id}): {
    id, label,
    fields: {name, label, type: 'date' | 'number' | 'int' | 'string', format?, isDimension?}[],
    timeField?: string,            // set for time-series sources
    rowCount, firstDate?, lastDate?,
    params?: {name, type, required, description}[]   // query inputs
}
```

Both read the app's data source registry (the `source` domain, 14). `describe_data_source` is
what makes field names checkable.

### 3.2 Chat-inline

`show_time_series_chart` - a chat-kit spec registered in the catalog. Props are
`{source, spec}`: the source ref plus the agent profile of the spec. It renders the real
`TimeSeriesChartModel` and `timeSeriesChart`, so the expanded side-panel tier gets the full
control surface for free.

### 3.3 Dashboards and reports

| Tool | Model call | Layer |
|---|---|---|
| `add_chart_widget({dashboard, source, spec, layout?})` | `DashCanvasModel.addView('timeSeriesChart', {state: {v, source, chart: {spec}}})` | - |
| `add_series({widgetId, series, index?})` | `addSeries` | definition |
| `update_series({widgetId, id, changes})` | `updateSeries` (only when `authorable`) | definition |
| `remove_series({widgetId, id})` | `removeSeries` | definition |
| `update_chart({widgetId, patch})` | `updateSpec` (JSON Merge Patch: arrays replace whole) | definition |
| `update_series_state({widgetId, changes: [{id, hidden?, type?, color?}]})` | `updateSeriesState` | state |
| `update_chart_state({widgetId, rebase?, range?, showNavigator?})` | state setters | state |
| `reset_chart({widgetId})` | `restoreDefaultsAsync` | clears state |
| `set_widget_source({widgetId, source})` | widget rebinds, model rebuilds | widget |
| `describe_chart({widgetId})` | see 3.4 | read |

Tool names follow chat-kit conventions (snake case, verb first). Short, single-purpose calls are
easier for a model to get right than one big patch.

### 3.4 Seeing what the user sees

```ts
interface ChartDescription {
    widgetId: string;
    source: {id: string; params?: PlainObject};
    spec: PortableTimeSeriesChartSpec;    // toPortable(getSpec({includeState: true})).value
    visibleRange?: {from: string; to: string};
    series: {id: string; name: string; visible: boolean; first: number; last: number;
             min: number; max: number; changePct?: number}[];   // over the visible range
    problems: string[];                   // load errors, empty data, unknown refs, `lost` paths
}
```

- `describe_chart` answers "what is on this chart". The summary stats let the agent talk about
  the chart without pulling raw points.
- A chat-kit `contextProvider` sends a compact description of every chart on the active
  dashboard each step. User edits are then visible to the agent on its next turn. This closes the
  "edits never reach the agent" gap.

## 4. Schema (agent profile)

Hand-written in chat-kit's JSON Schema subset, and tested to be a subset of
`PortableTimeSeriesChartSpec`. Excerpt:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["timeField", "series"],
  "properties": {
    "title": {"type": "string", "maxLength": 80},
    "timeField": {"type": "string", "maxLength": 64, "description": "The date field from describe_data_source."},
    "series": {
      "type": "array", "minItems": 1, "maxItems": 8,
      "items": {
        "type": "object", "additionalProperties": false, "required": ["id"],
        "properties": {
          "id": {"type": "string", "pattern": "^[A-Za-z][A-Za-z0-9_-]*$", "maxLength": 32},
          "name": {"type": "string", "maxLength": 60},
          "type": {"enum": ["line", "step", "area", "column", "candlestick", "ohlc"]},
          "field": {"type": "string", "maxLength": 64, "description": "A numeric field from describe_data_source."},
          "of": {"type": "string", "maxLength": 32, "description": "Another series id, to derive from it."},
          "transform": {
            "type": "object", "additionalProperties": false, "required": ["id"],
            "properties": {"id": {"enum": ["cumReturn", "returns", "drawdown", "rollingReturn", "rollingVol", "sma", "ema", "bollinger"]},
                           "args": {"type": "object", "additionalProperties": false,
                                    "properties": {"period": {"type": "integer", "minimum": 2, "maximum": 520}}}}
          },
          "splitBy": {"type": "string", "maxLength": 64, "description": "A dimension field. One series per value."},
          "pane": {"type": "string", "maxLength": 32},
          "color": {"enum": ["auto", "positive", "negative", "neutral", "accent", "series1", "series2", "series3", "series4"]},
          "hidden": {"type": "boolean"}
        }
      }
    },
    "panes": {
      "type": "array", "maxItems": 4,
      "items": {"type": "object", "additionalProperties": false, "required": ["id"],
                "properties": {"id": {"type": "string", "maxLength": 32}, "size": {"type": "number", "minimum": 0.1, "maximum": 1}}}
    },
    "rebase": {"enum": ["percent", "value"], "description": "percent = show % change from the first visible point."},
    "range": {"enum": ["mtd", "qtd", "ytd", "prev12Months", "all"], "description": "Initial window. Default all."},
    "showNavigator": {"type": "boolean"},
    "timeMarkers": {"type": "array", "maxItems": 20, "items": {"type": "object", "additionalProperties": false, "required": ["date", "label"],
      "properties": {"date": {"type": "string", "maxLength": 10}, "label": {"type": "string", "maxLength": 40}}}},
    "timeBands": {"type": "array", "maxItems": 10, "items": {"type": "object", "additionalProperties": false, "required": ["from", "to"],
      "properties": {"from": {"type": "string", "maxLength": 10}, "to": {"type": "string", "maxLength": 10}, "label": {"type": "string", "maxLength": 40}}}}
  }
}
```

Notes:

- `timeField` and `series` come first, because chat-kit renders in schema order while streaming
  and OpenUI arguments are positional.
- For OpenUI, register the chart as `TimeSeriesChart(source, spec)`, not a positional list of
  every key.
- Transforms appear only in object form here, to keep one shape for the model. Code may use the
  bare-string shorthand.
- Size: about 3,000 characters [estimate from the excerpt]. The current lab prompt is already
  about 28,000, so register only the chart profiles an app uses.

## 5. Validation and error feedback

Two passes, both return path-prefixed problems in chat-kit's format:

1. **Schema** (chat-kit's validator): types, enums, bounds.
2. **Semantic** (`validateSpec`), on complete props:
   - the source exists; required `params` are present.
   - every `field` exists in the store and is numeric; `timeField` is a date; `splitBy` is a
     dimension.
   - `candlestick` / `ohlc` series have open/high/low/close fields.
   - every `pane`, `axis` and `of` reference resolves; ids are unique.
   - every ref id (format, transform) is registered.
   - `rebase` with only transformed series warns (nothing to rebase).
   - series count after splitting and points per series against the large-data threshold (warn,
     not fail: the chart switches to its large-data path).

Example the spike produces (`control.html`, "Bad call" button):

```
Invalid change - nothing was applied. Fix and retry:
- series[4].field: 'NASDAQ' is not a numeric field of source 'navs'. Available: FUND, SPX, MSCIW, B6040
```

Listing the valid choices in the error is what should make one retry enough **[inferred - matches
chat-kit's design rationale; not measured here]**.

Partial streaming: render a skeleton until `timeField` and one complete series exist; create the
model once; apply later props with `updateSpec`. Drop the last array item while partial
(chat-kit rule).

Fail soft, not whole: past `maxItems` for series, show the first 8 and say how many were cut,
instead of failing the whole chart.

## 6. Safety and escaping

- Model text (titles, series names, marker labels) is plain text. The renderer escapes it before
  it reaches Highcharts, which reads labels as HTML (chat-kit decision D128).
- JSON carries no functions, only refs to functions the app registered. An agent can only choose
  among them.
- `highchartsConfig` is not in the agent profile. An agent cannot inject raw Highcharts options.

## 7. Build order

1. The data source registry and `describe_data_source` in the first app that builds reports,
   plus `validateSpec`.
2. `show_time_series_chart` in chat-kit over `TimeSeriesChartModel` (replaces the chart spec's
   time-series uses; keep the existing simple chart for category answers).
3. Dashboard tools as app tools first, then promote to a kit helper once two apps use them. The
   kit withdrew its earlier `dashCanvasTools` helper (D80), so prove the shape in apps first.
4. Context provider with chart descriptions.
