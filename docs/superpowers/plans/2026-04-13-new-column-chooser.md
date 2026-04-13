# New Column Chooser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new standalone ColumnChooser component for Hoist Grids that replaces the LeftRightChooser pattern with a modern single-list tree view featuring drag-and-drop reordering, checkbox visibility toggling, column group hierarchy, and pin zone management.

**Architecture:** The ColumnChooser is a standalone component (like GridFindField) that accepts a target `GridModel` via prop or context lookup and manages its column state. It uses its own internal Grid(s) to display the column list, with AG Grid's row drag API for reordering. Pin states (left, none, right) are represented as separate visual sections. All changes commit immediately to the target GridModel via `updateColumnState()`.

**Tech Stack:** TypeScript, React, MobX, AG Grid (row drag API), Hoist component/model patterns

---

## File Map

### hoist-react - New Files

| File | Responsibility |
|------|---------------|
| `desktop/cmp/grid/columnchooser/ColumnChooserModel.ts` | Main model: owns internal GridModel(s), reads/writes target GridModel's columnState, manages tree/flat toggle, filter, selection |
| `desktop/cmp/grid/columnchooser/ColumnChooser.ts` | Main component: renders pin sections, filter bar, tree/flat toggle, description panel |
| `desktop/cmp/grid/columnchooser/PinSectionModel.ts` | Model for a single pin zone (left/center/right): owns one internal GridModel with row drag enabled, manages its subset of columns |
| `desktop/cmp/grid/columnchooser/PinSection.ts` | Component for a single pin zone: renders a labeled Grid with drag handle column and visibility checkboxes |
| `desktop/cmp/grid/columnchooser/ColumnChooser.scss` | Styles for the chooser and its sub-components |

### hoist-react - Modified Files

| File | Change |
|------|--------|
| `desktop/cmp/grid/index.ts` | Add export for `./columnchooser/ColumnChooser` |
| `kit/ag-grid/index.ts` | Add exports for row drag event types (`RowDragEndEvent`, `RowDragEnterEvent`, etc.) |

### toolbox - New Files

| File | Responsibility |
|------|---------------|
| `client-app/src/desktop/tabs/grids/ColumnChooserPanel.ts` | Test panel: renders a sample grid with column groups alongside the new ColumnChooser component |

### toolbox - Modified Files

| File | Change |
|------|--------|
| `client-app/src/desktop/tabs/grids/index.ts` | Add export for `ColumnChooserPanel` |

Note: the new tab also needs to be wired into the grid tab's tab container. Check how `GridsTab` or the parent tab config registers child tabs and add the new panel there.

---

## Task 1: Scaffold Files and Toolbox Test Page

Set up all files with minimal shells so subsequent tasks can build incrementally with a working test harness.

**Files:**
- Create: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooserModel.ts`
- Create: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooser.ts`
- Create: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooser.scss`
- Create: `hoist-react/desktop/cmp/grid/columnchooser/PinSectionModel.ts`
- Create: `hoist-react/desktop/cmp/grid/columnchooser/PinSection.ts`
- Modify: `hoist-react/desktop/cmp/grid/index.ts`
- Create: `toolbox/client-app/src/desktop/tabs/grids/ColumnChooserPanel.ts`
- Modify: `toolbox/client-app/src/desktop/tabs/grids/index.ts`

- [ ] **Step 1: Create ColumnChooserModel shell**

```typescript
// desktop/cmp/grid/columnchooser/ColumnChooserModel.ts
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel} from '@xh/hoist/core';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {withDefault} from '@xh/hoist/utils/js';

export interface ColumnChooserConfig {
    /** GridModel whose columns this chooser manages. Falls back to context lookup. */
    gridModel?: GridModel;
}

/**
 * Model for the new ColumnChooser component. Manages an internal representation of the target
 * grid's columns and provides controls for visibility toggling, reordering, and pin management.
 */
export class ColumnChooserModel extends HoistModel {
    override xhImpl = true;

    /** Show column groups as tree hierarchy (true) or flat leaf list (false). */
    @bindable showGroups: boolean = true;

    /** Current quick-filter text. */
    @bindable filterText: string = '';

    /** The GridModel whose columns this chooser manages. */
    @computed
    get gridModel(): GridModel {
        const ret = withDefault(this.componentProps?.gridModel, this.lookupModel(GridModel));
        if (!ret) {
            this.logError("No GridModel available. Provide via a 'gridModel' prop, or context.");
        }
        return ret;
    }

    constructor() {
        super();
        makeObservable(this);
    }
}
```

- [ ] **Step 2: Create ColumnChooser component shell**

```typescript
// desktop/cmp/grid/columnchooser/ColumnChooser.ts
import {ColumnChooserModel} from './ColumnChooserModel';
import type {GridModel} from '@xh/hoist/cmp/grid';
import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp, LayoutProps, useLocalModel} from '@xh/hoist/core';
import './ColumnChooser.scss';

export interface ColumnChooserProps extends LayoutProps {
    /** GridModel whose columns this chooser manages. Falls back to context lookup. */
    gridModel?: GridModel;
}

/**
 * A standalone component for managing Grid column visibility, ordering, and pinning.
 * Bind to a GridModel via the `gridModel` prop or context lookup.
 */
