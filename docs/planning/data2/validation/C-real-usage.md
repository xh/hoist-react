# C - Real-Usage Validation

Validates five claims about Hoist's data layer (Cube, View, Store, aggregators, WebSocket/streaming)
against two production apps: **Jobsite** (`/Users/amcclain/dev/jobsite/client-app/src`) and
**Veracity** (`/Users/amcclain/dev/veracity-webapp/client-app/src`).

---

## 1. Claim Validation

| # | Claim | Verdict | Key Evidence |
|---|-------|---------|-------------|
| 1 | Central Cube holds leaf facts; a View queries it; View results wire into a GridModel's Store | **CONFIRMED** - with nuance | Two distinct patterns in use (see §2) |
| 2 | App loads a large JSON blob over HTTP, parses to raw JS, loads into Cube via `loadDataAsync` | **CONFIRMED** | `TimeEntryService.doLoadAsync` [TimeEntryService.ts:359-433]; `LoanService.doLoadAsync` [LoanService.ts:428-531] |
| 3 | WebSocket listener feeds incremental cube updates | **PARTIALLY CONFIRMED - significant divergence** | WS is used in veracity, but for *refresh triggers*, not direct cube pushes; the actual cube data path is HTTP polling. Details in §3. |
| 4 | One cube feeds many widgets, each with different query/filter | **CONFIRMED** | 10+ widgets query `XH.timeEntryService.cube` in jobsite; veracity dashboard has 10+ widget types all drawing from `XH.loanService.cube` |
| 5 | Weighted average aggregator keyed on a second field | **CONFIRMED** | Both apps ship their own `WeightedAverageAggregator`; veracity also has `BAL_WA` shorthand wired to `current_principal_balance` as weight |

---

## 2. Representative Usage Snippets

### 2a. Cube construction and initial data load (Jobsite `TimeEntryService`)

```typescript
// TimeEntryService.ts:85-98
this.cube = new Cube({
    fields: this.getCubeFields()  // ~25 fields, mix of dims + metrics
});

this.filterValueSource = this.cube.createView({
    query: {
        filter: {key: 'noRowsFn', testFn: () => false},
        includeRoot: true
    },
    connect: true  // view stays live as cube data changes
});

await this.loadAsync();  // triggers doLoadAsync below

// TimeEntryService.ts:362-433  (doLoadAsync)
const {entries: rawEntries, ...} = await XH.fetchJson({url: 'timeEntries', ...});
// ... process raw entries into TimeEntry objects ...
await this.cube.loadDataAsync(entries);  // [TimeEntryService.ts:433]
```

### 2b. Pattern 1 - Direct executeQuery into GridModel.loadData (most common in Jobsite)

Jobsite does NOT use `View.setStores()`. Instead, models hold a reference to the shared
`TimeEntryService.cube`, set up a MobX reaction that tracks `cube.records`, and on each change
call `cube.executeQuery(...)` and pass results directly to `gridModel.loadData(data)`.

```typescript
// TimeReportModel.ts:131-138 - reaction wires cube to grid
this.addReaction({
    track: () => [this.cube.records, this.dimensions, this.cubeFilter],
    run: () => this.loadGridData(),
    debounce: 100,
    fireImmediately: true
});

// TimeReportModel.ts:269-289 - the actual query+load
private loadGridData(): void {
    const data = cube.executeQuery({
        dimensions,
        filter: cubeFilter,
        includeRoot: true,
        includeLeaves: ungrouped,
        provideLeaves: true
    });
    gridModel.loadData(data);  // raw object array, not a connected View
}
```

Every dashboard widget uses the same pattern - observe `cube.records`, re-execute a fresh
`executeQuery` with its own filter/dimensions, call `gridModel.loadData`. Examples:
- `ClientTimeWidgetModel.ts:143-153` (tracks `cube.records` + `client` + period + `groupBy`)
- `TimeSpentWidgetModel.ts:110-125` (tracks `field` + `value`, queries single metric)
- `AreaChartWidgetModel.ts:132` (`cube.executeQuery(...)` directly, no store/grid)
- `SingleMetricWidgetModel.ts:208-212` (runs two queries - current and prior period)
- `ChangeReportWidgetModel.ts:198-205` (runs two queries - two periods, side-by-side diff)

### 2c. Pattern 2 - createView with connect:true and setStores (used in Veracity)

Veracity uses the fully wired-up View pattern. The View is created with `connect: true` and
explicitly handed the grid's Store via `setStores()`. From that point on the View pushes data
automatically whenever the cube changes or the View's query/filter changes.

```typescript
// ValidationResultsModel.ts:94-103
this.view = this.cube.createView({
    query: {
        dimensions: this.groupingChooserModel.value,
        includeLeaves: true
    },
    connect: true
});

this.gridModel = this.createGridModel();
this.view.setStores([this.gridModel.store]);  // View pushes data to store automatically
```

LoanGridModel does the same but passes `stores` directly in the `createView` config:

