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
import type {FilterMatchMode, FilterTestFn, Store, StoreRecord} from '@xh/hoist/data';
import type {GridApi, RowDropZoneParams} from '@xh/hoist/kit/ag-grid';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isEqual, isObject} from 'lodash';

import {ColChooserBucketModel} from './ColChooserBucketModel';
import {ColLibraryModel} from './ColLibraryModel';
import type {ColChooserDropParticipant} from './ColChooserUtils';

/**
 * Abstract base for the grid column chooser model, holding all presentation-agnostic state: the three
 * {@link ColChooserBucketModel}s, the optional {@link ColLibraryModel}, cross-bucket drag-and-drop
 * wiring, and commit back to the grid. Rendered by {@link ColChooser}.
 *
 * With `commitOnChange` false, edits accumulate in {@link workingState} until Save, and an external
 * column-state change meanwhile prompts to resolve the conflict.
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
    readonly leftBucketModel: ColChooserBucketModel;

    @managed
    readonly unpinnedBucketModel: ColChooserBucketModel;

    @managed
    readonly rightBucketModel: ColChooserBucketModel;

    /** Library of hidden columns - rendered and wired only when {@link columnLibraryEnabled}. */
    @managed
    readonly libraryModel: ColLibraryModel;

    //-----------------------
    // Observable State
    //-----------------------
    /** Raw text of the single filter control, shared across all grids. */
    @bindable filterText: string = null;

    /** Active match predicate from the filter control - null when unfiltered. */
    @observable.ref
    filterTestFn: FilterTestFn = null;

    /**
     * Explanatory hint shown in the drag ghost while a drag is refused, so the user understands the
     * `notAllowed` cursor. Set by the hovered participant, cleared on drag end.
     */
    @observable dragHint: string = null;

    /** Pending working copy of the grid's columnState - the source of truth for the bucket grids. */
    @observable.ref
    workingState: ColumnState[] = null;

    /**
     * True when the chooser sizes itself to its content (the popover and dialog overlays). False when an
     * outer container governs its size (the docked panel), where the buckets flex to fill instead.
     */
    get sizeToContent(): boolean {
        return true;
    }

    /**
     * True when the chooser supplies its own dismiss control. The overlays are dismissed by their own
     * chrome (dialog header, popover outside-click); the header-less dock has none.
     */
    get showCloseButton(): boolean {
        return false;
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

    get bucketModels(): ColChooserBucketModel[] {
        return [this.leftBucketModel, this.unpinnedBucketModel, this.rightBucketModel];
    }

    /** Grids participating in cross-grid drag-and-drop - the buckets, plus the library if enabled. */
    get dropParticipants(): ColChooserDropParticipant[] {
        return this.columnLibraryEnabled
            ? [...this.bucketModels, this.libraryModel]
            : this.bucketModels;
    }

    /**
     * Store bound to the shared filter control, for field inference only - the derived predicate is
     * routed by {@link applyFilterTestFn}. Binding it also suppresses the control's fallback GridModel
     * context-lookup, which would otherwise latch onto the target grid.
     */
    get filterFieldStore(): Store {
        return this.columnLibraryEnabled
            ? this.libraryModel.chooserGridModel.store
            : this.unpinnedBucketModel.chooserGridModel.store;
    }

    /**
     * Leaf colIds currently rendered across the three bucket grids - backs the drop engine's
     * `isDisplayed`, so drag-and-drop resolves against what the user can actually see.
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
     * True when the Column Library panel is on screen. The buckets hide their per-row visibility action
     * in this state - columns are hidden by dragging them to the library instead.
     */
    @computed
    get isLibraryShown(): boolean {
        return this.columnLibraryEnabled && this.showLibrary;
    }

    /** Whether hidden columns list inline in the bucket grids, or in the Library panel when shown. */
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
     * Leaf colId → ancestor group chain, memoized on the grid's `columns` ref so the column tree is
     * walked once per column set rather than once per bucket.
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
        const libraryConfig = isObject(columnLibrary) ? columnLibrary : {};
        this.columnLibraryEnabled = !!columnLibrary;
        this.width = width;
        this.height = height;
        this.libraryWidth = libraryConfig.libraryWidth ?? 250;
        this.filterMatchMode = filterMatchMode;

        this.leftBucketModel = new ColChooserBucketModel({
            parent: this,
            pinned: 'left',
            title: 'Pinned Left',
            emptyText: 'Drop a column here to pin left'
        });

        this.unpinnedBucketModel = new ColChooserBucketModel({
            parent: this,
            pinned: null,
            title: 'Columns',
            emptyText: 'No columns'
        });

        this.rightBucketModel = new ColChooserBucketModel({
            parent: this,
            pinned: 'right',
            title: 'Pinned Right',
            emptyText: 'Drop a column here to pin right'
        });

        // Library backs an opt-in panel - build it only when enabled.
        if (this.columnLibraryEnabled) {
            this.libraryModel = new ColLibraryModel({
                parent: this,
                collapseGroups: !!libraryConfig.collapseGroups
            });
        }

        this.addReaction({
            track: () => [this.gridModel.columnState, this.gridModel.columns],
            run: () => this.syncColumnState(),
            fireImmediately: true
        });

        this.addReaction({
            track: () => [this.showGroups, this.showHidden],
            run: () => this.syncBuckets()
        });

        // Neither the action cells nor the row classes repaint on their own when this flips.
        this.addReaction({
            track: () => this.isLibraryShown,
            run: () =>
                this.bucketModels.forEach(it => {
                    it.refreshActionColumn();
                    it.refreshFilterHighlight();
                })
        });

        this.addReaction({
            track: () => this.filterTestFn,
            run: () => {
                this.bucketModels.forEach(it => it.refreshFilterHighlight());
                this.unpinnedBucketModel.scrollToFilterMatches();
            }
        });

        // Stale registrations must be removed by hand - ag-grid auto-cleans drop zones only when the
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

    /** Hide the chooser, confirming first when pending edits would be discarded. */
    async closeConfirmAsync() {
        if (this.isDirty) {
            const discard = await XH.confirm({
                title: 'Discard Changes?',
                message: 'Your unsaved column changes will be lost.',
                confirmProps: {text: 'Discard', intent: 'danger'},
                cancelProps: {text: 'Keep Editing'}
            });
            if (!discard) return;
        }
        this.close();
    }

    /** Show the chooser if hidden, hide it if shown. */
    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    //-----------------------
    // Public Methods
    //-----------------------
    /**
     * Adopt the shared match predicate (or clear it). Only the Library filters its rows on it - the
     * buckets keep their full column list and highlight matches instead.
     */
    @action
    applyFilterTestFn(testFn: FilterTestFn | null) {
        this.filterTestFn = testFn;
        if (this.columnLibraryEnabled) {
            const filter = testFn ? {key: 'default', testFn} : null;
            this.libraryModel.chooserGridModel.store.setFilter(filter);
        }
    }

    isMatchedColumn(record: StoreRecord): boolean {
        return this.isFilterCandidate(record) && this.filterTestFn(record);
    }

    /** True for a group row as well as a non-matching column - neither can match the filter. */
    shouldDimRow(record: StoreRecord): boolean {
        if (!this.filterTestFn) return false;
        return !this.isFilterCandidate(record) || !this.filterTestFn(record);
    }

    @action
    clearFilter() {
        this.filterText = null;
        this.applyFilterTestFn(null);
    }

    /**
     * Apply a new normalized full column state - the single chokepoint for bucket-driven reorders and
     * cross-bucket moves. Always a full, ordered leaf set, so the grid picks up the new ordering too.
     */
    @action
    applyState(newState: ColumnState[]) {
        const showsOrHides = hasVisibilityChange(this.currentState, newState);
        this.workingState = newState;
        if (this.commitOnChange) {
            this.gridModel.updateColumnState(newState);
            if (showsOrHides) this.autosizeIfNeeded();
        } else {
            // Deferred: no grid write fires the sync reaction, so reflect the working copy ourselves.
            this.syncBuckets();
        }
    }

    /** Apply partial column-state changes (e.g. visibility toggles), merged into the working copy. */
    @action
    updateColumns(changes: Partial<ColumnState>[]) {
        if (!changes.length) return;

        const prior = this.currentState,
            byId = new Map(changes.map(c => [c.colId, c])),
            // Deduped and in columnState order - a full-coverage change list is read by
            // GridModel.updateColumnState as a reorder.
            orderedChanges = prior.filter(cs => byId.has(cs.colId)).map(cs => byId.get(cs.colId));

        this.workingState = prior.map(cs =>
            byId.has(cs.colId) ? {...cs, ...byId.get(cs.colId)} : cs
        );
        if (this.commitOnChange) {
            this.gridModel.updateColumnState(orderedChanges);
            if (hasVisibilityChange(prior, this.workingState)) this.autosizeIfNeeded();
        } else {
            this.syncBuckets();
        }
    }

    /** Push the pending working copy to the grid (deferred-commit Save). No-op if not dirty. */
    async commitPendingAsync() {
        const {gridModel, workingState} = this;
        if (!this.isDirty) return;

        // Advance the baseline first, else the sync reaction reads our own commit as an external change.
        this.setBaseline(workingState);
        gridModel.updateColumnState(workingState);
        await this.autosizeIfNeeded();
    }

    /** Discard pending edits, reverting the working copy to the last committed baseline. */
    @action
    discardPending() {
        this.workingState = this.baseline;
        this.syncBuckets();
    }

    async restoreDefaultsAsync() {
        // Adopt the restored state silently rather than as an external conflict. On cancel the grid is
        // left unchanged, so no reaction fires and pending edits survive.
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

    private isFilterCandidate(record: StoreRecord): boolean {
        return !!this.filterTestFn && !!record && !record.data.isGroup;
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
    private adoptColumnState(columnState: ColumnState[]) {
        this.baseline = columnState;
        this.workingState = columnState;
        this.syncBuckets();
    }

    /** React to the grid's columnState changing - adopt, or (deferred + dirty) resolve a conflict. */
    private syncColumnState() {
        const {columnState} = this.gridModel;

        if (this.commitOnChange || !this.isDirty || this.restoringDefaults) {
            this.adoptColumnState(columnState);
            return;
        }

        // Deferred mode with pending edits - the grid changed out from under us.
        if (this.hasStructuralChange(columnState, this.baseline)) {
            this.resolveConflictAsync();
        } else if (!isEqual(columnState, this.baseline)) {
            this.absorbCosmeticChange(columnState);
        }
    }

    /** True if two column states differ in ordering, visibility, or pinning (ignoring width). */
    private hasStructuralChange(a: ColumnState[], b: ColumnState[]): boolean {
        const strip = (st: ColumnState[]) =>
            st.map(({colId, hidden, pinned}) => ({colId, hidden, pinned: pinned ?? null}));
        return !isEqual(strip(a), strip(b));
    }

    /**
     * Fold a cosmetic-only grid change (column widths) into the working copy and advance the baseline, so
     * a benign resize while edits are pending neither prompts the user nor is lost on the next commit.
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
            this.adoptColumnState(gs);
        } else {
            this.keepPendingAgainst(gs);
        }
    }

    /**
     * Keep pending edits across an external structural change, reconciling them against the new column
     * set - a working copy still naming a removed column would throw on commit. Baseline advances to the
     * grid state so we stop re-prompting; the edits overwrite it on the next commit.
     */
    @action
    private keepPendingAgainst(gs: ColumnState[]) {
        const gsById = new Map(gs.map(cs => [cs.colId, cs])),
            workingIds = new Set(this.workingState.map(cs => cs.colId));

        // Retain the user's ordering for surviving columns; new ones join at the end.
        this.workingState = [
            ...this.workingState.filter(cs => gsById.has(cs.colId)),
            ...gs.filter(cs => !workingIds.has(cs.colId))
        ];
        this.baseline = gs;
        this.syncBuckets();
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
                    // ag-grid hardcodes the external drop-zone icon to 'move'; an injected getIconName
                    // overrides that, letting us flag drops the target would reject.
                    (params as any).getIconName = (e: any) => target.getCrossBucketDropIcon(e);
                    sourceApi.addRowDropZone(params);
                    this.dropZoneRegistrations.push({sourceApi, params});
                }
            });
        });
    }
}

/** True if any column is shown or hidden between the two states - the only change worth autosizing for. */
function hasVisibilityChange(a: ColumnState[], b: ColumnState[]): boolean {
    const hiddenById = new Map(a.map(cs => [cs.colId, !!cs.hidden]));
    return b.some(cs => hiddenById.get(cs.colId) !== !!cs.hidden);
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