export const [ColumnChooser, columnChooser] = hoistCmp.withFactory<ColumnChooserProps>({
    displayName: 'ColumnChooser',
    className: 'xh-column-chooser',
    render({className, ...props}) {
        const impl = useLocalModel(ColumnChooserModel);
        return box({
            className,
            item: `ColumnChooser bound to: ${impl.gridModel ? 'GridModel' : 'nothing'}`
        });
    }
});
```

- [ ] **Step 3: Create empty SCSS file**

```scss
// desktop/cmp/grid/columnchooser/ColumnChooser.scss
.xh-column-chooser {
    display: flex;
    flex-direction: column;
}
```

- [ ] **Step 4: Create PinSectionModel and PinSection shells**

```typescript
// desktop/cmp/grid/columnchooser/PinSectionModel.ts
import {HoistModel} from '@xh/hoist/core';
import {makeObservable} from '@xh/hoist/mobx';
import type {HSide} from '@xh/hoist/core';

/**
 * @internal
 * Model for a single pin zone within the ColumnChooser.
 * Each zone (left-pinned, center, right-pinned) has its own PinSectionModel.
 */
export class PinSectionModel extends HoistModel {
    override xhImpl = true;

    /** Which pin zone: 'left', null (center), or 'right'. */
    pinned: HSide;

    constructor({pinned}: {pinned: HSide}) {
        super();
        makeObservable(this);
        this.pinned = pinned;
    }
}
```

```typescript
// desktop/cmp/grid/columnchooser/PinSection.ts
import {box} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {PinSectionModel} from './PinSectionModel';

/**
 * @internal
 * Renders a single pin zone within the ColumnChooser.
 */
export const pinSection = hoistCmp.factory<{model: PinSectionModel}>(
    ({model}) => box({item: `Pin zone: ${model.pinned ?? 'center'}`})
);
```

- [ ] **Step 5: Add export to hoist-react desktop grid index**

Add to `desktop/cmp/grid/index.ts`:
```typescript
export * from './columnchooser/ColumnChooser';
```

- [ ] **Step 6: Create toolbox test panel**

```typescript
// toolbox/client-app/src/desktop/tabs/grids/ColumnChooserPanel.ts
import {hoistCmp, creates} from '@xh/hoist/core';
import {hframe, p} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {columnChooser} from '@xh/hoist/desktop/cmp/grid';
import {wrapper} from '../../common';
import {SampleColumnGroupsGridModel} from '../../common/grid/SampleColumnGroupsGrid';

export const columnChooserPanel = hoistCmp.factory({
    model: creates(() => SampleColumnGroupsGridModel),
    render({model}) {
        return wrapper({
            description: [
                p(
                    'The new ColumnChooser component provides a modern interface for managing grid column visibility, ordering, and pinning with drag-and-drop support and column group hierarchy.'
                )
            ],
            item: panel({
                title: 'Grids › Column Chooser',
                icon: Icon.gridPanel(),
                className: 'tb-grid-wrapper-panel',
                item: hframe(
                    // The grid under management - reuse the column groups sample
                    // (may need to extract the grid portion from SampleColumnGroupsGrid)
                    panel({
                        flex: 1,
                        item: 'Grid goes here - wire up SampleColumnGroupsGrid'
                    }),
                    columnChooser({
                        gridModel: model.gridModel,
                        width: 350
                    })
                )
            })
        });
    }
});
```

Note: the test panel reuses `SampleColumnGroupsGridModel` which has column groups. The exact wiring to get the GridModel reference will depend on how that model exposes its grid. The implementer should check `SampleColumnGroupsGridModel` and adapt — the key point is to render a grid with column groups alongside the new ColumnChooser component, passing the same GridModel to both.

- [ ] **Step 7: Add export to toolbox grids index**

Add to `toolbox/client-app/src/desktop/tabs/grids/index.ts`:
```typescript
export * from './ColumnChooserPanel';
```

Then wire the new panel into the grid tab container. Check how the other grid panels (StandardGridPanel, ColumnGroupsGridPanel, etc.) are registered as tabs — likely in a parent component that builds the tab config array. Add `columnChooserPanel` there.

- [ ] **Step 8: Verify the shell renders**

Run `cd toolbox/client-app && yarn startWithHoist`, navigate to the new Column Chooser tab, and confirm the placeholder text renders without errors.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat(columnchooser): scaffold ColumnChooser component and toolbox test page"
```

---

## Task 2: Load Column Data and Display with Visibility Checkboxes

Build the core data flow: read the target GridModel's column tree and columnState, build internal records, and display them in a Grid with checkbox toggles for visibility.