```typescript
// LoanGridModel.ts:226-231
private createCubeView() {
    return this.cube.createView({
        query: this.cubeQuery,
        stores: this.gridModel.store,  // passed at creation time, same as setStores
        connect: true
    });
}
```

Reactions update the View's query/filter rather than re-executing queries:

```typescript
// LoanGridModel.ts:166-169
this.addReaction({
    track: () => this.cubeQuery,
    run: queryOpts => this.view?.updateQuery(queryOpts)
});
```

The DashboardModel shows `connect: true` with a live filter reaction (WidgetModel base class):

```typescript
// WidgetModel.ts:200-213
this.view = this.cube.createView({
    ...viewSpec,
    query: {...viewSpec.query, filter: this.joinedFilter},
    connect: true
});

this.addReaction({
    track: () => this.joinedFilter,
    run: joinedFilter => this.view.setFilter(joinedFilter)
});
```

### 2d. Incremental cube update (Veracity `LoanService`)

Veracity's loan data uses a poll-then-diff approach. Each load sends the previous `lastRefreshed`
timestamp; the server returns either a full snapshot or a partial diff. The full/partial choice
drives `loadDataAsync` vs `updateDataAsync`:

```typescript
// LoanService.ts:486-503
if (!isPartial) {
    this.setLoans(loans);
    await this.cube.loadDataAsync(cubeData);      // full replace
} else {
    this.updateLoans(loans, deletes);
    await this.cube.updateDataAsync(cubeData);    // incremental upsert + deletes
}
```

### 2e. WebSocket as refresh trigger (not raw data push)

The WebSocket is used only to signal the client that new data is ready, not to stream raw data:

```typescript
// ValidationResultsModel.ts:88-89
this.refreshSub = XH.webSocketService.subscribe('vtValidationRefreshReady', msg => {
    this.refreshAsync(msg.data);  // triggers an HTTP fetch, not a cube.updateDataAsync
});
```

Same pattern in `InvoiceSnapshotModel.ts:48-50` and `RateSheetManagerModel.ts:59-76`.
The WebSocket message carries metadata (e.g., `bulkUpdateIsRunning`, `success`, `progress`)
rather than data payloads.

### 2f. Field/aggregator configuration (Jobsite `TimeEntryService.getCubeFields`)

```typescript
// TimeEntryService.ts:473-479, 484-513
{name: 'hours',          type: 'number', aggregator: 'SUM'},
{name: 'billableAmount', type: 'number', aggregator: 'SUM'},
{
    name: 'billableRate',
    type: 'number',
    aggregator: new WeightedAverageAggregator({weightField: 'hours'})
    // billableRate is weighted by hours at each leaf
},
{
    name: 'pctTotalHours',
    aggregator: new ProportionAggregator({
        fieldName: 'hours',
        grandTotalFn: (rows, fieldName, aggContext) =>
            calcTotalBalanceForAggregation(aggContext, 'hours')
    })
},
// Dimension fields: isDimension: true, aggregator: 'UNIQUE'
{name: 'client',   type: 'string', isDimension: true, aggregator: 'UNIQUE'},
{name: 'project',  type: 'string', isDimension: true, aggregator: 'UNIQUE'},
// ...14 total dimension fields, ~10 metric fields
```

Veracity uses a `BAL_WA` shorthand in `BaseFieldService` that expands to `WeightedAverageAggregator`:

```typescript
// BaseFieldService.ts:971-975
case 'BAL_WA':
    aggregator = new WeightedAverageAggregator({
        sourceField,
        weightField: config.aggregatorWeightField ?? 'current_principal_balance'
    });
    break;
```

---

## 3. Divergences from the Brief's Mental Model

