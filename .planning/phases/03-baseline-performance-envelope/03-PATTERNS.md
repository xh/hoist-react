# Phase 3: Baseline Performance Envelope - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 6 code files (2 hoist-react, 4 Toolbox) + report/stats artifacts
**Analogs found:** 6 / 6 code files (all exact or strong role-matches)

This is a methodology-and-measurement phase. The instrument (`data/measure` harness + Toolbox Data
Lab app) already exists and is verified. The only NEW code is small and additive:

1. `TargetsConfig` type + `DEFAULT_TARGETS` export - in `data/measure/types.ts` (hoist-react)
2. Pure `evaluateScorecard()` verdict function - new file in `data/measure/` (hoist-react)
3. Scorecard pass/fail badges + comparison target columns - in `DataLabPanel.ts` / `DataLabModel.ts` (Toolbox)
4. Run export/import (download JSON + file import) - in `DataLabModel.ts` / `DataLabPanel.ts` (Toolbox)

Everything else (`BASELINE.md`, distilled-stats JSON, ladder ViewManager profiles) is documents and
data, not code. Ladder profiles are serialized `ScenarioConfig` JsonBlobs authored through the
existing scenario ViewManager UI - no code needed (D-01).

## File Classification

| New/Modified File | Repo | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|------|-----------|----------------|---------------|
| `data/measure/types.ts` (add `TargetsConfig`, `MetricTarget`, `Verdict`, `Tier`, `DEFAULT_TARGETS`) | hoist-react | model / type schema | transform | existing `ScenarioConfig` block in same file | exact (same file) |
| `data/measure/ScorecardVerdict.ts` (new: pure `evaluateScorecard`) | hoist-react | utility (pure fn) | transform | `MeasurementProtocol.ts` pure stats helpers | exact |
| `data/measure/index.ts` (add barrel export) | hoist-react | config / barrel | - | existing `index.ts` | exact (same file) |
| `DataLabModel.ts` (export/import, verdict wiring, target compare rows) | Toolbox | model (HoistModel) | CRUD / file-I/O | existing `DataLabModel` methods (`recordRun`, `clearSavedRunsAsync`, `comparisonRows`) | exact (same file) |
| `DataLabPanel.ts` (scorecard badges, export/import controls, target cols) | Toolbox | component (hoistCmp) | request-response | existing `scorecard` / `comparisonPanel` factories in same file | exact (same file) |
| Run import file-select control | Toolbox | component | file-I/O | `FileChooser` + `FileChooserModel` (`desktop/cmp/filechooser`) | role-match |
| Run export (download JSON) | Toolbox | utility call | file-I/O | `downloadBlob()` in `utils/js/DownloadUtils.ts` | exact |
| `docs/planning/data2/BASELINE.md` + stats dir JSON | hoist-react | doc / data | - | no code analog (RESEARCH schema guidance) | n/a |

## Pattern Assignments

### `data/measure/types.ts` - add `TargetsConfig` + verdict types (BASE-04, D-05/D-07)

**Analog:** the existing `ScenarioConfig` / `DEFAULT_PROTOCOL` block in the SAME file. Mirror its
exact conventions: plain serializable interfaces (no class instances), rich JSDoc per field, a named
`const` default export alongside the interface, grouped under a `//---` banner comment.

**Serializable-interface + named-default pattern** (types.ts lines 120-137) - copy this shape for
`TargetsConfig` + `DEFAULT_TARGETS`:
```typescript
export interface ProtocolConfig {
    /** Iterations run and discarded before measurement ... */
    warmupIterations: number;
    measuredIterations: number;
    gcSettleMs: number;
}

export const DEFAULT_PROTOCOL: ProtocolConfig = {
    warmupIterations: 5,
    measuredIterations: 20,
    gcSettleMs: 50
};
```

**Discriminated-union knob pattern for `Verdict` / `Tier`** (types.ts lines 76, 84, 91, 230) - the
file already defines string-literal union types with per-member JSDoc; copy for `Verdict` and `Tier`:
```typescript
export type UpdateCadence = 'steady' | 'burst';
export type HeapMethod = 'performanceMemory' | 'measureUserAgentSpecificMemory';
```

**Scorecard shape the verdict reads** (types.ts lines 265-287) - `TargetsConfig` metrics map onto
these nullable stage fields; end-to-end latency = sum of the four `medianMs`:
```typescript
export interface Scorecard {
    engine: TimingStat | null;      // PRIMARY data-layer cost
    genTxn: TimingStat | null;
    bridgeCall: TimingStat | null;
    render: TimingStat | null;
    heap: HeapAttribution | null;   // null when memory pass skipped
    rowCounts: {leaf: number; aggregate: number; gridRows: number};
    ...
}
```

