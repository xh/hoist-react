/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColChooserConfig, ColumnState, GridModel, IColChooserModel} from '@xh/hoist/cmp/grid';
import {ColChooserOptionsModel} from '@xh/hoist/appcontainer/ColChooserOptionsModel';
import {ColumnGroup} from '@xh/hoist/cmp/grid/columns/ColumnGroup';
import type {ColumnOrGroup} from '@xh/hoist/cmp/grid/Types';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import type {FilterMatchMode, FilterTestFn, Store} from '@xh/hoist/data';
import type {GridApi, RowDropZoneParams} from '@xh/hoist/kit/ag-grid';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isEqual, isBoolean} from 'lodash';

import {ColumnChooserBucketModel} from './ColumnChooserBucketModel';
import {ColumnLibraryModel} from './ColumnLibraryModel';
import type {ColumnChooserDropParticipant} from './ColumnChooserUtils';

/**
 * Abstract base for the grid column chooser model, holding all presentation-agnostic state: the
 * three per-pinned-side {@link ColumnChooserBucketModel}s and the optional {@link ColumnLibraryModel}
 * (synced from a working copy of the target grid's columnState), cross-bucket drag-and-drop wiring,
 * and commit of state changes back to the grid. All state is rendered by the {@link ColumnChooser}
 * component bound to this model.
 *
 * Concrete subclasses supply the presentation-open state: {@link ColChooserModalModel} (dialog and
 * popover) and {@link ColChooserPanelModel} (docked side panel).
 *
 * When `commitOnChange` is false, mutations accumulate in {@link workingState} and are pushed to the
 * grid only via {@link commitPendingAsync} (Save); external changes to the grid's column state while
 * edits are pending trigger a resolve-conflict prompt. The docked panel forces `commitOnChange` true.
 * @internal
 */
export abstract class ColChooserModel extends HoistModel implements IColChooserModel {
    override xhImpl = true;

    //-----------------------
    // Immutable Properties
    //-----------------------
    readonly gridModel: GridModel;
    readonly commitOnChange: boolean;
    readonly showRestoreDefaults: boolean;
    readonly autosizeOnCommit: boolean;
    readonly width: string | number;
    readonly height: string | number;
    readonly libraryWidth: number;
    readonly filterMatchMode: FilterMatchMode;
    readonly columnLibraryEnabled: boolean;

    //-----------------------
    // Child-models
    //-----------------------
    @managed
    readonly leftBucketModel: ColumnChooserBucketModel;

    @managed
    readonly unpinnedBucketModel: ColumnChooserBucketModel;

    @managed
    readonly rightBucketModel: ColumnChooserBucketModel;

    /** Library of hidden columns - rendered and wired only when {@link columnLibraryEnabled}. */
    @managed
    readonly libraryModel: ColumnLibraryModel;

    //-----------------------
    // Observable State
    //-----------------------
    /**
     * Raw text of the single filter control (shared across all grids). Bound directly by the
     * StoreFilterField; the derived match predicate is pushed to every grid store via
     * {@link applyFilterTestFn}.
     */
    @bindable filterText: string = null;

    /**
     * Explanatory hint shown in the drag ghost while a drag is refused - e.g. a locked-group split -
     * so the user understands the `notAllowed` cursor. Set by the hovered participant during the drag
     * (via each grid's `rowDragText` getter, see {@link chooserDragText}) and cleared on drag end.
     * Null when no drag is active or the current drop is allowed. See {@link dragRejectHint}.
     */
    @observable dragHint: string = null;

    /** Pending working copy of the grid's columnState - the source of truth for the bucket grids. */
    @observable.ref
    workingState: ColumnState[] = null;

    /**
     * True when the chooser sizes itself to its content (the overlay presentations - popover and
     * dialog - hug their buckets + library). False when an outer container governs its size (the
     * docked panel), where the buckets flex to fill and the library takes a fixed width.
     */
    get sizeToContent(): boolean {
        return true;
    }

    /** Column state the chooser is currently displaying/operating on (pending working copy). */
    get currentState(): ColumnState[] {
        return this.workingState ?? this.gridModel.columnState;
    }