**Files:**
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooserModel.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooser.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/PinSectionModel.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/PinSection.ts`

- [ ] **Step 1: Define the internal record shape**

Add to `ColumnChooserModel.ts` (or a separate types file if it gets large):

```typescript
/** Shape of records in the ColumnChooser's internal grids. */
export interface ColumnChooserRecord {
    id: string;              // colId for leaves, groupId for groups
    name: string;            // chooserName (leaf) or group headerName
    description: string;     // chooserDescription
    visible: boolean;        // !hidden for leaves; derived for groups
    pinned: HSide;           // pin state from columnState
    isGroup: boolean;        // true for ColumnGroup nodes
    hideable: boolean;       // false = checkbox disabled
    parentId: string;        // groupId of parent, null for top-level
    sortOrder: number;       // position index from columnState order
    leafColIds: string[];    // for groups: all descendant leaf colIds (for bulk operations)
}
```

- [ ] **Step 2: Implement `buildRecords()` in ColumnChooserModel**

This method reads the target GridModel's columns (the tree structure) and columnState (visibility/pin/order) and produces a flat array of `ColumnChooserRecord` objects.

Key logic:
- Walk `gridModel.columns` recursively (depth-first)
- For each leaf Column: create a record with colId, chooserName, chooserDescription, hidden/pinned from columnState, hideable, excludeFromChooser
- Skip columns where `excludeFromChooser === true`
- For each ColumnGroup: create a record with groupId, headerName, computed visibility (all children visible = true, none = false, mixed = use a separate `indeterminate` flag)
- `parentId` links children to their group's id
- `sortOrder` comes from the column's index in `columnState` (which tracks display order)
- Groups: `leafColIds` collects all descendant leaf column IDs for bulk toggle/move

```typescript
// In ColumnChooserModel
private buildRecords(): ColumnChooserRecord[] {
    const {gridModel} = this,
        {columns, columnState} = gridModel,
        records: ColumnChooserRecord[] = [];

    // Build a colId -> index map for sort ordering
    const orderMap = new Map(columnState.map((cs, idx) => [cs.colId, idx]));

    const walk = (cols: ColumnOrGroup[], parentId: string = null) => {
        for (const col of cols) {
            if (col instanceof ColumnGroup) {
                const leafCols = col.getLeafColumns();
                const leafColIds = leafCols.map(lc => lc.colId);
                const leafStates = leafColIds.map(id => gridModel.getStateForColumn(id));
                const allVisible = leafStates.every(s => !s.hidden);
                const noneVisible = leafStates.every(s => s.hidden);

                records.push({
                    id: col.groupId,
                    name: typeof col.headerName === 'string' ? col.headerName : col.groupId,
                    description: '',
                    visible: allVisible,
                    pinned: null,
                    isGroup: true,
                    hideable: leafCols.some(lc => lc.hideable),
                    parentId,
                    sortOrder: Math.min(...leafColIds.map(id => orderMap.get(id) ?? Infinity)),
                    leafColIds
                });

                walk(col.children, col.groupId);
            } else {
                if (col.excludeFromChooser) continue;
                const state = gridModel.getStateForColumn(col.colId);
                records.push({
                    id: col.colId,
                    name: col.chooserName,
                    description: col.chooserDescription ?? '',
                    visible: !state.hidden,
                    pinned: state.pinned ?? null,
                    isGroup: false,
                    hideable: col.hideable,
                    parentId,
                    sortOrder: orderMap.get(col.colId) ?? Infinity,
                    leafColIds: [col.colId]
                });
            }
        }
    };

    walk(columns);
    return records;
}
```

- [ ] **Step 3: Implement PinSectionModel with internal GridModel**

```typescript
// PinSectionModel.ts
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import type {HSide} from '@xh/hoist/core';
import {makeObservable, observable} from '@xh/hoist/mobx';
import type {ColumnChooserRecord} from './ColumnChooserModel';
import {Icon} from '@xh/hoist/icon';
import {checkbox} from '@xh/hoist/desktop/cmp/input';

export class PinSectionModel extends HoistModel {
    override xhImpl = true;

    pinned: HSide;

    @managed
    gridModel: GridModel;

    constructor({pinned}: {pinned: HSide}) {
        super();
        makeObservable(this);
        this.pinned = pinned;

        this.gridModel = new GridModel({
            store: {
                idSpec: 'id',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'visible', type: 'bool'},
                    {name: 'isGroup', type: 'bool'},
                    {name: 'hideable', type: 'bool'},
                    {name: 'parentId', type: 'string'},
                    {name: 'sortOrder', type: 'int'},
                    {name: 'leafColIds', type: 'json'}
                ]
            },
            emptyText: 'No columns',
            selModel: 'single',
            sortBy: 'sortOrder',
            columns: [
                {
                    colId: 'visible',
                    headerName: '',
                    width: 40,
                    renderer: (v, {record}) => {
                        // Return a checkbox icon, disabled if not hideable
                        return record.data.hideable
                            ? (v ? Icon.checkSquare() : Icon.square())
                            : Icon.lock();
                    }
                },
                {
                    colId: 'name',
                    headerName: 'Column',
                    flex: 1
                }
            ]
        });
    }

    /** Load records for this pin zone. */
    loadRecords(records: ColumnChooserRecord[]) {
        const filtered = records.filter(r => {
            if (r.isGroup) return true; // groups shown in all zones (filtered by children later)
            return (r.pinned ?? null) === (this.pinned ?? null);
        });
        this.gridModel.store.loadData(filtered);
    }
}
```

- [ ] **Step 4: Wire ColumnChooserModel to create PinSectionModels and sync data**

Update `ColumnChooserModel.ts` to create three PinSectionModels and load data reactively:

```typescript
// Add to ColumnChooserModel
@managed leftPinModel = new PinSectionModel({pinned: 'left'});
@managed centerPinModel = new PinSectionModel({pinned: null});
@managed rightPinModel = new PinSectionModel({pinned: 'right'});

override onLinked() {
    // React to changes in the target grid's column state
    this.addReaction({
        track: () => [this.gridModel?.columnState, this.gridModel?.columns],
        run: () => this.syncFromGridModel(),
        fireImmediately: true
    });
}

@action
private syncFromGridModel() {
    if (!this.gridModel) return;
    const records = this.buildRecords();
    this.leftPinModel.loadRecords(records);
    this.centerPinModel.loadRecords(records);
    this.rightPinModel.loadRecords(records);
}
```

- [ ] **Step 5: Implement visibility toggle handler**

Add to `ColumnChooserModel.ts`:

```typescript
/** Toggle visibility for a column or group. */
toggleVisibility(recordId: string) {
    const {gridModel} = this;
    if (!gridModel) return;

    // Find the record across all pin sections
    const record = this.findRecord(recordId);
    if (!record || !record.data.hideable) return;

    const newHidden = record.data.visible; // toggle: visible->hidden, hidden->visible
    const colIds: string[] = record.data.leafColIds;

    gridModel.updateColumnState(
        colIds.map(colId => ({colId, hidden: newHidden}))
    );
}