**Illustrative target shape** (final fields are Claude's discretion, per RESEARCH Pattern 2) - hybrid
floor + aspiration per D-07. `DEFAULT_TARGETS` stays UNPOPULATED / provisional until the D-08
human-verify checkpoint (RESEARCH anti-pattern: do not commit numbers pre-checkpoint):
```typescript
export interface MetricTarget {
    floor: number;        // baseline-derived regression guard (D-07)
    aspiration: number;   // business-need goal (~500x20 sub-second)
    unit: 'ms' | 'bytes' | 'count';
}
```

**CRITICAL:** Use `null` (not `undefined`), check with `== null`. No em dashes in JSDoc (use ` - `).
Copyright header block is mandatory (types.ts lines 1-6). Follow with `hoist-ts symbol ScenarioConfig`
before editing to confirm the current shape.

---

### `data/measure/ScorecardVerdict.ts` - pure `evaluateScorecard()` (BASE-04, D-05/D-06)

**Analog:** `data/measure/MeasurementProtocol.ts` - the harness core's pure, engine-agnostic stats
module. It is the exact template for a new pure, side-effect-free, unit-testable function that lives
in the core and is barrel-exported. This is "the one genuinely unit-testable unit" (RESEARCH).

**Module-doc + pure-function-export pattern** (MeasurementProtocol.ts lines 85-124) - copy this style:
a `//---` banner, a doc block explaining the math, and small exported pure functions that do not
mutate inputs:
```typescript
//------------------------------------------------------------------------------------------------
// Pure stats helpers (no library - computed directly per RESEARCH)
//------------------------------------------------------------------------------------------------

/** Median of a numeric sample ... Does not mutate the input. */
export function median(xs: number[]): number {
    if (xs.length === 0) return 0;
    const sorted = [...xs].sort((a, b) => a - b),
        mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
```

**Imports pattern** (MeasurementProtocol.ts line 8) - pull types from `./types`, nothing else; the
core imports no framework/UI/fetch:
```typescript
import {Scorecard, TargetsConfig, MetricVerdict} from './types';
```

**End-to-end latency derivation** (RESEARCH Code Examples; matches Scorecard nullable fields) - the
verdict function computes this internally:
```typescript
const endToEndMs =
    (sc.engine?.medianMs ?? 0) + (sc.genTxn?.medianMs ?? 0) +
    (sc.bridgeCall?.medianMs ?? 0) + (sc.render?.medianMs ?? 0);
```

Keep it PURE: `(sc: Scorecard, targets: TargetsConfig) => MetricVerdict[]`. No MobX, no XH, no
side effects. Handle nullable stage/heap fields (a metric whose underlying stat is null yields no
verdict row, mirroring `comparisonRows`).

---

### `data/measure/index.ts` - barrel export (BASE-04)

**Analog:** the file itself (7 `export * from` lines). Add `export * from './ScorecardVerdict';`
in the same alphabetized-by-dependency ordering. `types.ts` additions need no new line (already
exported). This is how `data/index.ts` -> consumers pick up `TargetsConfig` + the verdict fn.

---

### `DataLabModel.ts` (Toolbox) - export/import + verdict/target wiring (D-06/D-11)

**Analog:** its own existing methods. This model already owns run persistence, comparison-row
projection, and formatting - the new work extends those exact seams.

**Import block convention** (DataLabModel.ts lines 1-21) - Hoist core/mobx/format imports, harness
types from `@xh/hoist/data` (NOT a relative path - the core is published), `filesize` + `lodash`.
Add `evaluateScorecard`, `TargetsConfig`, `DEFAULT_TARGETS` to the `@xh/hoist/data` import:
```typescript
import {
    BaselineAdapter, DEFAULT_PROTOCOL, MeasurementHarness, RunResult, ScenarioConfig
    // + evaluateScorecard, TargetsConfig, DEFAULT_TARGETS
} from '@xh/hoist/data';
import {filesize} from 'filesize';
import {round} from 'lodash';
```

**localStorage-persisted run history** (DataLabModel.ts lines 118-126) - export/import operate on
this same `savedRuns` array; appending/replacing it auto-writes through `@persist`:
```typescript
@observable.ref
@persist.with({localStorageKey: 'dataLab.savedRuns'})
savedRuns: SavedRun[] = [];
```

**Append-run action pattern** (DataLabModel.ts lines 435-440) - import should mirror this: build
`SavedRun`(s) from the parsed file, then set a NEW array so `@persist` fires:
```typescript
@action
private recordRun(result: RunResult) {
    const label = `${result.scenario.name} @ ${fmtDateTimeSec(result.env.capturedAt)}`,
        run: SavedRun = {label, savedAt: result.env.capturedAt, result};
    this.savedRuns = [...this.savedRuns, run];
}
```

**Confirm-then-mutate async pattern** (DataLabModel.ts lines 443-457) - copy for any destructive
import path (e.g. import-replace):
```typescript
async clearSavedRunsAsync() {
    if (!this.savedRuns.length) return;
    const confirmed = await XH.confirm({...});
    if (confirmed) this.clearSavedRuns();
}
```

**Export - reuse the framework download util** (do NOT hand-roll a Blob/anchor dance; RESEARCH
"Don't Hand-Roll"). From `@xh/hoist/utils/js`:
```typescript
import {downloadBlob} from '@xh/hoist/utils/js';
// single run or all runs:
const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
downloadBlob(blob, `datalab-run-${...}.json`);
```

**Import - validate untrusted JSON before trusting it** (RESEARCH Security V5 / threat note): parse
with `JSON.parse`, then shape-check the object against `RunResult`/`Scorecard` (numeric stage fields,
`rowCounts`, `env`) BEFORE adding to `savedRuns`. Never `eval`. Carry `EnvMetadata` through so the
origin machine is preserved (RESEARCH Pitfall 6). Guard so a malformed file cannot crash the grid.

**Target/verdict compare rows** - extend `comparisonRows` (DataLabModel.ts lines 470-547): the
existing per-metric `[label, valA, valB, unit]` tuple projection is the exact template for adding
target/floor/aspiration columns. Run `evaluateScorecard(scorecard, DEFAULT_TARGETS)` and fold the
verdict into new columns on the same rows.

**Formatting helpers** (DataLabModel.ts lines 553-563) - `fmtMs` / `fmtBytes` already exist; add a
`fmtVerdict` / tier-color helper in the same spot if the badge needs a formatted string.

**CRITICAL:** `Async` suffix on promise methods; `@action` on observable mutations; managed
subscriptions via `addReaction`; `null` over `undefined`. Prefer direct assignment to `@bindable`
setters (`model.compareLabels = [...]`) as the existing code does (line 386).

---

### `DataLabPanel.ts` (Toolbox) - scorecard badges + export/import controls + target columns (D-06/D-11)

**Analog:** the existing `scorecard`, `comparisonPanel`, and `controlsPanel` factories in the SAME
file. All new UI slots into these.

**Element-factory component pattern** (DataLabPanel.ts lines 235-347) - the `scorecard` factory is
where pass/fail badges land. It builds rows with local `timingRow` / `kv` / `sectionLabel` helpers.
Add a badge cell to `timingRow` (it is explicitly designed so "adding a column is just another
value", line 350) or add a verdict column:
```typescript
const timingRow = (label: string, values: string[], isHeader = false) =>
    hbox({
        className: `tb-datalab__t-row${isHeader ? ' tb-datalab__t-row--header' : ''}`,
        items: [
            box({className: 'tb-datalab__t-metric', item: label}),
            ...values.map(v => box({className: 'tb-datalab__t-val', item: v}))
        ]
    });
```

**Badge component** - use Hoist's `badge` (`@xh/hoist/cmp/badge`) or an intent-colored `Icon`
(`Icon.checkCircle()` / `Icon.xCircle()` with `intent`) for the pass/fail (or green/yellow/red tier)
glyph - NOT raw HTML. Consistent with CLAUDE.md "Hoist input/components over raw HTML".

**Toolbar-button + select controls pattern** (DataLabPanel.ts lines 377-405, `comparisonPanel` tbar)
- copy for the export/import controls (Export Run / Export All / Import buttons). Uses
`toolbar` + `button` + `select` + `filler` + `toolbarSep`:
```typescript
tbar: toolbar({
    compact: true,
    items: [
        span('Run A'),
        select({options, value: model.compareLabels[0] ?? null, onChange: v => ...}),
        toolbarSep(),
        ...
        filler(),
        button({text: 'Clear History', icon: Icon.delete(), onClick: () => model.clearSavedRunsAsync()})
    ]
})
```

**Run-controls bbar button pattern** (DataLabPanel.ts lines 216-228) - the Run button is the template
for an Export button (icon + intent + disabled + onClick -> model method).

**Import file-select** - use Hoist `FileChooser` + `FileChooserModel` (`@xh/hoist/desktop/cmp/filechooser`),
the same component the Toolbox `FileChooserPanel` demo uses
(`desktop/tabs/other/FileChooserPanel.ts` lines 6, ~40+). Read the selected file's text, hand to the
model's validated import method. This is the sanctioned Hoist file-select surface (wraps
react-dropzone).

**CRITICAL:** Element factories over JSX; `Icon.*` for glyphs; per-option descriptions already exist
(`describedOption`, lines 62-69) if new selects need them.

## Shared Patterns

### Serializable-config + named-default (framework core)
**Source:** `data/measure/types.ts` (`ScenarioConfig`/`DEFAULT_PROTOCOL`, lines 120-211)
**Apply to:** `TargetsConfig` + `DEFAULT_TARGETS`. Plain interfaces, no class instances, per-field
JSDoc, grouped under `//---` banners, a named `const` default beside the interface. Must round-trip
through JSON (same reason `ScenarioConfig` does - it persists as a ViewManager JsonBlob).

### Pure, engine-agnostic core function
**Source:** `data/measure/MeasurementProtocol.ts` (lines 85-124)
**Apply to:** `evaluateScorecard`. No side effects, no framework/UI/fetch imports, imports only from
`./types`, does not mutate inputs, barrel-exported via `index.ts`. Single source of truth for
pass/fail across scorecard UI + comparison + distilled-stats export; Phase 6 reuses it unchanged.

### Framework download util (no hand-rolled Blob dance)
**Source:** `utils/js/DownloadUtils.ts` (`downloadBlob`, lines 24-28)
**Apply to:** all run-export paths (single run + all runs + distilled stats). Import from
`@xh/hoist/utils/js`; wrap JSON in a `Blob`; let the util handle the object-URL lifecycle.

### Untrusted-input validation on import
**Source:** RESEARCH Security Domain V5 + threat note (no code analog - new guard)
**Apply to:** the D-11 file-import path. `JSON.parse` + explicit `RunResult`/`Scorecard` shape check
(numeric stage fields, `rowCounts`, `env` present) before adding to `savedRuns` or rendering. Never
`eval`. Preserve `EnvMetadata` so cross-machine origin is never lost.

### Nullable-pass handling
**Source:** `DataLabModel.comparisonRows` (lines 470-547) + `DataLabPanel.scorecard` (lines 296-329)
**Apply to:** badges, target columns, verdict rows. Timings AND heap are nullable (a run may skip a
pass); render/compare a metric ONLY when its underlying stat is non-null on the relevant side(s).

### localStorage run persistence via `@persist`
**Source:** `DataLabModel.savedRuns` (lines 118-126) + `recordRun` (lines 435-440)
**Apply to:** import (append/replace by setting a new `savedRuns` array; `@persist` writes through -
no explicit save call).

## No Code Analog (use RESEARCH / doc guidance instead)

| File | Role | Reason |
|------|------|--------|
| `docs/planning/data2/BASELINE.md` | envelope report (Markdown) | Prose doc; structure is Claude's discretion (RESEARCH Open Q4). No em dashes, no private client names (open-repo rule), name the small-heap machine (BASE-01). |
| `docs/planning/data2/stats/*.json` (raw + distilled) | design-tool stats package | Data artifacts, not code. Distilled schema is Claude's discretion (D-12): flat, chart-ready series per axis + tier-boundary points + ~500x20 stage breakdown + env metadata. |
| Ladder ViewManager profiles (D-01) | scenario data | Serialized `ScenarioConfig` JsonBlobs authored via the existing scenario ViewManager UI - data, not code. Shapes in RESEARCH Code Examples (memory rung / CPU rung). |
| `chrome-devtools-mcp` config (D-10) | tooling config | `.mcp.json` entry + `.claude/settings.local.json` enable; gated behind a human-verify checkpoint. Not source code. |

## Metadata

**Analog search scope:**
- hoist-react: `data/measure/` (types, protocol, index, harness), `utils/js/DownloadUtils.ts`,
  `desktop/cmp/filechooser/`, `cmp/badge/`
- Toolbox: `client-app/src/examples/datalab/` (DataLabModel, DataLabPanel, ingest adapters),
  `client-app/src/desktop/tabs/other/FileChooserPanel.ts`
**Files scanned:** ~12
**Toolbox branch note (RESEARCH Open Q1):** Data Lab files are current on local `data2` (CONTEXT
cites `data2` (renamed from `data2`)). Confirm the target Toolbox branch with the user before landing UI changes.
**Pattern extraction date:** 2026-07-02
</content>
</invoke>