| Mental Model Assumption | Reality |
|------------------------|---------|
| "WebSocket listener feeds incremental updates into the cube" | **False for both apps.** Neither app feeds raw cube data over WebSocket. Jobsite has no WebSocket usage at all on the time entry cube. Veracity uses WebSocket only to deliver lightweight *notifications* (a message like "refresh ready") that trigger an HTTP fetch. The HTTP response is what actually flows into `cube.loadDataAsync` / `cube.updateDataAsync`. |
| "A View is created... View's results are connected into a grid's Store... the store change drives the grid" | **True in Veracity, different in Jobsite.** Jobsite uses `cube.executeQuery()` manually inside a MobX reaction and calls `gridModel.loadData(data)` directly. There is no standing View object connected to the store in most Jobsite grids. The `createView` / `connect: true` / `setStores` pattern appears in Veracity and in one place in Jobsite (the invoice report's filter-value source view) but is not the dominant Jobsite pattern. |
| "Initial load: large compressed JSON blob over HTTP" | **JSON over HTTP confirmed, but no explicit compression at the client layer.** The fetch uses standard `XH.fetchJson`; HTTP-level gzip negotiation may occur at the server/transport level, but the client code sees plain JSON objects - there is no explicit decompression step in the client code. |
| "One cube per domain" | **Confirmed.** Both apps have exactly one cube per domain type (one time-entry cube in `TimeEntryService`, one loan cube in `LoanService`). The cube lives in a singleton service. However, Veracity's `ValidationResultsModel` also creates its *own* separate cube for validation results, not derived from the loan cube. Multiple independent cubes in one app is a real pattern. |
| "Weighted average by another field" | **Confirmed and well-established.** Both apps define a custom `WeightedAverageAggregator` that extends `Aggregator`, iterates leaves, and computes `sum(val * weight) / sum(weight)`. The implementations are nearly identical. Veracity additionally defines custom aggregator types: `DedupedSumAggregator`, `ProportionAggregator` (percent of total/row/parent), `FieldAverageAggregator`, `LoanAverageAggregator`. |

---

## 4. Dataset Shape Evidence

### Jobsite (TimeEntryService)

- **Fields**: ~25 total cube fields. 14 dimension fields (`isDimension: true, aggregator: 'UNIQUE'`),
  including `client`, `project`, `dev`, `task`, `date`, `month`, `quarter`, `year`, `office`,
  `billable`, `billed`, `locked`, `partnerTime`, `released`. Metric fields: `hours`, `billableAmount`,
  `billableRate` (WA), 5x `ProportionAggregator` fields. Plus identifier fields (`entryId`, `devId`,
  `clientId`, `projectId`) with `aggregator: 'UNIQUE'`.
- **Record count**: Logged at load via `this.logInfo(\`Loaded ${rawEntries.length} time entries\`)`.
  A consultancy time-tracking tool; order of magnitude likely tens of thousands of records
  (years of daily entries across a small team).
- **Field definitions**: Hard-coded in `TimeEntryService.getCubeFields()`, role-gated (some fields
  only included for users with specific roles).

### Veracity (LoanService / BaseFieldService)

- **Fields**: Loaded dynamically from server via `CoreFieldService.initAsync()` calling `GET /fields`.
  Field definitions are server-side, tagged with metadata. `BaseFieldService.genCubeFieldConfigs()`
  constructs `CubeFieldSpec[]` from those raw configs. The 1491-line `BaseFieldService.ts` with
  multiple aggregator-type switches suggests a large, complex field library (likely 100+ fields).
  Fields have types `STRING`, `NUMBER`, `INT`, `BOOL`, `LOCAL_DATE`, `DATE`, plus custom aggregator
  types: `SUM`, `AVG`, `BAL_WA`, `PCT_OF_TOTAL`, `PCT_OF_ROW`, `PCT_OF_PARENT`, `UNIQUE`.
- **Record count**: The code tracks `allLoansCount` from server responses and compares to client
  `loansCount` for integrity checks. The `extendedTimeout()` call on the loan fetch and comments
  about memory tracking suggest a large dataset. A residential mortgage portfolio tool; realistic
  count is thousands to tens of thousands of loan records.
- **Partial update**: The service explicitly handles `isPartial` from the server, implying the
  dataset is large enough that a full refresh on every poll would be expensive.

---

## 5. Open Questions for Phase 1

1. **Two View patterns - which to document?** Jobsite's `executeQuery-in-reaction` pattern and
   Veracity's `createView + connect + setStores` pattern are both in heavy production use. Docs
   should explain both, including when to prefer each. The Veracity pattern is more declarative
   and avoids re-running the query on every reaction; the Jobsite pattern gives more control
   over when/how data is fetched and processed.

2. **WebSocket pattern role**: The WS-as-notification pattern is clearly intentional (used in 4
   places in veracity, none of which push raw data). The brief's assumption of "WS feeds incremental
   cube updates" appears to be aspirational or mischaracterized. Is there any Hoist facility for
   direct WS data push into a cube/store, or is the notify-then-HTTP-fetch pattern the canonical
   approach?

3. **Multiple cubes per app**: Veracity's `ValidationResultsModel` creates its own cube entirely
   separate from the loan cube. Should docs address the "per-domain single cube" pattern and when
   it is appropriate to create additional cubes?

4. **Field definition source**: Jobsite defines fields in code (role-gated TS); Veracity fetches
   field definitions from the server at startup (server-driven field library). Both are valid.
   Which pattern should be presented as primary in docs?

5. **`updateDataAsync` semantics**: The loan service uses `updateDataAsync` for partial refreshes
   (upsert + delete). The time entry service uses it for single-entry updates after a user edit
   (`cube.updateDataAsync(updated)` at `TimeEntryService.ts:158`). Are these the same method with
   the same contract? Worth confirming the exact semantics (replace-by-id? merge?).

6. **Dataset size thresholds**: No hard numbers on actual dataset sizes were found in the code.
   Log statements and config names (`extendedTimeout`, memory tracking) suggest concern at the
   thousands-of-records scale. Phase 1 docs should clarify what "large" means in practice and
   whether there are known performance ceilings.