private findRecord(id: string): StoreRecord {
    return this.leftPinModel.gridModel.store.getById(id)
        ?? this.centerPinModel.gridModel.store.getById(id)
        ?? this.rightPinModel.gridModel.store.getById(id);
}
```

- [ ] **Step 6: Update PinSection component to render the internal Grid**

```typescript
// PinSection.ts
import {grid} from '@xh/hoist/cmp/grid';
import {box, label} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {PinSectionModel} from './PinSectionModel';

export const pinSection = hoistCmp.factory<{model: PinSectionModel}>(
    ({model}) => {
        const title = model.pinned === 'left' ? 'Pinned Left'
            : model.pinned === 'right' ? 'Pinned Right'
            : 'Columns';

        return box({
            flex: model.pinned ? 0 : 1,
            className: 'xh-column-chooser__pin-section',
            items: [
                label({item: title, className: 'xh-column-chooser__pin-section-label'}),
                grid({model: model.gridModel})
            ]
        });
    }
);
```

- [ ] **Step 7: Update ColumnChooser component to render pin sections**

```typescript
// ColumnChooser.ts - update render
render({className, ...props}) {
    const impl = useLocalModel(ColumnChooserModel);
    return vbox({
        className,
        items: [
            pinSection({model: impl.leftPinModel}),
            pinSection({model: impl.centerPinModel}),
            pinSection({model: impl.rightPinModel})
        ]
    });
}
```

- [ ] **Step 8: Wire up click-to-toggle on the visibility column**

In PinSectionModel, the internal GridModel needs an `onCellClicked` handler for the visible column. Add to the GridModel config:

```typescript
// In PinSectionModel constructor, add to GridModel config:
onCellClicked: (e) => {
    if (e.column?.getColId() === 'visible') {
        // Bubble up to ColumnChooserModel - need a callback reference
        this.onToggleVisibility?.(e.data.id);
    }
}
```

Add a callback property to PinSectionModel that ColumnChooserModel sets after construction:

```typescript
// PinSectionModel
onToggleVisibility: (recordId: string) => void;

// ColumnChooserModel - in constructor or onLinked, wire up:
this.leftPinModel.onToggleVisibility = id => this.toggleVisibility(id);
this.centerPinModel.onToggleVisibility = id => this.toggleVisibility(id);
this.rightPinModel.onToggleVisibility = id => this.toggleVisibility(id);
```

Note: `onCellClicked` is not a standard Hoist GridModel config property. Check how Hoist handles cell click events — it may need to be wired via `agOptions` or through the Grid component's event system. The implementer should check GridModel for click handling patterns. An alternative is using a custom cell renderer that renders an actual checkbox/button with an onClick handler.

- [ ] **Step 9: Test in toolbox**

Run the dev server, navigate to the Column Chooser tab. Verify:
- Columns from the sample grid appear in the chooser
- Clicking the visibility checkbox toggles column visibility in the grid
- Column groups show with computed visibility state
- Pinned columns (if any) appear in the correct section

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat(columnchooser): display columns with visibility checkboxes"
```

---

## Task 3: Tree/Flat Mode Toggle

Add the ability to toggle between a hierarchical tree view (columns nested under groups) and a flat list of leaf columns only.

**Files:**
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooserModel.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/PinSectionModel.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooser.ts`

- [ ] **Step 1: Add tree mode support to PinSectionModel**

The internal GridModel needs to support `treeMode` display. When `showGroups` is true, the grid shows group records as parent nodes with leaf columns as children. When false, only leaf columns are shown (no group records).

Update `PinSectionModel.loadRecords()`:

```typescript
loadRecords(records: ColumnChooserRecord[], showGroups: boolean) {
    let filtered = records.filter(r => {
        if (r.isGroup) return showGroups; // Only include groups when showing hierarchy
        return (r.pinned ?? null) === (this.pinned ?? null);
    });

    // When showing groups, also filter out groups with no visible children in this zone
    if (showGroups) {
        const leafIds = new Set(filtered.filter(r => !r.isGroup).map(r => r.id));
        filtered = filtered.filter(r => {
            if (!r.isGroup) return true;
            return r.leafColIds.some(id => leafIds.has(id));
        });
    }

    this.gridModel.store.loadData(filtered);
}
```

The GridModel also needs `treeMode` and `treeColumn: 'name'` configured. Since `treeMode` may need to change dynamically, handle this by setting it at construction and tracking `parentId` as the tree hierarchy field:

```typescript
// In PinSectionModel GridModel config, add:
treeMode: true,
store: {
    // ... existing fields ...
    idSpec: 'id',
    parentIdSpec: 'parentId'
}
```

When `showGroups` is false, records have `parentId: null` and treeMode effectively shows a flat list.

- [ ] **Step 2: Add toggle button to ColumnChooser component**

```typescript
// In ColumnChooser.ts render, add a toolbar above the pin sections:
import {button, toolbar} from '@xh/hoist/desktop/cmp/...';