    /** True when the working copy has uncommitted edits relative to its baseline. */
    @computed
    get isDirty(): boolean {
        return !!this.workingState && !isEqual(this.workingState, this.baseline);
    }

    get bucketModels(): ColumnChooserBucketModel[] {
        return [this.leftBucketModel, this.unpinnedBucketModel, this.rightBucketModel];
    }

    /** Grids participating in cross-grid drag-and-drop - the buckets, plus the library if enabled. */
    get dropParticipants(): ColumnChooserDropParticipant[] {
        return this.columnLibraryEnabled
            ? [...this.bucketModels, this.libraryModel]
            : this.bucketModels;
    }

    /**
     * Store bound to the shared filter control - used only for field inference (and to suppress the
     * control's fallback GridModel context-lookup, which would otherwise latch onto the target grid).
     * The derived predicate is applied to every grid via {@link applyFilterTestFn}. Prefer the library
     * store when present - it carries `chooserGroup` on top of `name`/`description`.
     */
    get filterFieldStore(): Store {
        return this.columnLibraryEnabled
            ? this.libraryModel.chooserGridModel.store
            : this.unpinnedBucketModel.chooserGridModel.store;
    }

    /**
     * Leaf colIds currently rendered across the three bucket grids - respecting both routing to the
     * Column Library (the `showHidden` case) and any active Store filter. Backs the `isDisplayed`
     * predicate the drop engine consumes, so drag-and-drop resolves against what the user can see.
     */
    get displayedLeafColIds(): Set<string> {
        const ids = new Set<string>();
        this.bucketModels.forEach(b =>
            b.chooserGridModel.store.records.forEach(rec => {
                if (!rec.data.isGroup) ids.add(rec.id as string);
            })
        );
        return ids;
    }

    /**
     * True when the Column Library panel is on screen. The buckets hide their per-row visibility
     * action in this state - columns are hidden by dragging them to the library instead.
     */
    @computed
    get isLibraryShown(): boolean {
        return this.columnLibraryEnabled && this.showLibrary;
    }

    /**
     * Whether hidden columns are listed inline in the bucket grids. Automatic: they show inline
     * unless the Column Library panel is on screen, where they live in the library instead.
     */
    @computed
    get showHidden(): boolean {
        return !this.isLibraryShown;
    }

    @computed
    get hasColumnGroups(): boolean {
        return this.gridModel.columns.some(c => c instanceof ColumnGroup);
    }

    @computed
    get columnPinningEnabled(): boolean {
        return this.gridModel.enableColumnPinning;
    }

    /**
     * Leaf colId → ancestor group chain for the target grid, memoized on its `columns` ref. Shared by
     * all three buckets and the drop engine, so the column tree is walked once per column set rather
     * than once per bucket.
     */
    get parentChainMap(): Map<string, ColumnGroup[]> {
        const cols = this.gridModel.columns;
        if (this.parentChainCache?.cols !== cols) {
            this.parentChainCache = {cols, map: buildParentChainMap(cols)};
        }
        return this.parentChainCache.map;
    }

    get optionsModel(): ColChooserOptionsModel {
        return XH.appContainerModel.colChooserOptionsModel;
    }

    constructor({
        gridModel,
        commitOnChange = true,
        showRestoreDefaults = true,
        autosizeOnCommit = false,
        columnLibrary = false,
        width = 300,
        height = 600,
        filterMatchMode = 'startWord'
    }: ColChooserConfig) {
        super();
        makeObservable(this);

        throwIf(!gridModel, "ColChooserModel requires a GridModel via its 'gridModel' config.");

        this.gridModel = gridModel;
        this.commitOnChange = commitOnChange;
        this.showRestoreDefaults = showRestoreDefaults;
        this.autosizeOnCommit = autosizeOnCommit;
        const libraryConfig = isBoolean(columnLibrary) ? {} : columnLibrary;
        this.columnLibraryEnabled = !!columnLibrary;
        this.width = width;
        this.height = height;
        this.libraryWidth = libraryConfig.libraryWidth ?? 250;
        this.filterMatchMode = filterMatchMode;

        this.leftBucketModel = new ColumnChooserBucketModel({
            parent: this,
            pinned: 'left',
            title: 'Pinned Left',
            emptyText: 'Drop a column here to pin left'
        });

        this.unpinnedBucketModel = new ColumnChooserBucketModel({
            parent: this,
            pinned: null,
            title: 'Columns',
            emptyText: 'No columns'
        });

        this.rightBucketModel = new ColumnChooserBucketModel({
            parent: this,
            pinned: 'right',
            title: 'Pinned Right',
            emptyText: 'Drop a column here to pin right'
        });

        // Library backs an opt-in panel - build it only when enabled.
        if (this.columnLibraryEnabled) {
            this.libraryModel = new ColumnLibraryModel({
                parent: this,
                collapseGroups: !!libraryConfig.collapseGroups
            });
        }

        this.addReaction({
            track: () => [this.gridModel.columnState, this.gridModel.columns],
            run: () => this.onGridStateChange(),
            fireImmediately: true
        });

        this.addReaction({
            track: () => [this.showGroups, this.showHidden],
            run: () => this.syncBuckets()
        });

        // Repaint the buckets' per-row action cells when the library toggles - they hide their
        // control while the library is shown (see the action column's displayFn).
        this.addReaction({
            track: () => this.isLibraryShown,
            run: () => this.bucketModels.forEach(it => it.refreshActionColumn())
        });

        // Wire cross-grid drag-and-drop whenever the set of mounted participant grids changes.
        // Stale registrations must be removed - ag-grid only auto-cleans drop zones when the
        // *source* grid is destroyed, leaving broken references to destroyed *target* grids.
        this.addReaction({
            track: () => this.dropParticipants.map(it => it.chooserGridModel.agApi),
            run: () => this.refreshCrossBucketDropZones()
        });
    }

    //-----------------------
    // Presentation contract
    //-----------------------
    /** True when the chooser is currently shown in this model's presentation. */
    abstract get isOpen(): boolean;

    /** Show the chooser in this model's presentation. */
    abstract open(): void;

    /** Subclass hook to clear presentation-open state. */
    protected abstract hide(): void;

    /** Hide the chooser - discarding any uncommitted edits, matching an explicit Cancel. */
    close() {
        this.hide();
        this.discardPending();
        this.clearFilter();
    }

    /** Show the chooser if hidden, hide it if shown. */
    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    //-----------------------
    // Public Methods
    //-----------------------
    /** Apply the shared match predicate (or clear it) across every present grid store. */
    applyFilterTestFn(testFn: FilterTestFn | null) {
        const filter = testFn ? {key: 'default', testFn} : null;
        this.filterableGridModels.forEach(gm => gm.store.setFilter(filter));
    }

    /** Clear the filter text and remove the filter from every grid store. */
    @action
    clearFilter() {
        this.filterText = null;
        this.applyFilterTestFn(null);
    }

    /**
     * Apply a new normalized full column state. The single chokepoint for bucket-driven reorders and
     * cross-bucket moves - updates the working copy and pushes it straight to the grid when
     * auto-committing.
     */
    @action
    applyState(newState: ColumnState[]) {
        this.workingState = newState;
        if (this.commitOnChange) {
            // The grid write's columnState reaction re-syncs the buckets (adopt -> syncBuckets)
            // synchronously before paint, so no optimistic rebuild is needed here.
            this.gridModel.setColumnState(newState);
            this.autosizeIfNeeded();
        } else {
            // Deferred: no grid write fires the sync reaction, so reflect the working copy ourselves.
            this.syncBuckets();
        }
    }

    /**
     * Apply partial column-state changes (e.g. visibility toggles), merged into the working copy.
     * Auto-commits via the grid's own partial update path when auto-committing.
     */
    @action
    updateColumns(changes: Partial<ColumnState>[]) {
        if (!changes.length) return;

        const byId = new Map(changes.map(c => [c.colId, c]));
        this.workingState = this.currentState.map(cs =>
            byId.has(cs.colId) ? {...cs, ...byId.get(cs.colId)} : cs
        );
        if (this.commitOnChange) {
            this.gridModel.updateColumnState(changes);
            this.autosizeIfNeeded();
        } else {
            this.syncBuckets();
        }
    }