// Toolbar with toggle:
toolbar({
    items: [
        button({
            icon: impl.showGroups ? Icon.treeList() : Icon.list(),
            text: impl.showGroups ? 'Tree' : 'Flat',
            onClick: () => impl.setShowGroups(!impl.showGroups),
            // Only relevant if the target grid actually has column groups
            omit: !impl.hasColumnGroups
        })
    ]
})
```

- [ ] **Step 3: Add `hasColumnGroups` computed to ColumnChooserModel**

```typescript
@computed
get hasColumnGroups(): boolean {
    if (!this.gridModel) return false;
    return this.gridModel.columns.some(c => c instanceof ColumnGroup);
}
```

- [ ] **Step 4: Update syncFromGridModel to pass showGroups**

```typescript
private syncFromGridModel() {
    if (!this.gridModel) return;
    const records = this.buildRecords();
    const {showGroups} = this;
    this.leftPinModel.loadRecords(records, showGroups);
    this.centerPinModel.loadRecords(records, showGroups);
    this.rightPinModel.loadRecords(records, showGroups);
}
```

Also add a reaction to re-sync when `showGroups` changes:

```typescript
this.addReaction({
    track: () => this.showGroups,
    run: () => this.syncFromGridModel()
});
```

- [ ] **Step 5: Test tree/flat toggle**

Verify in toolbox:
- Toggle button appears when grid has column groups
- Tree mode shows groups as expandable parent rows
- Flat mode shows only leaf columns
- Visibility toggles work correctly in both modes
- Group indeterminate state shows correctly in tree mode

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(columnchooser): add tree/flat mode toggle for column groups"
```

---

## Task 4: Quick Filter

Add a text input that filters the column list by name using Store filters on the internal GridModels.

**Files:**
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooserModel.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooser.ts`

- [ ] **Step 1: Add filter input to ColumnChooser toolbar**

```typescript
textInput({
    model: impl,
    bind: 'filterText',
    placeholder: 'Filter columns...',
    leftIcon: Icon.search(),
    enableClear: true,
    commitOnChange: true,
    width: null,
    flex: 1
})
```

- [ ] **Step 2: Apply store filter reactively from ColumnChooserModel**

Use the Hoist Store's built-in `setFilter()` to filter the internal grids' stores based on the
`filterText` binding. This keeps the full dataset loaded and lets the store handle filtering
reactively — no need to reload data when the filter changes.

Add a reaction in `ColumnChooserModel.onLinked()`:

```typescript
this.addReaction({
    track: () => this.filterText,
    run: filterText => this.applyFilter(filterText),
    debounce: 200
});
```

```typescript
private applyFilter(filterText: string) {
    const filter = filterText
        ? (rec: StoreRecord) => {
              const lower = filterText.toLowerCase();
              // Leaf columns: match on name
              if (!rec.data.isGroup) {
                  return rec.data.name?.toLowerCase().includes(lower);
              }
              // Groups (at any nesting level): keep if any descendant leaf matches.
              // Use leafColIds (which includes ALL descendant leaves, not just
              // direct children) to check against the full store.
              return rec.data.leafColIds?.some(colId => {
                  const leaf = rec.store.getById(colId);
                  return leaf?.data.name?.toLowerCase().includes(lower);
              });
          }
        : null;

    // Apply the same filter to all three pin section stores
    this.leftPinModel.gridModel.store.setFilter(filter);
    this.centerPinModel.gridModel.store.setFilter(filter);
    this.rightPinModel.gridModel.store.setFilter(filter);
}
```

Note: multi-level column groups (groups containing groups) are fully supported. The `buildRecords()`
walk is recursive and sets `parentId` to the immediate parent at each level, so the tree store
naturally represents arbitrary nesting depth. `leafColIds` on each group collects ALL descendant
leaf columns (via `ColumnGroup.getLeafColumns()` which recurses through sub-groups), so visibility
toggling and filtering on a top-level group correctly affects all nested children.

Note: check the Hoist Store filter API — the exact method may be `setFilter()` with a
`FilterTestFn`, or it may use `StoreFilter` objects. The implementer should consult the
hoist-react `data` docs (`hoist-search-docs` with doc ID `data`) for the correct filter API.
The key point is: use the store's native filtering, not data reloading.

- [ ] **Step 3: Test filtering**

Verify in toolbox:
- Typing in filter narrows the column list
- Matching is case-insensitive on column name
- Groups containing matching columns remain visible in tree mode
- Clearing the filter restores the full list
- Filtered-out columns are not removed from the store, just hidden from display

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(columnchooser): add quick filter for column list"
```

---

## Task 5: Description Panel

Add a detail panel that shows the `chooserDescription` of the currently selected column.

**Files:**
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooserModel.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooser.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooser.scss`

- [ ] **Step 1: Add selectedRecord computed to ColumnChooserModel**

```typescript
@computed
get selectedRecord(): ColumnChooserRecord {
    // Check each pin section for a selection
    for (const pinModel of [this.leftPinModel, this.centerPinModel, this.rightPinModel]) {
        const selId = pinModel.gridModel.selectedRecord?.id;
        if (selId) {
            return pinModel.gridModel.store.getById(selId)?.data as ColumnChooserRecord;
        }
    }
    return null;
}

@computed
get selectedDescription(): string {
    return this.selectedRecord?.description ?? '';
}
```

- [ ] **Step 2: Add description panel to ColumnChooser component**

```typescript
// At the bottom of the ColumnChooser vbox items:
box({
    className: 'xh-column-chooser__description',
    omit: !impl.selectedDescription,
    item: impl.selectedDescription
})
```

- [ ] **Step 3: Style the description panel**

```scss
.xh-column-chooser__description {
    padding: var(--xh-pad-px);
    border-top: 1px solid var(--xh-border-color);
    font-size: var(--xh-font-size-small-px);
    color: var(--xh-text-color-muted);
    min-height: 40px;
    max-height: 80px;
    overflow-y: auto;
}
```

- [ ] **Step 4: Ensure only one pin section has a selection at a time**

When the user clicks in a different pin section, deselect the previous one. Add to ColumnChooserModel:

```typescript
// Wire up selection change handlers
this.leftPinModel.gridModel.addReaction({
    track: () => this.leftPinModel.gridModel.selectedRecord,
    run: (rec) => {
        if (rec) {
            this.centerPinModel.gridModel.clearSelection();
            this.rightPinModel.gridModel.clearSelection();
        }
    }
});
// ... same for center and right
```

- [ ] **Step 5: Test description panel**

Verify:
- Selecting a column shows its description
- Selecting a different column updates the description
- Selecting a group shows no description (groups have empty description)
- Only one selection active across all pin sections

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(columnchooser): add description panel for selected column"
```

---

## Task 6: Drag-and-Drop Reordering Within Pin Zones

Enable AG Grid row dragging for reordering columns within each pin section. This is the most significant piece of new functionality.

**Files:**
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/PinSectionModel.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/PinSection.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooserModel.ts`
- Modify: `hoist-react/kit/ag-grid/index.ts` (export row drag types)

- [ ] **Step 1: Export row drag types from kit/ag-grid**

Add to `kit/ag-grid/index.ts`:

```typescript
export type {
    RowDragEndEvent,
    RowDragEnterEvent,
    RowDragLeaveEvent,
    RowDragMoveEvent,
    RowDragCancelEvent
} from 'ag-grid-community';
```

- [ ] **Step 2: Enable row drag on PinSectionModel's internal GridModel**

AG Grid's row drag properties are not exposed through Hoist's GridModel config, so we need to pass them via `agOptions`:

```typescript
// In PinSectionModel constructor, update GridModel config:
this.gridModel = new GridModel({
    // ... existing config ...
    columns: [
        {
            colId: 'visible',
            headerName: '',
            width: 40,
            // ... existing renderer
        },
        {
            colId: 'name',
            headerName: 'Column',
            flex: 1,
            agOptions: {
                rowDrag: true  // This column gets the drag handle
            }
        }
    ]
});
```

Then on the Grid component in PinSection.ts, pass agOptions for row drag behavior:

```typescript
// In PinSection.ts
grid({
    model: model.gridModel,
    agOptions: {
        rowDragManaged: true,
        suppressMoveWhenRowDragging: false,
        animateRows: true
    }
})
```

Important: `agOptions` on the Grid component are only applied at initial render (they are NOT reactive). This is fine since these settings don't need to change dynamically.

- [ ] **Step 3: Handle drag end to commit new order**

When a row drag completes, we need to read the new row order from AG Grid and update the target GridModel's columnState.

The challenge: Hoist GridModel doesn't expose `onRowDragEnd` or similar events. We need to handle this through AG Grid's API. Options:

**Option A:** Use `agOptions.onRowDragEnd` on the Grid component.
**Option B:** Use the GridModel's `agApi` to listen for events after grid is ready.

Option A is cleaner. In PinSection.ts:

```typescript
grid({
    model: model.gridModel,
    agOptions: {
        rowDragManaged: true,
        suppressMoveWhenRowDragging: false,
        animateRows: true,
        onRowDragEnd: (event) => model.onRowDragEnd(event)
    }
})
```

In PinSectionModel:

```typescript
onRowDragEnd(event: RowDragEndEvent) {
    // Read new order from AG Grid
    const newOrder: string[] = [];
    this.gridModel.agApi.forEachNode(node => {
        if (node.data && !node.data.isGroup) {
            newOrder.push(node.data.id);
        }
    });
    this.onReorder?.(newOrder, this.pinned);
}

/** Callback set by ColumnChooserModel. */
onReorder: (colIds: string[], pinned: HSide) => void;
```

- [ ] **Step 4: Implement reorder handler in ColumnChooserModel**

```typescript
/** Handle column reorder within a pin zone. */
private handleReorder(reorderedColIds: string[], pinned: HSide) {
    const {gridModel} = this;
    if (!gridModel) return;

    // Build the full new column order: left-pinned + center + right-pinned
    const leftIds = this.getOrderedColIds(this.leftPinModel, pinned === 'left' ? reorderedColIds : null);
    const centerIds = this.getOrderedColIds(this.centerPinModel, pinned === null ? reorderedColIds : null);
    const rightIds = this.getOrderedColIds(this.rightPinModel, pinned === 'right' ? reorderedColIds : null);

    const fullOrder = [...leftIds, ...centerIds, ...rightIds];

    // Build full columnState in new order
    const newState: Partial<ColumnState>[] = fullOrder.map(colId => {
        const existing = gridModel.getStateForColumn(colId);
        return {colId, ...existing};
    });

    gridModel.updateColumnState(newState);
}