    /** Push the pending working copy to the grid (deferred-commit Save). No-op if not dirty. */
    async commitPendingAsync() {
        const {gridModel, workingState} = this;
        if (!this.isDirty) return;

        // Advance the baseline before mutating the grid so the resulting sync reaction sees a clean
        // (non-dirty) state and adopts it, rather than treating our own commit as an external change.
        this.setBaseline(workingState);
        gridModel.setColumnState(workingState);
        await this.autosizeIfNeeded();
    }

    /** Discard pending edits, reverting the working copy to the last committed baseline. */
    @action
    discardPending() {
        this.workingState = this.baseline;
        this.syncBuckets();
    }

    async restoreDefaultsAsync() {
        // Adopt the restored state silently (rather than treating it as an external conflict) - but
        // only if the user confirms the restore. On cancel, restoreDefaultsAsync leaves the grid
        // unchanged, no state-change reaction fires, and pending edits are preserved.
        this.restoringDefaults = true;
        try {
            await this.gridModel.restoreDefaultsAsync();
        } finally {
            this.restoringDefaults = false;
        }
    }

    @action
    setDragHint(hint: string) {
        this.dragHint = hint;
    }

    //-----------------------
    // Implementation
    //-----------------------
    /** Last grid columnState synced/committed against - the baseline for {@link isDirty}. */
    @observable.ref
    private baseline: ColumnState[] = null;

    /** Guards against stacking resolve-conflict prompts while one is already open. */
    private resolvingConflict = false;

    /** True while a restore-defaults is in flight, so its resulting state change is adopted silently. */
    private restoringDefaults = false;

    /** Cache backing {@link parentChainMap}, keyed on the grid's `columns` ref. */
    private parentChainCache: {cols: ColumnOrGroup[]; map: Map<string, ColumnGroup[]>} = null;

    /** Cross-bucket drop zone registrations, retained for removal on bucket grid unmount. */
    private dropZoneRegistrations: Array<{sourceApi: GridApi; params: RowDropZoneParams}> = [];

    /** Grid models with a filterable store - the buckets, plus the library if enabled. */
    private get filterableGridModels(): GridModel[] {
        const models = this.bucketModels.map(b => b.chooserGridModel);
        if (this.columnLibraryEnabled) models.push(this.libraryModel.chooserGridModel);
        return models;
    }

    private get showGroups(): boolean {
        return this.optionsModel.showGroups;
    }

    private get showLibrary(): boolean {
        return this.optionsModel.showLibrary;
    }

    /** Autosize the grid's columns after a commit if configured. Fire-and-forget in immediate mode. */
    private autosizeIfNeeded(): Promise<void> {
        return this.autosizeOnCommit ? this.gridModel.autosizeAsync({showMask: true}) : undefined;
    }

    /** Adopt the current grid columnState as both working copy and baseline. */
    @action
    private adopt(columnState: ColumnState[]) {
        this.baseline = columnState;
        this.workingState = columnState;
        this.syncBuckets();
    }

    /** React to the grid's columnState changing - adopt, or (deferred + dirty) resolve a conflict. */
    private onGridStateChange() {
        const gs = this.gridModel.columnState;

        // Auto-commit, no pending local edits, or mid restore-defaults: take the grid's state outright.
        if (this.commitOnChange || !this.isDirty || this.restoringDefaults) {
            this.adopt(gs);
            return;
        }

        // Deferred mode with pending edits - the grid changed out from under us.
        if (this.hasStructuralChange(gs, this.baseline)) {
            // A real ordering / visibility / pinning change - prompt to resolve.
            this.resolveConflictAsync();
        } else if (!isEqual(gs, this.baseline)) {
            // Only cosmetic (width / manuallySized) changed - absorb silently, keeping pending edits.
            this.absorbCosmeticChange(gs);
        }
    }

    /** True if two column states differ in ordering, visibility, or pinning (ignoring width). */
    private hasStructuralChange(a: ColumnState[], b: ColumnState[]): boolean {
        const strip = (st: ColumnState[]) =>
            st.map(({colId, hidden, pinned}) => ({colId, hidden, pinned: pinned ?? null}));
        return !isEqual(strip(a), strip(b));
    }