private getOrderedColIds(pinModel: PinSectionModel, overrideOrder: string[]): string[] {
    if (overrideOrder) return overrideOrder;
    // Read current order from this pin section's store
    const records = pinModel.gridModel.store.records;
    return records.filter(r => !r.data.isGroup).map(r => r.id as string);
}
```

Wire the callback in onLinked:

```typescript
this.leftPinModel.onReorder = (ids, pinned) => this.handleReorder(ids, pinned);
this.centerPinModel.onReorder = (ids, pinned) => this.handleReorder(ids, pinned);
this.rightPinModel.onReorder = (ids, pinned) => this.handleReorder(ids, pinned);
```

- [ ] **Step 5: Handle tree mode drag constraints**

When `showGroups` is true and drag is active, columns within a group should stay within their group. Group rows themselves should be draggable to reorder groups.

This can be handled via AG Grid's tree data drag behavior — when `treeMode` is enabled on the internal grid, AG Grid's managed row drag naturally respects the tree hierarchy. Children move within their parent, parents can be reordered at the same level.

However, Hoist's treeMode may not automatically enable AG Grid's `treeData` in a way that works with `rowDragManaged`. The implementer should test this interaction and may need to adjust — the fallback is to disable drag in tree mode and only allow drag in flat mode.

For the `marryChildren` constraint: when the target GridModel has `lockColumnGroups: true`, columns should not be draggable outside their group. In tree mode this is natural. In flat mode, the implementer will need to validate drop positions. This can be done via `isRowValidDropPosition` AG Grid callback:

```typescript
// In PinSection.ts agOptions, when lockColumnGroups is true:
isRowValidDropPosition: (params) => {
    // Only allow drops within the same group
    const sourceGroup = params.source.data.parentId;
    const targetGroup = params.overNode?.data?.parentId ?? null;
    return {allowed: sourceGroup === targetGroup};
}
```

- [ ] **Step 6: Test drag-and-drop reordering**

Verify in toolbox:
- Drag handle appears on column name column
- Dragging a column within a pin zone reorders it
- New order is committed to the target grid immediately
- In tree mode, group nodes can be dragged to reorder groups
- In tree mode, children stay within their group when dragged (when lockColumnGroups is true)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(columnchooser): add drag-and-drop reordering within pin zones"
```

---

## Task 7: Cross-Zone Drag (Pin/Unpin via Drag)

Enable dragging columns between pin zones to change their pin state.

**Files:**
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/PinSectionModel.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/PinSection.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooserModel.ts`

- [ ] **Step 1: Register cross-grid drop zones**

After each pin section's AG Grid is ready, register the other two sections as drop zones. This uses AG Grid's `addRowDropZone` API.

Add to PinSectionModel:

```typescript
/** Register an external grid as a drop zone for this grid. */
registerDropZone(targetPinModel: PinSectionModel) {
    const targetApi = targetPinModel.gridModel.agApi;
    const sourceApi = this.gridModel.agApi;
    if (!targetApi || !sourceApi) return;

    const dropZoneParams = targetApi.getRowDropZoneParams({
        onDragStop: (event) => {
            this.onCrossZoneDrop?.(
                event.nodes.map(n => n.data),
                targetPinModel.pinned
            );
        }
    });
    sourceApi.addRowDropZone(dropZoneParams);
}

onCrossZoneDrop: (records: ColumnChooserRecord[], targetPinned: HSide) => void;
```

- [ ] **Step 2: Wire up drop zone registration in ColumnChooserModel**

After the grids are rendered and AG APIs are available, register cross-zone drop targets:

```typescript
// In ColumnChooserModel.onLinked(), after sync reaction:
this.addReaction({
    track: () => [
        this.leftPinModel.gridModel.agApi,
        this.centerPinModel.gridModel.agApi,
        this.rightPinModel.gridModel.agApi
    ],
    run: () => this.registerDropZones(),
    fireImmediately: true,
    once: true
});
```

```typescript
private registerDropZones() {
    const models = [this.leftPinModel, this.centerPinModel, this.rightPinModel];

    // Each grid registers the other two as drop targets
    for (const source of models) {
        for (const target of models) {
            if (source === target) continue;
            source.registerDropZone(target);
        }
    }

    // Wire callbacks
    for (const model of models) {
        model.onCrossZoneDrop = (records, targetPinned) =>
            this.handleCrossZoneDrop(records, targetPinned);
    }
}
```

- [ ] **Step 3: Implement cross-zone drop handler**

```typescript
private handleCrossZoneDrop(records: ColumnChooserRecord[], targetPinned: HSide) {
    const {gridModel} = this;
    if (!gridModel) return;

    const colIds = records.flatMap(r => r.leafColIds);
    gridModel.updateColumnState(
        colIds.map(colId => ({colId, pinned: targetPinned}))
    );
}
```

- [ ] **Step 4: Style drop zones for visual feedback**

Add CSS for drag-over state. AG Grid adds `ag-row-drop-zone` classes during drag operations that can be styled:

```scss
.xh-column-chooser__pin-section {
    &.drag-over {
        outline: 2px dashed var(--xh-intent-primary);
        outline-offset: -2px;
    }
}
```

The implementer should check what CSS classes AG Grid adds during cross-grid drag and apply appropriate styles.

- [ ] **Step 5: Handle empty pin zones as drop targets**

When a pin zone has no columns, the grid is empty and might not register as a valid drop target. Ensure each pin zone renders with a minimum height so it remains a viable drop target even when empty.

```scss
.xh-column-chooser__pin-section {
    min-height: 50px;
}
```

- [ ] **Step 6: Test cross-zone drag**

Verify in toolbox:
- Drag a column from center zone to pinned-left zone — column becomes pinned left in the target grid
- Drag a column from pinned-left to center — column is unpinned
- Visual feedback appears when hovering over a drop zone
- Empty pin zones accept drops
- The target grid updates pinning immediately

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(columnchooser): add cross-zone drag for pin/unpin"
```

---

## Task 8: Restore Defaults and Polish

Add restore defaults functionality, refine the UI, and handle edge cases.

**Files:**
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooserModel.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooser.ts`
- Modify: `hoist-react/desktop/cmp/grid/columnchooser/ColumnChooser.scss`

- [ ] **Step 1: Add restore defaults button**

```typescript
// In ColumnChooser toolbar:
button({
    icon: Icon.reset(),
    text: 'Restore Defaults',
    intent: 'danger',
    onClick: () => impl.restoreDefaultsAsync()
})
```

In ColumnChooserModel:

```typescript
async restoreDefaultsAsync() {
    await this.gridModel?.restoreDefaultsAsync();
}
```

This delegates to GridModel's existing restore mechanism which resets columns, sorting, grouping, etc.

- [ ] **Step 2: Conditionally show pinned sections**

Only show pinned-left and pinned-right sections when they have content OR when the center section has columns that could be dragged there. Consider a simple approach: always show all three sections but collapse empty ones to a minimal "drop here to pin" placeholder.

```typescript
// In ColumnChooser.ts, update pin section rendering:
pinSection({
    model: impl.leftPinModel,
    omit: !impl.hasPinnedColumns('left') && !impl.isDragging
})
```

Alternatively, always render all three with appropriate sizing — pinned sections get `flex: 0, height: 'auto'` (sized to content) while center gets `flex: 1`.

- [ ] **Step 3: Style the complete component**

```scss
.xh-column-chooser {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--xh-border-color);
    border-radius: var(--xh-border-radius-px);
    background: var(--xh-bg-alt);
    overflow: hidden;

    &__toolbar {
        display: flex;
        align-items: center;
        gap: var(--xh-pad-half-px);
        padding: var(--xh-pad-half-px);
        border-bottom: 1px solid var(--xh-border-color);
    }

    &__pin-section {
        display: flex;
        flex-direction: column;

        &-label {
            padding: var(--xh-pad-half-px) var(--xh-pad-px);
            font-weight: var(--xh-font-weight-bold);
            font-size: var(--xh-font-size-small-px);
            color: var(--xh-text-color-muted);
            text-transform: uppercase;
            border-bottom: 1px solid var(--xh-border-color);
        }

        // Center section takes remaining space
        &--center {
            flex: 1;
            overflow: hidden;
        }

        // Pinned sections size to content
        &--pinned {
            flex: none;
            max-height: 200px;
            overflow-y: auto;
        }
    }

    &__description {
        padding: var(--xh-pad-px);
        border-top: 1px solid var(--xh-border-color);
        font-size: var(--xh-font-size-small-px);
        color: var(--xh-text-color-muted);
        min-height: 40px;
        max-height: 80px;
        overflow-y: auto;
    }
}
```

- [ ] **Step 4: Handle edge cases**

- **No columns in grid:** Show empty state message
- **All columns hidden:** At least one column must remain visible — either prevent hiding the last visible column or warn
- **Grid with no groups:** `showGroups` toggle should be hidden (already handled via `hasColumnGroups`)
- **Group with mixed pin states:** If children of a group have different pin states, the group appears in multiple pin zones (or only in the zone where it has children). The `buildRecords` logic already handles this by checking which zone each leaf belongs to.
- **`lockColumnGroups` is false and group children are split:** Multiple instances of the same group may appear. In flat mode, this is invisible (groups aren't shown). In tree mode, each group instance shows only the children in that zone.

- [ ] **Step 5: Final testing pass**

Run through all functionality in toolbox:
1. Columns display correctly in tree and flat modes
2. Visibility toggles work for individual columns and groups
3. Group indeterminate state displays correctly
4. Quick filter narrows the list
5. Description shows for selected column
6. Drag-and-drop reorders within zones
7. Cross-zone drag changes pin state
8. Restore defaults resets everything
9. Component works with grids that have no column groups
10. Component works with grids that have pinned columns

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(columnchooser): add restore defaults, polish UI, handle edge cases"
```

---

## Design Decisions Log

These decisions were made based on the spec discussion and should be revisited if requirements change:

1. **Always commit on change** — No save/cancel flow. Visibility toggles and reorder operations immediately update the target GridModel.
2. **Three pin zones** — Pinned-left, center (unpinned), and pinned-right are separate visual sections with their own internal grids. Cross-zone drag changes pin state.
3. **Standalone component** — Not wired into the existing ColChooser/dynamics system. The new ColumnChooser is an independent component exported from `desktop/cmp/grid`. It can be placed anywhere that has access to a GridModel.
4. **AG Grid row drag via agOptions** — Hoist doesn't expose row drag properties on GridModel, so we use the `agOptions` escape hatch on the Grid component. If this proves limiting, consider adding first-class row drag support to GridModel in a follow-up.
5. **Tree mode uses Hoist treeMode** — Column groups are parent nodes, leaf columns are children. The `parentId` field in the store drives the hierarchy.
6. **Group drag moves all children** — Dragging a group node in tree mode reorders all its leaf columns together. This is the natural AG Grid behavior with tree data + row drag.
7. **`lockColumnGroups` respected in flat mode** — When the target grid has `lockColumnGroups: true`, drag constraints prevent moving columns outside their group boundaries even in flat view.

## Open Questions for Implementation

1. **AG Grid tree drag behavior** — Does AG Grid's `rowDragManaged` work correctly with Hoist's `treeMode`? Need to verify during Task 6 implementation. Fallback: disable drag in tree mode, only allow in flat mode.
2. **Cross-grid drop zone API** — AG Grid's `addRowDropZone` / `getRowDropZoneParams` require the AG API to be available. Need to ensure the grid is fully rendered before registering. The reaction on `agApi` availability should handle this.
3. **Cell click for checkbox toggle** — Hoist's GridModel may not directly support `onCellClicked`. May need a custom cell renderer with an onClick handler instead of relying on AG Grid events.
4. **Indeterminate checkbox state** — The visibility column renderer needs to show three states for groups: all visible, none visible, some visible (indeterminate). This is a rendering concern — use different icons (checkSquare, square, minusSquare).