    /**
     * Fold a cosmetic-only grid change (column widths) into the pending working copy and advance the
     * baseline to match, so a benign resize while edits are pending neither prompts the user nor is
     * lost on the next commit.
     */
    @action
    private absorbCosmeticChange(gs: ColumnState[]) {
        const byId = new Map(gs.map(cs => [cs.colId, cs]));
        this.workingState = this.workingState.map(cs => {
            const g = byId.get(cs.colId);
            return g ? {...cs, width: g.width, manuallySized: g.manuallySized} : cs;
        });
        this.baseline = gs;
    }

    private async resolveConflictAsync() {
        if (this.resolvingConflict) return;
        this.resolvingConflict = true;

        const loadNew = await XH.confirm({
            title: 'Columns Changed',
            message:
                "This grid's columns were changed elsewhere while you have unsaved column changes. " +
                'Load the new changes (discarding yours), or keep editing your changes?',
            confirmProps: {text: 'Load New Changes', intent: 'primary'},
            cancelProps: {text: 'Keep My Changes'}
        });

        this.resolvingConflict = false;

        const gs = this.gridModel.columnState;
        if (loadNew) {
            this.adopt(gs);
        } else {
            // Advance the baseline so we stop re-prompting; keep the user's working edits, which will
            // overwrite the external change on the next commit.
            this.setBaseline(gs);
        }
    }

    @action
    private setBaseline(columnState: ColumnState[]) {
        this.baseline = columnState;
    }

    @action
    private syncBuckets(columnState: ColumnState[] = this.currentState) {
        if (!columnState) return;
        this.bucketModels.forEach(it =>
            it.syncFromState(columnState, this.showGroups, this.showHidden)
        );
        if (this.columnLibraryEnabled) this.libraryModel.syncFromState(columnState);
    }

    private refreshCrossBucketDropZones() {
        this.clearCrossBucketDropZones();
        this.installCrossBucketDropZones();
    }

    private clearCrossBucketDropZones() {
        this.dropZoneRegistrations.forEach(({sourceApi, params}) => {
            // A destroyed source already had its zones auto-removed by ag-grid.
            if (!sourceApi.isDestroyed()) sourceApi.removeRowDropZone(params);
        });
        this.dropZoneRegistrations = [];
    }

    /** Register drop zones between each pair of currently mounted participant grids. */
    private installCrossBucketDropZones() {
        this.dropParticipants.forEach(source => {
            const sourceApi = source.chooserGridModel.agApi;
            if (!sourceApi) return;

            this.dropParticipants.forEach(target => {
                if (target === source) return;

                const targetApi = target.chooserGridModel.agApi;
                if (!targetApi) return;

                const params = targetApi.getRowDropZoneParams({
                    onDragEnter: () => target.setDragOver?.(true),
                    onDragLeave: () => target.setDragOver?.(false),
                    onDragStop: e => {
                        target.setDragOver?.(false);
                        target.handleCrossBucketDrop(e, source);
                    }
                });

                if (params) {
                    // ag-grid hardcodes the external drop-zone drag icon to 'move'. Our params carry
                    // fromGrid:true so they pass through verbatim - an injected getIconName overrides
                    // that default, letting us flag drops the target would reject (e.g. a position
                    // that splits a locked column group) with the 'notAllowed' icon.
                    (params as any).getIconName = (e: any) => target.getCrossBucketDropIcon(e);
                    sourceApi.addRowDropZone(params);
                    this.dropZoneRegistrations.push({sourceApi, params});
                }
            });
        });
    }
}

/** Map each leaf colId to its parent group chain (outermost to innermost). */
function buildParentChainMap(columns: ColumnOrGroup[]): Map<string, ColumnGroup[]> {
    const ret = new Map<string, ColumnGroup[]>();
    const walk = (cols: ColumnOrGroup[], ancestors: ColumnGroup[]) => {
        for (const col of cols) {
            if (col instanceof ColumnGroup) {
                walk(col.children, [...ancestors, col]);
            } else {
                ret.set(col.colId, ancestors);
            }
        }
    };
    walk(columns, []);
    return ret;
}
