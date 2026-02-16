/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AgGridModel} from '@xh/hoist/cmp/ag-grid';
import {
    Column,
    ColumnCellClassRuleFn,
    ColumnGroup,
    ColumnGroupSpec,
    ColumnOrGroup,
    ColumnOrGroupSpec,
    ColumnSpec,
    GridAutosizeMode,
    GridFilterModelConfig,
    GridGroupSortFn,
    isColumnSpec,
    TreeStyle
} from '@xh/hoist/cmp/grid';
import {GridFilterModel} from '@xh/hoist/cmp/grid/filter/GridFilterModel';
import {fragment, p} from '@xh/hoist/cmp/layout';
import {
    Awaitable,
    HoistModel,
    HSide,
    LoadSpec,
    managed,
    PlainObject,
    SizingMode,
    Some,
    TaskObserver,
    Thunkable,
    VSide,
    XH
} from '@xh/hoist/core';
import {
    Field,
    FieldSpec,
    getFieldName,
    Store,
    StoreConfig,
    StoreRecord,
    StoreRecordId,
    StoreRecordOrId,
    StoreSelectionConfig,
    StoreSelectionModel,
    StoreTransaction
} from '@xh/hoist/data';
import {ColChooserModel as DesktopColChooserModel} from '@xh/hoist/dynamics/desktop';
import {ColChooserModel as MobileColChooserModel} from '@xh/hoist/dynamics/mobile';
import {Icon} from '@xh/hoist/icon';
import {
    AgColumnState,
    CellClickedEvent,
    CellContextMenuEvent,
    CellDoubleClickedEvent,
    CellEditingStartedEvent,
    CellEditingStoppedEvent,
    ColumnEvent,
    RowClickedEvent,
    RowDoubleClickedEvent
} from '@xh/hoist/kit/ag-grid';
import {action, bindable, makeObservable, observable, when} from '@xh/hoist/mobx';
import {wait, waitFor} from '@xh/hoist/promise';
import {ExportOptions} from '@xh/hoist/svc/GridExportService';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {
    apiDeprecated,
    deepFreeze,
    executeIfFunction,
    logWithDebug,
    sharePendingPromise,
    throwIf,
    warnIf,
    withDefault
} from '@xh/hoist/utils/js';
import equal from 'fast-deep-equal';
import {
    castArray,
    clone,
    cloneDeep,
    compact,
    defaults,
    defaultsDeep,
    every,
    find,
    first,
    forEach,
    isArray,
    isBoolean,
    isEmpty,
    isFunction,
    isNil,
    isString,
    isUndefined,
    keysIn,
    last,
    max,
    min,
    omit,
    pick,
    pull,
    take
} from 'lodash';
import {computed} from 'mobx';
import {createRef, ReactNode, RefObject} from 'react';
import {GridAutosizeOptions} from './GridAutosizeOptions';
import {GridContextMenuSpec} from './GridContextMenu';
import {GridSorter, GridSorterLike} from './GridSorter';
import {initPersist} from './impl/InitPersist';
import {managedRenderer} from './impl/Utils';
import {
    ColChooserConfig,
    ColumnState,
    GridModelPersistOptions,
    GroupRowRenderer,
    RowClassFn,
    RowClassRuleFn
} from './Types';

export interface GridConfig {
    /** Columns for this grid. */
    columns?: ColumnOrGroupSpec[];

    /**  Column configs to be set on all columns.  Merges deeply. */
    colDefaults?: Partial<ColumnSpec>;

    /**
     * A Store instance, or a config with which to create a Store. If not supplied,
     * store fields will be inferred from columns config.
     */
    store?: Store | StoreConfig;

    /** True if grid is a tree grid (default false). */
    treeMode?: boolean;

    /** Location for docked summary row(s). Requires `store.summaryRecords` to be populated. */
    showSummary?: boolean | VSide;

    /** Specification of selection behavior. Defaults to 'single' (desktop) and 'disabled' (mobile) */
    selModel?: StoreSelectionModel | StoreSelectionConfig | 'single' | 'multiple' | 'disabled';

    /** Config with which to create a GridFilterModel, or `true` to enable default. Desktop only.*/
    filterModel?: GridFilterModelConfig | boolean;

    /** Config with which to create a ColChooserModel, or boolean `true` to enable default.*/
    colChooserModel?: Omit<ColChooserConfig, 'gridModel'> | boolean;

    /**
     * Function to be called when the user triggers GridModel.restoreDefaultsAsync(). This
     * function will be called after the built-in defaults have been restored, and can be
     * used to restore application specific defaults.
     */
    restoreDefaultsFn?: () => Awaitable<void>;

    /**
     * Confirmation warning to be presented to user before restoring default grid state. Set to
     * null to skip user confirmation.
     */
    restoreDefaultsWarning?: ReactNode;

    /** Options governing persistence. */
    persistWith?: GridModelPersistOptions;

    /**
     * Text/element to display if grid has no records. Defaults to null, in which case no empty
     * text will be shown.
     */
    emptyText?: ReactNode;

    /** True (default) to hide empty text until after the Store has been loaded at least once. */
    hideEmptyTextBeforeLoad?: boolean;

    /** Initial sort to apply to grid data. */
    sortBy?: Some<GridSorterLike>;

    /** Column ID(s) by which to do full-width grouping. */
    groupBy?: Some<string>;

    /**
     * Depth level to expand to on initial load. 0 = all collapsed, 1 = top level expanded, etc.
     * Defaults to 0 for tree grids (i.e. treeMode = true), 1 for standard grouped grids.
     */
    expandLevel?: number;

    /** True (default) to show a count of group member rows within each full-width group row. */
    showGroupRowCounts?: boolean;

    /** Size of text in grid.  If undefined, will default and bind to `XH.sizingMode`. */
    sizingMode?: SizingMode;

    /** True to highlight the currently hovered row. */
    showHover?: boolean;

    /** True to render row borders. */
    rowBorders?: boolean;

    /** Specify treeMode-specific styling. */
    treeStyle?: TreeStyle;

    /** True to use alternating backgrounds for rows. */
    stripeRows?: boolean;

    /** True to render cell borders. */
    cellBorders?: boolean;

    /** True to highlight the focused cell with a border. */
    showCellFocus?: boolean;

    /** True to suppress display of the grid's header row. */
    hideHeaders?: boolean;

    /** 'hover' to only show column header menu icons on hover. */
    headerMenuDisplay?: 'always' | 'hover';

    /** True to disallow moving columns outside of their groups. */
    lockColumnGroups?: boolean;

    /** True to allow the user to manually pin / unpin columns via UI affordances. */
    enableColumnPinning?: boolean;

    /** True to enable exporting this grid and install default context menu items. */
    enableExport?: boolean;

    /** Default export options. */
    exportOptions?: ExportOptions;

    /**
     * Closure to generate CSS class names for a row.
     * NOTE that, once added, classes will *not* be removed if the data changes.
     * Use `rowClassRules` instead if StoreRecord data can change across refreshes.
     */
    rowClassFn?: RowClassFn;

    /**
     * Object keying CSS class names to functions determining if they should be added or
     * removed from the row. See Ag-Grid docs on "row styles" for details.
     */
    rowClassRules?: Record<string, RowClassRuleFn>;

    /** Height (in px) of a group row. Note that this will override `sizingMode` for group rows. */
    groupRowHeight?: number;

    /** Function used to render group rows. */
    groupRowRenderer?: GroupRowRenderer;

    /**
     * Function to use to sort full-row groups.  Called with two group values to compare
     * in the form of a standard JS comparator.  Default is an ascending string sort.
     * Set to `null` to prevent sorting of groups.
     */
    groupSortFn?: GridGroupSortFn;

    /**
     * Callback when a key down event is detected on the grid. Note that the ag-Grid API provides
     * limited ability to customize keyboard handling. This handler is designed to allow
     * applications to work around this.
     */
    onKeyDown?: (e: KeyboardEvent) => void;

    /**
     * Callback when a row is clicked. (Note that the event received may be null - e.g. for
     * clicks on full-width group rows.)
     */
    onRowClicked?: (e: RowClickedEvent) => void;

    /**
     * Callback when a row is double-clicked. (Note that the event received may be null - e.g.
     * for clicks on full-width group rows.)
     */
    onRowDoubleClicked?: (e: RowDoubleClickedEvent) => void;

    /**
     * Callback when any cell on the grid is clicked - inspect the event to determine the column.
     * Note that {@link ColumnSpec.onCellClicked} is a more targeted handler scoped to a single
     * column, which might be more convenient when clicks on only one column are of interest.
     */
    onCellClicked?: (e: CellClickedEvent) => void;

    /**
     * Callback when a cell is double-clicked.
     */
    onCellDoubleClicked?: (e: CellDoubleClickedEvent) => void;

    /**
     * Callback when the context menu is opened. Note that the event received can also be
     * triggered via a long press (aka tap and hold) on mobile devices.
     */
    onCellContextMenu?: (e: CellContextMenuEvent) => void;

    /**
     * Array of strings (or a function returning one) providing user-facing labels for each depth
     * level in a tree or grouped grid - e.g. `['Country', 'State', 'City']`. If set, the
     * expand/collapse options in the default context menu will be enhanced to allow users to
     * expand/collapse to a specific level. See {@link GroupingChooserModel.valueDisplayNames}
     * for a convenient getter that will satisfy this API when a GroupingChooser is in play.
     */
    levelLabels?: Thunkable<string[]>;

    /**
     * Number of clicks required to expand / collapse a parent row in a tree grid. Defaults
     * to 2 for desktop, 1 for mobile. Any other value prevents clicks on row body from
     * expanding / collapsing (requires click on tree col affordance to expand/collapse).
     */
    clicksToExpand?: number;

    /**
     * Array of RecordActions, dividers, or token strings with which to create a context menu.
     * May also be specified as a function returning same or false to omit context menu from grid.
     */
    contextMenu?: GridContextMenuSpec | false;

    /**
     * Governs if the grid should reuse a limited set of DOM elements for columns visible in the
     * scroll area (versus rendering all columns).  Consider this performance optimization for
     * grids with a very large number of columns obscured by horizontal scrolling. Note that
     * setting this value to true may limit the ability of the grid to autosize offscreen columns
     * effectively. Default false.
     */
    useVirtualColumns?: boolean;

    /** Default autosize options. */
    autosizeOptions?: GridAutosizeOptions;

    /** True to enable full row editing. Default false. */
    fullRowEditing?: boolean;

    /**
     * Number of clicks required to begin inline-editing a cell. May be 2 (default) or 1 - any
     * other value prevents user clicks from starting an edit.
     */
    clicksToEdit?: number;

    /**
     * Set to true to if application will be reloading data when the sortBy property changes on
     * this model (either programmatically, or via user-click.)  Useful for applications with large
     * data sets that are performing external, or server-side sorting and filtering.  Setting this
     * flag means that the grid should not immediately respond to user or programmatic changes to
     * the sortBy property, but will instead wait for the next load of data, which is assumed to be
     * pre-sorted. Default false.
     */
    externalSort?: boolean;

    /**
     * Set to true to highlight a row on click. Intended to provide feedback to users in grids
     * without selection. Note this setting overrides the styling used by Column.highlightOnChange,
     * and is not recommended for use alongside that feature. Default true for mobiles,
     * otherwise false.
     */
    highlightRowOnClick?: boolean;

    /**
     *  Set to true to ensure that the grid will have a single horizontal scrollbar spanning the
     *  width of all columns, including any pinned columns.  A value of false (default) will show
     *  the scrollbar only under the scrollable area.
     */
    enableFullWidthScroll?: boolean;

    /**
     * Flags for experimental features. These features are designed for early client-access and
     * testing, but are not yet part of the Hoist API.
     */
    experimental?: GridExperimentalFlags;

    /** Extra app-specific data for the GridModel. */
    appData?: PlainObject;

    /** @internal */
    xhImpl?: boolean;
}

interface GridExperimentalFlags {
    /**
     * Set to true to enable more optimal row sorting in cases where only small subsets of rows are
     * updated in configurations where rows have many siblings.
     * See https://www.ag-grid.com/javascript-data-grid/grid-options/#reference-sort-deltaSort for
     * more details on where this option may improve (or degrade) performance.
     */
    deltaSort?: boolean;

    /**
     * Set to true to disable scroll optimization for large grids, where we proactively update the
     * row heights in ag-grid whenever the data changes to avoid hitching while quickly scrolling
     * through large grids.
     */
    disableScrollOptimization?: boolean;
}

/**
 * Core Model for a Grid, specifying the grid's data store, column definitions,
 * sorting/grouping/selection state, and context menu configuration.
 *
 * This is the primary application entry-point for specifying Grid component options and behavior.
 *
 * This model also supports nested tree data. To show a tree:
 *   1) Bind this model to a store with hierarchical records.
 *   2) Set `treeMode: true` on this model.
 *   3) Include a single column with `isTreeColumn: true`. This column will provide expand /
 *      collapse controls and indent child columns in addition to displaying its own data.
 *
 */
export class GridModel extends HoistModel {
    static DEFAULT_RESTORE_DEFAULTS_WARNING = fragment(
        p(
            'This action will clear any customizations you have made to this grid, including filters, column selection, ordering, and sizing.'
        ),
        p('OK to proceed?')
    );

    static DEFAULT_AUTOSIZE_MODE: GridAutosizeMode = 'onSizingModeChange';

    //------------------------
    // Immutable public properties
    //------------------------
    store: Store;
    selModel: StoreSelectionModel;
    treeMode: boolean;
    colChooserModel: HoistModel;
    rowClassFn: RowClassFn;
    rowClassRules: Record<string, RowClassRuleFn>;
    contextMenu: GridContextMenuSpec;
    groupRowHeight: number;
    groupRowRenderer: GroupRowRenderer;
    groupSortFn: GridGroupSortFn;
    showGroupRowCounts: boolean;
    enableColumnPinning: boolean;
    enableExport: boolean;
    enableFullWidthScroll: boolean;
    externalSort: boolean;
    exportOptions: ExportOptions;
    useVirtualColumns: boolean;
    autosizeOptions: GridAutosizeOptions;
    restoreDefaultsFn: () => Awaitable<void>;
    restoreDefaultsWarning: ReactNode;
    fullRowEditing: boolean;
    hideEmptyTextBeforeLoad: boolean;
    highlightRowOnClick: boolean;
    clicksToExpand: number;
    clicksToEdit: number;
    lockColumnGroups: boolean;
    headerMenuDisplay: 'always' | 'hover';
    colDefaults: Partial<ColumnSpec>;
    experimental: GridExperimentalFlags;
    onKeyDown: (e: KeyboardEvent) => void;
    onRowClicked: (e: RowClickedEvent) => void;
    onRowDoubleClicked: (e: RowDoubleClickedEvent) => void;
    onCellClicked: (e: CellClickedEvent) => void;
    onCellDoubleClicked: (e: CellDoubleClickedEvent) => void;
    onCellContextMenu: (e: CellContextMenuEvent) => void;
    levelLabels: Thunkable<string[]>;
    appData: PlainObject;

    @managed filterModel: GridFilterModel;
    @managed agGridModel: AgGridModel;
    viewRef: RefObject<HTMLDivElement> = createRef();

    //------------------------
    // Observable API
    //------------------------
    @observable.ref columns: ColumnOrGroup[] = [];
    @observable.ref columnState: ColumnState[] = [];
    @observable.ref expandState: any = {};
    @observable.ref sortBy: GridSorter[] = [];
    @observable.ref groupBy: string[] = null;
    @observable expandLevel: number = 0;

    @computed.struct
    get persistableColumnState(): ColumnState[] {
        return this.cleanColumnState(this.columnState);
    }

    @bindable showSummary: boolean | VSide = false;
    @bindable.ref emptyText: ReactNode;
    @bindable treeStyle: TreeStyle;

    /**
     * Flag to track inline editing at a granular level. Will toggle each time row
     * or cell editing is activated or ended.
     */
    get isEditing(): boolean {
        return !!this.editingCell;
    }

    /**
     * Flag to track inline editing at a general level.
     * Will not change during transient navigation from cell to cell or row to row,
     * but rather is debounced such that grid editing will need to "settle" for a
     * short time before toggling.
     */
    @observable isInEditingMode: boolean = false;

    static defaultContextMenu = [
        'filter',
        '-',
        'copy',
        'copyWithHeaders',
        'copyCell',
        '-',
        'expandCollapse',
        '-',
        'exportExcel',
        'exportCsv',
        '-',
        'restoreDefaults',
        '-',
        'colChooser',
        'autosizeColumns'
    ];
    @observable.ref private editingCell: {colId: string; rowIndex: number} = null;
    private _defaultState; // initial state provided to ctor - powers restoreDefaults().

    /**
     * Is autosizing enabled on this grid?
     * To disable autosizing, set autosizeOptions.mode to GridAutosizeMode.DISABLED.
     */
    get autosizeEnabled(): boolean {
        return this.autosizeOptions.mode !== 'disabled';
    }

    get maxDepth(): number {
        const {groupBy, store, treeMode} = this;
        return treeMode ? store.maxDepth : groupBy ? groupBy.length : 0;
    }

    get bodyViewport(): HTMLElement {
        return this.viewRef.current?.querySelector('.ag-body-viewport') as HTMLElement;
    }

    /** Tracks execution of filtering operations.*/
    @managed filterTask = TaskObserver.trackAll();

    /** Tracks execution of autosize operations. */
    @managed autosizeTask = TaskObserver.trackAll();

    constructor(config: GridConfig) {
        super();
        makeObservable(this);
        let {
            store,
            columns,
            colDefaults = {},
            treeMode = false,
            showSummary = false,
            selModel,
            filterModel,
            colChooserModel,
            emptyText = null,
            hideEmptyTextBeforeLoad = true,
            sortBy = [],
            groupBy = null,
            showGroupRowCounts = true,
            externalSort = false,
            persistWith,
            sizingMode,
            showHover = false,
            rowBorders = XH.isMobileApp,
            rowClassFn = null,
            rowClassRules = {},
            cellBorders = false,
            treeStyle = 'highlights',
            stripeRows = !treeMode || treeStyle === 'none',
            showCellFocus = false,
            hideHeaders = false,
            headerMenuDisplay = 'always',
            lockColumnGroups = true,
            enableColumnPinning = true,
            enableExport = false,
            exportOptions = {},
            groupRowHeight,
            groupRowRenderer,
            groupSortFn,
            onKeyDown,
            onRowClicked,
            onRowDoubleClicked,
            onCellClicked,
            onCellDoubleClicked,
            onCellContextMenu,
            clicksToExpand = XH.isMobileApp ? 1 : 2,
            contextMenu,
            useVirtualColumns = false,
            autosizeOptions = {},
            restoreDefaultsFn,
            restoreDefaultsWarning = GridModel.DEFAULT_RESTORE_DEFAULTS_WARNING,
            fullRowEditing = false,
            clicksToEdit = 2,
            expandLevel = treeMode ? 0 : 1,
            levelLabels,
            highlightRowOnClick = XH.isMobileApp,
            enableFullWidthScroll = false,
            experimental,
            appData,
            xhImpl,
            ...rest
        }: GridConfig = config;

        this.xhImpl = xhImpl;

        this._defaultState = {columns, sortBy, groupBy, expandLevel};

        this.treeMode = treeMode;
        this.treeStyle = treeStyle;
        this.showSummary = showSummary;
        this.emptyText = emptyText;
        this.hideEmptyTextBeforeLoad = hideEmptyTextBeforeLoad;
        this.headerMenuDisplay = headerMenuDisplay;
        this.rowClassFn = rowClassFn;
        this.rowClassRules = rowClassRules;
        this.groupRowHeight = groupRowHeight;
        this.groupRowRenderer = managedRenderer(groupRowRenderer, 'GROUP_ROW');
        this.groupSortFn = withDefault(groupSortFn, this.defaultGroupSortFn);
        this.showGroupRowCounts = showGroupRowCounts;
        this.contextMenu =
            contextMenu === false ? [] : withDefault(contextMenu, GridModel.defaultContextMenu);
        this.useVirtualColumns = useVirtualColumns;
        this.externalSort = externalSort;
        this.enableFullWidthScroll = enableFullWidthScroll;
        this.autosizeOptions = defaults(
            {...autosizeOptions},
            {
                mode: GridModel.DEFAULT_AUTOSIZE_MODE,
                renderedRowsOnly: false,
                includeCollapsedChildren: false,
                showMask: false,
                // Larger buffer on mobile (perhaps counterintuitively) to minimize clipping due to
                // any autosize mis-calc. Manual col resizing on mobile is super annoying!
                bufferPx: XH.isMobileApp ? 10 : 5,
                fillMode: 'none'
            }
        );
        this.restoreDefaultsFn = restoreDefaultsFn;
        this.restoreDefaultsWarning = restoreDefaultsWarning;
        this.fullRowEditing = fullRowEditing;
        this.clicksToExpand = clicksToExpand;
        this.clicksToEdit = clicksToEdit;
        this.highlightRowOnClick = highlightRowOnClick;
        this.expandLevel = expandLevel;
        this.levelLabels = levelLabels;

        throwIf(
            autosizeOptions.fillMode &&
                !['all', 'left', 'right', 'none'].includes(autosizeOptions.fillMode),
            `Unsupported value for fillMode.`
        );

        this.lockColumnGroups = lockColumnGroups;
        this.enableColumnPinning = enableColumnPinning;
        this.enableExport = enableExport;
        this.exportOptions = exportOptions;

        Object.assign(this, rest);

        this.colDefaults = colDefaults;
        this.parseAndSetColumnsAndStore(columns, store);

        this.setGroupBy(groupBy);
        this.setSortBy(sortBy);

        sizingMode = this.parseSizingMode(sizingMode);

        this.agGridModel = new AgGridModel({
            sizingMode,
            showHover,
            rowBorders,
            stripeRows,
            cellBorders,
            showCellFocus,
            hideHeaders,
            xhImpl
        });

        this.colChooserModel = this.parseChooserModel(colChooserModel);
        this.selModel = this.parseSelModel(selModel);
        this.filterModel = this.parseFilterModel(filterModel);
        if (this.filterModel) this._defaultState.filter = this.filterModel.filter;
        if (persistWith) initPersist(this, persistWith);
        this.experimental = this.parseExperimental(experimental);
        this.onKeyDown = onKeyDown;
        this.onRowClicked = onRowClicked;
        this.onRowDoubleClicked = onRowDoubleClicked;
        this.onCellClicked = onCellClicked;
        this.onCellDoubleClicked = onCellDoubleClicked;
        this.onCellContextMenu = onCellContextMenu;
        this.appData = appData ? clone(appData) : {};

        this.addReaction({
            track: () => this.isEditing,
            run: isEditing => (this.isInEditingMode = isEditing),
            debounce: 500
        });

        if (!isEmpty(rest)) {
            const keys = keysIn(rest);
            throw XH.exception(
                `Key(s) '${keys}' not supported in GridModel.  For custom data, use the 'appData' property.`
            );
        }
    }

    /**
     * Restore the column, sorting, and grouping configs as specified by the application at
     * construction time. This is the state without any saved grid state or user changes applied.
     * This method will clear the persistent grid state saved for this grid, if any.
     *
     * @returns true if defaults were restored
     */
    async restoreDefaultsAsync(): Promise<boolean> {
        if (this.restoreDefaultsWarning) {
            const confirmed = await XH.confirm({
                message: this.restoreDefaultsWarning,
                confirmProps: {
                    text: 'Yes, restore defaults',
                    icon: Icon.reset(),
                    intent: 'primary'
                }
            });
            if (!confirmed) return false;
        }

        const {columns, sortBy, groupBy, filter, expandLevel} = this._defaultState;
        this.setColumns(columns);
        this.setSortBy(sortBy);
        this.setGroupBy(groupBy);
        this.expandToLevel(expandLevel);

        this.filterModel?.setFilter(filter);

        if (this.autosizeOptions.mode === 'managed') {
            await this.autosizeAsync();
        }

        if (this.restoreDefaultsFn) {
            await this.restoreDefaultsFn();
        }

        return true;
    }

    /**
     * Export grid data using Hoist's server-side export.
     *
     * @param options - overrides of default export options to use for this export.
     */
    async exportAsync(options: ExportOptions = {}) {
        throwIf(!this.enableExport, 'Export not enabled for this grid. See GridModel.enableExport');
        return XH.gridExportService.exportAsync(this, {...this.exportOptions, ...options});
    }

    /**
     * Export grid data using ag-Grid's built-in client-side export.
     *
     * @param filename - name for exported file.
     * @param type - type of export - either 'excel' or 'csv'.
     * @param params - passed to agGrid's export functions.
     */
    localExport(filename: string, type: 'excel' | 'csv', params: PlainObject = {}) {
        const {agApi} = this.agGridModel;
        if (!agApi) return;
        params = defaults(
            {...params},
            {
                fileName: filename,
                processCellCallback: this.formatValuesForExport
            }
        );

        if (type === 'excel') {
            agApi.exportDataAsExcel(params);
        } else if (type === 'csv') {
            agApi.exportDataAsCsv(params);
        }
    }

    /**
     * Select records in the grid.
     * @param records - one or more record(s) / ID(s) to select.
     * @param opts - additional post-selection options
     */
    async selectAsync(
        records: Some<StoreRecordOrId>,
        opts: {
            /**
             * True (default) to scroll the grid or expand nodes as needed to make selection
             * visible if it is within a collapsed node or outside of the visible scroll window.
             */
            ensureVisible?: boolean;
            /** True (default) to clear previous selection (rather than add to it). */
            clearSelection?: boolean;
        } = {}
    ) {
        const {ensureVisible = true, clearSelection = true} = opts;
        this.selModel.select(records, clearSelection);
        if (ensureVisible) await this.ensureSelectionVisibleAsync();
    }

    /**
     * Select the first row in the grid.
     *
     * See {@link preSelectFirstAsync} for a useful variant of this method that will leave the
     * any pre-existing selection unchanged, which is what apps typically want when reloading an
     * already-populated grid.
     */
    async selectFirstAsync(
        opts: {
            /**
             * True (default) to expand nodes as needed to allow selection when the first selectable
             * node is in a collapsed group.
             */
            expandParentGroups?: boolean;
            /**
             * True (default) to scroll the grid or expand nodes as needed to make selection
             * visible if it is outside of the visible scroll window.
             */
            ensureVisible?: boolean;
        } = {}
    ) {
        const {expandParentGroups = true, ensureVisible = true} = opts;
        await this.whenReadyAsync();
        if (!this.isReady) return;

        // Get first visible row with data - i.e. backed by a record, not a full-width group row.
        const {selModel} = this,
            row = this.agGridModel.getFirstSelectableRowNode();

        // If displayed, or potentially expandable to display, select it.
        if (row && (expandParentGroups || row.displayed)) {
            const id = row.data.id;
            if (id != null) {
                selModel.select(id);
                if (ensureVisible) await this.ensureSelectionVisibleAsync();
            }
        }
    }

    /**
     * Select the first row in the grid, if no other selection present.
     * This method delegates to {@link selectFirstAsync}.
     */
    async preSelectFirstAsync() {
        if (!this.hasSelection) return this.selectFirstAsync({expandParentGroups: false});
    }

    /** Deselect all rows. */
    clearSelection() {
        this.selModel.clear();
    }

    /**
     * Scroll to ensure the selected record or records are visible.
     *
     * If multiple records are selected, scroll to the first record and then the last. This will do
     * the minimum scrolling necessary to display the start of the selection and as much as
     * possible of the rest.
     *
     * Any selected records that are hidden because their parent rows are collapsed will first
     * be revealed by expanding their parent rows.
     */
    async ensureSelectionVisibleAsync() {
        await this.whenReadyAsync();
        if (!this.isReady) return;

        return this.ensureRecordsVisibleAsync(this.selectedRecords);
    }

    /**
     * Scroll to ensure the provided record or records are visible.
     *
     * If multiple records are specified, scroll to the first record and then the last. This will do
     * the minimum scrolling necessary to display the start of the provided record and as much as
     * possible of the rest.
     *
     * Any provided records that are hidden because their parent rows are collapsed will first
     * be revealed by expanding their parent rows.
     *
     * @param records - one or more record(s) for which to ensure visibility.
     */
    async ensureRecordsVisibleAsync(records: Some<StoreRecord>) {
        await this.whenReadyAsync();
        if (!this.isReady) return;

        records = castArray(records);

        const {agApi} = this,
            indices = [];

        // 1) Expand any nodes that are collapsed
        const expandedRows = new Set<string>();
        records.forEach(({agId}) => {
            for (let row = agApi.getRowNode(agId)?.parent; row; row = row.parent) {
                if (!row.expanded) {
                    agApi.setRowNodeExpanded(row, true);
                    expandedRows.add(agId);
                }
            }
        });

        if (expandedRows.size) {
            await waitFor(() =>
                every([...expandedRows], it => !isNil(agApi.getRowNode(it).rowIndex))
            );
        }

        // 2) Scroll to all nodes
        records.forEach(({agId}) => {
            const rowIndex = agApi.getRowNode(agId)?.rowIndex;
            if (!isNil(rowIndex)) indices.push(rowIndex);
        });

        const indexCount = indices.length;
        if (indexCount !== records.length) {
            this.logWarn('Grid row nodes not found for all provided records.');
        }

        if (indexCount === 1) {
            agApi.ensureIndexVisible(indices[0]);
        } else if (indexCount > 1) {
            agApi.ensureIndexVisible(max(indices));
            agApi.ensureIndexVisible(min(indices));
        }
    }

    /** True if any records are selected. */
    get hasSelection(): boolean {
        return !this.selModel.isEmpty;
    }

    /** Currently selected records. */
    get selectedRecords(): StoreRecord[] {
        return this.selModel.selectedRecords;
    }

    /** IDs of currently selected records. */
    get selectedIds(): StoreRecordId[] {
        return this.selModel.selectedIds;
    }

    /**
     * Single selected record, or null if multiple/no records selected.
     *
     * Note that this getter will also change if just the data of selected record is changed
     * due to store loading or editing.  Applications only interested in the identity
     * of the selection should use {@link selectedId} instead.
     */
    get selectedRecord(): StoreRecord {
        return this.selModel.selectedRecord;
    }

    /**
     * ID of selected record, or null if multiple/no records selected.
     *
     * Note that this getter will *not* change if just the data of selected record is changed
     * due to store loading or editing.  Applications also interested in the contents of the
     * selection should use the {@link selectedRecord} getter instead.
     */
    get selectedId(): StoreRecordId {
        return this.selModel.selectedId;
    }

    /** True if this grid has no records to show in its store. */
    get empty(): boolean {
        return this.store.empty;
    }

    get isReady(): boolean {
        return this.agGridModel.isReady;
    }

    get agApi() {
        return this.agGridModel.agApi;
    }

    get sizingMode(): SizingMode {
        return this.agGridModel.sizingMode;
    }

    set sizingMode(v: SizingMode) {
        this.agGridModel.sizingMode = v;
    }

    setSizingMode(v: SizingMode) {
        this.agGridModel.sizingMode = v;
    }

    get showHover(): boolean {
        return this.agGridModel.showHover;
    }

    set showHover(v: boolean) {
        this.agGridModel.showHover = v;
    }

    setShowHover(v: boolean) {
        this.agGridModel.showHover = v;
    }

    get rowBorders(): boolean {
        return this.agGridModel.rowBorders;
    }

    set rowBorders(v: boolean) {
        this.agGridModel.rowBorders = v;
    }

    setRowBorders(v: boolean) {
        this.agGridModel.rowBorders = v;
    }

    get stripeRows(): boolean {
        return this.agGridModel.stripeRows;
    }

    set stripeRows(v: boolean) {
        this.agGridModel.stripeRows = v;
    }

    setStripeRows(v: boolean) {
        this.agGridModel.stripeRows = v;
    }

    get cellBorders(): boolean {
        return this.agGridModel.cellBorders;
    }

    set cellBorders(v: boolean) {
        this.agGridModel.cellBorders = v;
    }

    setCellBorders(v: boolean) {
        this.agGridModel.cellBorders = v;
    }

    get showCellFocus(): boolean {
        return this.agGridModel.showCellFocus;
    }

    set showCellFocus(v: boolean) {
        this.agGridModel.showCellFocus = v;
    }

    setShowCellFocus(v: boolean) {
        this.agGridModel.showCellFocus = v;
    }

    get hideHeaders(): boolean {
        return this.agGridModel.hideHeaders;
    }

    set hideHeaders(v: boolean) {
        this.agGridModel.hideHeaders = v;
    }

    setHideHeaders(v: boolean) {
        this.agGridModel.hideHeaders = v;
    }

    /**
     * Apply full-width row-level grouping to the grid for the given column ID(s).
     * This method will clear grid grouping if provided any ids without a corresponding column.
     * @param colIds - ID(s) for row grouping, null to ungroup.
     */
    @action
    setGroupBy(colIds: Some<string>) {
        colIds = isNil(colIds) ? [] : castArray(colIds);

        const invalidColIds = colIds.filter(it => !this.findColumn(this.columns, it));
        if (invalidColIds.length) {
            this.logWarn(
                'Unknown colId specified in groupBy - grid will not be grouped.',
                invalidColIds
            );
            colIds = [];
        }

        this.groupBy = colIds;
    }

    /** Expand all parent rows in grouped or tree grid. (Note, this is recursive for trees!) */
    expandAll() {
        this.expandToLevel(this.maxDepth);
    }

    /** Collapse all parent rows in grouped or tree grid. */
    collapseAll() {
        this.expandToLevel(0);
    }

    /** Expand all parent rows in grouped or tree grid to the specified level. */
    @action
    expandToLevel(level: number) {
        this.expandLevel = level;

        // 0) Not rendered, we are done.
        const {agApi, store} = this;
        if (!agApi) return;

        // 1) Update rendered grid.
        agApi.setGridOption('groupDefaultExpanded', level);
        if (level == 0 || level >= this.maxDepth) {
            level == 0 ? agApi.collapseAll() : agApi.expandAll();
        } else {
            // Update raw nodes for efficiency
            // This approach documented in agGrids onGroupExpandedOrCollapsed() docs (2025)
            store.records.forEach(rec => {
                const node = agApi.getRowNode(rec.agId);
                if (node) {
                    node.expanded = rec.depth < level;
                }
            });
            agApi.onGroupExpandedOrCollapsed();
        }
        this.noteAgExpandStateChange();
    }

    /**
     * Get the resolved level labels for the current state of the grid.
     */
    get resolvedLevelLabels(): string[] {
        const {maxDepth, levelLabels} = this,
            ret = executeIfFunction(levelLabels);
        if (ret && ret.length < maxDepth + 1) {
            this.logDebug('Value produced by `GridModel.levelLabels` has insufficient length.');
            return null;
        }
        return ret ? take(ret, maxDepth + 1) : null;
    }

    /**
     * Sort this grid.
     * This method is a no-op if provided any sorters without a corresponding column.
     */
    @action
    setSortBy(sorters: Some<GridSorterLike>) {
        if (!sorters) {
            this.sortBy = [];
            return;
        }

        sorters = castArray(sorters);
        const newSorters = sorters.map(it => GridSorter.parse(it));

        // Allow sorts associated with Hoist columns as well as ag-Grid dynamic grouping columns
        const invalidSorters = newSorters.filter(
            it => !it.colId?.startsWith('ag-Grid') && !this.findColumn(this.columns, it.colId)
        );
        if (invalidSorters.length) {
            this.logWarn('GridSorter colId not found in grid columns', invalidSorters);
            return;
        }

        this.sortBy = newSorters;
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        // Delegate to any store that has load support
        return (this.store as any).loadSupport?.loadAsync(loadSpec);
    }

    /** Load the underlying store. */
    loadData(rawData: any[], rawSummaryData?: Some<PlainObject>) {
        return this.store.loadData(rawData, rawSummaryData);
    }

    /** Update the underlying store. */
    updateData(rawData: PlainObject[] | StoreTransaction) {
        return this.store.updateData(rawData);
    }

    /** Clear the underlying store, removing all rows. */
    clear() {
        this.store.clear();
    }

    @action
    setColumns(colConfigs: ColumnOrGroupSpec[]) {
        colConfigs = this.enhanceColConfigsFromStore(colConfigs);

        const columns = compact(colConfigs.map(c => this.buildColumn(c)));
        this.validateColumns(columns);

        this.columns = columns;
        this.columnState = this.getLeafColumns().map(it => this.getDefaultStateForColumn(it));
    }

    setColumnState(colState: ColumnState[]) {
        this.columnState = this.cleanColumnState(colState);
    }

    showColChooser() {
        (this.colChooserModel as any)?.open();
    }

    noteAgColumnStateChanged(agColState: AgColumnState[]) {
        const colStateChanges: Partial<ColumnState>[] = agColState.map(
            ({colId, width, hide, pinned}) => {
                const col = this.findColumn(this.columns, colId);
                if (!col) return null;
                return {
                    colId,
                    pinned: isBoolean(pinned) ? (pinned ? 'left' : null) : pinned,
                    hidden: !!hide,
                    width: col.flex ? undefined : width
                };
            }
        );

        pull(colStateChanges, null);
        this.updateColumnState(colStateChanges);
    }

    @action
    setExpandState(expandState) {
        this.agGridModel.setExpandState(expandState);
        this.noteAgExpandStateChange();
    }

    @action
    noteAgExpandStateChange() {
        const agModelState = this.agGridModel.getExpandState();

        if (!equal(this.expandState, agModelState)) {
            this.expandState = deepFreeze(agModelState);
        }
    }

    noteAgSelectionStateChanged() {
        const {selModel, agGridModel, isReady} = this;

        // Check required as we may be receiving stale message after unmounting
        if (isReady) {
            selModel.select(agGridModel.agApi.getSelectedRows().map(r => r.id));
        }
    }

    noteColumnManuallySized(colId, width) {
        const col = this.findColumn(this.columns, colId);
        if (!width || !col || col.flex) return;
        const colStateChanges = [{colId, width, manuallySized: true}];
        this.updateColumnState(colStateChanges);
    }

    /**
     * This method will update the current column definition if it has changed.
     * Throws an exception if any of the columns provided in colStateChanges are not
     * present in the current column list.
     *
     * Note: Column ordering is determined by the individual (leaf-level) columns in state.
     * This means that if a column has been redefined to a new column group, that entire group may
     * be moved to a new index.
     *
     * @param colStateChanges - changes to apply to the columns. If all leaf
     *     columns are represented in these changes then the sort order will be applied as well.
     */
    @action
    updateColumnState(colStateChanges: Partial<ColumnState>[]): void {
        if (isEmpty(colStateChanges)) return;

        let columnState = cloneDeep(this.columnState);

        throwIf(
            colStateChanges.some(({colId}) => !find(columnState, {colId})),
            'Invalid columns detected in column changes!'
        );

        // 1) Update any width, visibility or pinned changes
        colStateChanges.forEach(change => {
            const col: ColumnState = find(columnState, {colId: change.colId});

            if (!isNil(change.width)) col.width = change.width;
            if (!isNil(change.hidden)) col.hidden = change.hidden;
            if (!isUndefined(change.pinned)) col.pinned = change.pinned;
            if (!isNil(change.manuallySized)) col.manuallySized = change.manuallySized;
        });

        // 2) If the changes provided is a full list of leaf columns, synchronize the sort order
        if (colStateChanges.length === this.getLeafColumns().length) {
            columnState = colStateChanges.map(c => find(columnState, {colId: c.colId}));
        }

        if (!equal(this.columnState, columnState)) {
            this.columnState = columnState;
        }
    }

    /** @deprecated - use {@link updateColumnState} instead. */
    applyColumnStateChanges(colStateChanges: Partial<ColumnState>[]): void {
        apiDeprecated('GridModel.applyColumnStateChanges()', {
            msg: 'Use updateColumnState() instead.',
            v: '82',
            source: GridModel
        });
        this.updateColumnState(colStateChanges);
    }

    getColumn(colId: string): Column {
        return this.findColumn(this.columns, colId);
    }

    getColumnGroup(groupId: string): ColumnGroup {
        return this.findColumnGroup(this.columns, groupId);
    }

    /** Return all leaf-level columns - i.e. excluding column groups. */
    getLeafColumns(): Column[] {
        return this.gatherLeaves(this.columns);
    }

    /** Return all leaf-level column ids - i.e. excluding column groups. */
    getLeafColumnIds(): string[] {
        return this.getLeafColumns().map(col => col.colId);
    }

    /** Return all currently-visible leaf-level columns. */
    getVisibleLeafColumns(): Column[] {
        return this.getLeafColumns().filter(it => this.isColumnVisible(it.colId));
    }

    /**
     * Determine whether or not a given leaf-level column is currently visible.
     *
     * Call this method instead of inspecting the `hidden` property on the Column itself, as that
     * property is not updated with state changes.
     */
    isColumnVisible(colId: string): boolean {
        const state = this.getStateForColumn(colId);
        return state ? !state.hidden : false;
    }

    setColumnVisible(colId: string, visible: boolean) {
        this.updateColumnState([{colId, hidden: !visible}]);
    }

    showColumn(colId: string) {
        this.setColumnVisible(colId, true);
    }

    hideColumn(colId: string) {
        this.setColumnVisible(colId, false);
    }

    setColumnGroupVisible(groupId: string, visible: boolean) {
        this.updateColumnState(
            this.getColumnGroup(groupId)
                .getLeafColumns()
                .map(({colId}) => ({colId, hidden: !visible}))
        );
    }

    showColumnGroup(groupId: string) {
        this.setColumnGroupVisible(groupId, true);
    }

    hideColumnGroup(groupId: string) {
        this.setColumnGroupVisible(groupId, false);
    }

    /**
     * Determine if a leaf-level column is currently pinned.
     *
     * Call this method instead of inspecting the `pinned` property on the Column itself, as that
     * property is not updated with state changes.
     */
    getColumnPinned(colId: string): HSide {
        const state = this.getStateForColumn(colId);
        return state ? state.pinned : null;
    }

    /** Return matching leaf-level Column object from the provided collection. */
    findColumn(cols: ColumnOrGroup[], colId: string): Column {
        for (let col of cols) {
            if (col instanceof ColumnGroup) {
                const ret = this.findColumn(col.children, colId);
                if (ret) return ret;
            } else {
                if (col.colId === colId) return col;
            }
        }
        return null;
    }

    /** Return matching ColumnGroup from the provided collection. */
    findColumnGroup(cols: ColumnOrGroup[], groupId: string): ColumnGroup {
        for (let col of cols) {
            if (col instanceof ColumnGroup) {
                if (col.groupId === groupId) return col;
                const ret = this.findColumnGroup(col.children, groupId);
                if (ret) return ret;
            }
        }
        return null;
    }

    /**
     * Return the current state object representation for the given colId.
     *
     * Note that column state updates do not write changes back to the original Column object (as
     * held in this model's `columns` collection), so this method should be called whenever the
     * current value of any state-tracked property is required.
     */
    getStateForColumn(colId: string): ColumnState {
        return find(this.columnState, {colId});
    }

    /**
     * Autosize columns to fit their contents.
     *
     * This method will ignore columns with a flex value or with `autosizable: false`. Hidden
     * columns are also ignored unless {@link GridAutosizeOptions.includeHiddenColumns} has been
     * set to true.
     *
     * @param overrideOpts - optional overrides of this model's {@link GridAutosizeOptions}.
     */
    @logWithDebug
    async autosizeAsync(overrideOpts: Omit<GridAutosizeOptions, 'mode'> = {}) {
        const {columns, ...options}: GridAutosizeOptions = {
            ...this.autosizeOptions,
            ...overrideOpts
        };

        if (options.mode === 'disabled') {
            return;
        }

        // 1) Pre-process columns to be operated on
        if (columns) options.fillMode = 'none'; // Fill makes sense only for the entire set.

        let colIds: string[],
            includeColFn = (_: Column) => true;
        if (isFunction(columns)) {
            includeColFn = columns as (col: Column) => boolean;
            colIds = this.columnState.map(it => it.colId);
        } else {
            colIds = columns ? castArray(columns) : this.columnState.map(it => it.colId);
        }

        colIds = colIds.filter(id => {
            if (!options.includeHiddenColumns && !this.isColumnVisible(id)) return false;
            const col = this.getColumn(id);
            return col && col.autosizable && !col.flex && includeColFn(col);
        });

        if (isEmpty(colIds)) return;

        await this.autosizeColsInternalAsync(colIds, options).linkTo(this.autosizeTask);
    }

    /**
     * Begin an inline editing session.
     * @param opts.record - StoreRecord/ID to edit. If unspecified, the first selected StoreRecord
     *      will be used, if any, or the first overall StoreRecord in the grid.
     * @param opts.colId - ID of column on which to start editing. If unspecified, the first
     *      editable column will be used.
     */
    async beginEditAsync(opts: {record?: StoreRecordOrId; colId?: string} = {}) {
        const {record, colId} = opts;
        await this.whenReadyAsync();
        if (!this.isReady) return;

        const {store, agGridModel, agApi, selectedRecords} = this;

        let recToEdit;
        if (record) {
            // Normalize specified record, if any.
            recToEdit = record instanceof StoreRecord ? record : store.getById(record);
        } else {
            if (!isEmpty(selectedRecords)) {
                // Or use first selected record, if any.
                recToEdit = selectedRecords[0];
            } else {
                // Or use the first record overall.
                const firstRowId = agGridModel.getFirstSelectableRowNode()?.data.id;
                recToEdit = store.getById(firstRowId);
            }
        }

        const rowIndex = agApi.getRowNode(recToEdit?.agId)?.rowIndex;
        if (isNil(rowIndex) || rowIndex < 0) {
            this.logWarn(
                'Unable to start editing',
                record ? 'specified record not found' : 'no records found'
            );
            return;
        }

        let colToEdit;
        if (colId) {
            // Ensure specified column is editable for recToEdit.
            const col = this.getColumn(colId);
            colToEdit = col?.isEditableForRecord(recToEdit) ? col : null;
        } else {
            // Or find the first editable col in the grid.
            colToEdit = this.getVisibleLeafColumns().find(column => {
                return column.isEditableForRecord(recToEdit);
            });
        }

        if (!colToEdit) {
            this.logWarn(
                'Unable to start editing',
                colId
                    ? `column with colId ${colId} not found, or not editable`
                    : 'no editable columns found'
            );
            return;
        }

        agApi.startEditingCell({
            rowIndex,
            colKey: colToEdit.colId
        });
    }

    /**
     * Stop an inline editing session, if one is in-progress.
     * @param dropPendingChanges - true to cancel current edit without saving pending
     *      changes in the active editor(s) to the backing StoreRecord.
     */
    async endEditAsync(dropPendingChanges: boolean = false) {
        await this.whenReadyAsync();
        if (!this.isReady) return;

        this.agApi.stopEditing(dropPendingChanges);
    }

    /** @internal */
    @action
    onCellEditingStarted = (e: CellEditingStartedEvent) => {
        this.editingCell = {colId: e.column.getColId(), rowIndex: e.rowIndex};
    };

    /** @internal*/
    @action
    onCellEditingStopped = (e: CellEditingStoppedEvent) => {
        const origCell = this.editingCell;
        this.editingCell = null;
        const {agApi} = this,
            focusedCell = agApi.getFocusedCell();

        // If the rowIndex has moved since we started edit, sorting might have caused the wrong row
        // to be focused.  In this (rare) case, just conservatively keep focus on what was edited
        if (
            origCell &&
            focusedCell &&
            !isUndefined(e.rowIndex) &&
            origCell.rowIndex != e.rowIndex &&
            focusedCell.rowIndex != e.rowIndex
        ) {
            agApi.setFocusedCell(e.rowIndex, origCell.colId);
        }
    };

    /**
     * Returns true as soon as the underlying agGridModel is ready, waiting a limited period
     * of time if needed to allow the component to initialize. Returns false if grid not ready
     * by end of timeout to ensure caller does not wait forever (if e.g. grid is not mounted).
     * TODO - see https://github.com/xh/hoist-react/issues/2551 and note that calls to this method
     *   within this class re-check `isReady` directly. We have observed this method returning
     *   to its caller as true when the ag-grid/API has in fact dismounted and is no longer ready.
     *
     * This method will introduce a minimal delay for all calls.  This is useful to ensure
     * that the grid has had the opportunity to process any pending data updates, which are also
     * subject to a minimal async debounce.
     *
     * @param timeout - timeout in ms
     */
    async whenReadyAsync(timeout: number = 3 * SECONDS): Promise<boolean> {
        try {
            await when(() => this.isReady, {timeout});
        } catch (ignored) {
            this.logDebug(`Grid failed to enter ready state after waiting ${timeout}ms`);
        }
        await wait();

        return this.isReady;
    }

    /**
     * Sorts ungrouped items to the bottom.
     */
    defaultGroupSortFn = (a: string, b: string): number => {
        a = a ?? '';
        b = b ?? '';
        if (a === b) return 0;
        if (a === '') return 1;
        if (b === '') return -1;
        return a.localeCompare(b);
    };

    /** @internal */
    get deltaSort() {
        return !!this.experimental.deltaSort;
    }

    /** @internal */
    get disableScrollOptimization() {
        return !!this.experimental.disableScrollOptimization;
    }

    //-----------------------
    // Implementation
    //-----------------------
    private buildColumn(config: ColumnOrGroupSpec, borderedGroup?: ColumnGroupSpec): ColumnOrGroup {
        // Merge leaf config with defaults.
        // Ensure *any* tooltip setting on column itself always wins.
        if (this.colDefaults && !this.isGroupSpec(config)) {
            let colDefaults = {...this.colDefaults};
            if (config.tooltip) colDefaults.tooltip = null;
            config = defaultsDeep({}, config, colDefaults);
        }

        const omit = executeIfFunction(config.omit);
        if (omit) return null;

        if (this.isGroupSpec(config)) {
            if (config.borders !== false) borderedGroup = config;
            const children = compact(config.children.map(c => this.buildColumn(c, borderedGroup)));
            return !isEmpty(children) ? new ColumnGroup(config, this, children) : null;
        }

        if (borderedGroup) {
            config = this.enhanceConfigWithGroupBorders(config, borderedGroup);
        }

        return new Column(config, this);
    }

    @sharePendingPromise
    private async autosizeColsInternalAsync(
        colIds: string[],
        options: Omit<GridAutosizeOptions, 'columns'>
    ) {
        await this.whenReadyAsync();
        if (!this.isReady) return;

        const {agApi} = this,
            {showMask} = options;

        if (showMask) {
            agApi.updateGridOptions({loading: true});
        }

        try {
            await XH.gridAutosizeService.autosizeAsync(this, colIds, options);
        } finally {
            if (showMask) {
                await wait();
                agApi.updateGridOptions({loading: false});
            }
        }
    }

    private gatherLeaves(columns: ColumnOrGroup[], leaves: Column[] = []): Column[] {
        columns.forEach(col => {
            if (col instanceof ColumnGroup) {
                this.gatherLeaves(col.children, leaves);
            } else {
                leaves.push(col);
            }
        });

        return leaves;
    }

    private collectIds(cols: ColumnOrGroup[], ids: string[] = []) {
        cols.forEach(col => {
            if (col instanceof Column) {
                ids.push(col.colId);
            } else {
                ids.push(col.groupId);
                this.collectIds(col.children, ids);
            }
        });
        return ids;
    }

    private formatValuesForExport(params) {
        const value = params.value,
            fmt = params.column.colDef.valueFormatter;
        if (value !== null && fmt) {
            return fmt(value);
        } else {
            return value;
        }
    }

    // Store fields and column configs have a tricky bi-directional relationship in GridModel,
    // both for historical reasons and developer convenience.
    //
    // Strategically, we wish to centralize more field-wise configuration at the `data/Field` level,
    // so it can be better re-used across Hoist APIs such as `Filter` and `FormModel`. However for
    // convenience, a `GridModel.store` config can also be very minimal (or non-existent), and
    // in this case GridModel should work out the required Store fields from column definitions.
    private parseAndSetColumnsAndStore(
        colConfigs: ColumnOrGroupSpec[],
        storeOrConfig: Store | StoreConfig = {}
    ) {
        // Enhance colConfigs with field-level metadata provided by store, if any.
        colConfigs = this.enhanceColConfigsFromStore(colConfigs, storeOrConfig);

        // Create and set columns with (possibly) enhanced configs.
        this.setColumns(colConfigs);

        // Set or create Store as needed.
        let store: Store;
        if (storeOrConfig instanceof Store) {
            store = storeOrConfig;
        } else {
            storeOrConfig = this.enhanceStoreConfigFromColumns(storeOrConfig);
            store = new Store({loadTreeData: this.treeMode, ...storeOrConfig});
            store.xhImpl = this.xhImpl;
            this.markManaged(store);
        }

        this.store = store;
    }

    private validateColumns(cols: ColumnOrGroup[]) {
        if (isEmpty(cols)) return;

        const ids = this.collectIds(cols);
        const nonUnique = ids.filter((item, index) => ids.indexOf(item) !== index);

        if (!isEmpty(nonUnique)) {
            const msg =
                `Non-unique ids: [${nonUnique}] ` +
                "Use 'ColumnSpec'/'ColumnGroupSpec' configs to resolve a unique ID for each column/group.";
            throw XH.exception(msg);
        }

        const treeCols = this.gatherLeaves(cols).filter(it => it.isTreeColumn);
        warnIf(
            this.treeMode && treeCols.length != 1,
            'Grids in treeMode should include exactly one column with isTreeColumn:true.'
        );
    }

    private cleanColumnState(columnState) {
        const gridCols = this.getLeafColumns();

        // REMOVE any state columns that are no longer found in the grid. These were likely saved
        // under a prior release of the app and have since been removed from the code.
        let ret = columnState.filter(({colId}) => this.findColumn(gridCols, colId));

        // ADD any grid columns that are not found in state. These are newly added to the code.
        // Insert these columns in position based on the index at which they are defined.
        gridCols.forEach((col, idx) => {
            if (!find(ret, {colId: col.colId})) {
                ret.splice(idx, 0, this.getDefaultStateForColumn(col));
            }
        });

        ret = ret.map(state => {
            const col = this.findColumn(gridCols, state.colId);

            // Remove the width from any non-resizable column - we don't want to track those widths as
            // they are set programmatically (e.g. fixed / action columns), and saved state should not
            // conflict with any code-level updates to their widths.
            if (!col.resizable || !state.manuallySized) state = omit(state, 'width');
            state = {...state, manuallySized: state.manuallySized ?? false};

            // Remove all metadata other than the id and the hidden state from hidden columns, to save
            // on space when storing user configs with large amounts of hidden fields.
            if (state.hidden) state = pick(state, 'colId', 'hidden');

            return state;
        });

        return ret;
    }

    // Selectively enhance raw column configs with field-level metadata from store.fields and/or
    // field config partials provided by the column configs themselves.
    private enhanceColConfigsFromStore(
        colConfigs: ColumnOrGroupSpec[],
        storeOrConfig?: Store | StoreConfig
    ): ColumnOrGroupSpec[] {
        const store = storeOrConfig || this.store,
            storeFields = store?.fields,
            fieldsByName: Record<string, Field | FieldSpec> = {};

        // Extract field definitions in all supported forms: pull Field instances/configs from
        // storeFields first...
        storeFields?.forEach(sf => {
            if (sf && !isString(sf)) {
                fieldsByName[sf.name] = sf;
            }
        });

        // Then fill in with any col-level `field` config objects.
        colConfigs.forEach(cc => {
            if (
                isColumnSpec(cc) &&
                cc.field &&
                !isString(cc.field) &&
                !fieldsByName[cc.field.name]
            ) {
                fieldsByName[cc.field.name] = cc.field;
            }
        });

        if (isEmpty(fieldsByName)) return colConfigs;

        const numTypes = ['int', 'number'],
            dateTypes = ['date', 'localDate'];

        return colConfigs.map(col => {
            // Recurse into children for column groups
            if (!isColumnSpec(col)) {
                return {
                    ...col,
                    children: this.enhanceColConfigsFromStore(col.children, storeOrConfig)
                };
            }

            const colFieldName = getFieldName(col.field),
                field = fieldsByName[colFieldName];

            if (!field) return col;

            const {displayName, description, type} = field,
                isNum = numTypes.includes(type),
                isDate = dateTypes.includes(type),
                align = isNum ? 'right' : undefined,
                sortingOrder = col.absSort
                    ? Column.ABS_DESC_FIRST
                    : isNum || isDate
                      ? Column.DESC_FIRST
                      : Column.ASC_FIRST;

            // TODO: Set the editor based on field type
            return {
                displayName,
                description,
                sortingOrder,
                align,
                ...col
            };
        });
    }

    // Ensure store config has a complete set of fields for all configured columns. Note this
    // requires columns to have been constructed and set, and will only work with a raw store
    // config object, not an instance.
    private enhanceStoreConfigFromColumns(storeConfig: StoreConfig) {
        const fields = storeConfig.fields ?? [],
            storeFieldNames = fields.map(it => getFieldName(it)),
            leafColsByFieldName = this.leafColsByFieldName();

        const newFields: FieldSpec[] = [];
        forEach(leafColsByFieldName, (col, name) => {
            if (name !== 'id' && !storeFieldNames.includes(name)) {
                newFields.push({displayName: col.displayName, ...col.fieldSpec, name});
            }
        });

        return isEmpty(newFields)
            ? storeConfig
            : {...storeConfig, fields: [...fields, ...newFields]};
    }

    private leafColsByFieldName(): Record<string, Column> {
        const ret = {};
        this.getLeafColumns().forEach(col => {
            let {fieldPath} = col;
            if (isNil(fieldPath)) return;

            // Field name for dot-separated column fields should just be the root of the field path
            const fieldName = isArray(fieldPath) ? fieldPath[0] : fieldPath;

            // Take *first* column with this field name, for the purposes of defining field.
            if (!ret[fieldName]) {
                ret[fieldName] = col;
            }
        });
        return ret;
    }

    private parseSizingMode(v: SizingMode): SizingMode {
        const useGlobalSizingMode = !v,
            sizingMode = useGlobalSizingMode ? XH.sizingMode : v;

        // Bind this model's sizing mode with the global sizing mode
        if (useGlobalSizingMode) {
            this.addReaction({
                track: () => XH.sizingMode,
                run: mode => this.setSizingMode(mode)
            });
        }

        return sizingMode;
    }

    private parseSelModel(selModel: GridConfig['selModel']): StoreSelectionModel {
        // Return actual instance directly.
        if (selModel instanceof StoreSelectionModel) {
            return selModel;
        }

        // Default unspecified based on platform, treat explicit null as disabled.
        if (selModel === undefined) {
            selModel = XH.isMobileApp ? 'disabled' : 'single';
        } else if (selModel === null) {
            selModel = 'disabled';
        }

        // Strings specify the mode.
        if (isString(selModel)) {
            selModel = {mode: selModel};
        }

        return this.markManaged(
            new StoreSelectionModel({...selModel, store: this.store, xhImpl: true})
        );
    }

    private parseFilterModel(filterModel: GridConfig['filterModel']) {
        if (XH.isMobileApp || !filterModel) return null;

        filterModel = filterModel === true ? {} : filterModel;
        return new GridFilterModel({bind: this.store, ...filterModel}, this);
    }

    private parseExperimental(experimental: GridExperimentalFlags) {
        return {
            ...XH.getConf('xhGridExperimental', {}),
            ...experimental
        };
    }

    private parseChooserModel(chooserModel: GridConfig['colChooserModel']): HoistModel {
        if (!chooserModel) return null;

        const modelClass = XH.isMobileApp ? MobileColChooserModel : DesktopColChooserModel;
        chooserModel = chooserModel === true ? {} : chooserModel;
        return this.markManaged(new modelClass({...chooserModel, gridModel: this}));
    }

    private isGroupSpec(col: ColumnOrGroupSpec): col is ColumnGroupSpec {
        return 'children' in col;
    }

    private readonly LEFT_BORDER_CLASS = 'xh-cell--group-border-left';
    private readonly RIGHT_BORDER_CLASS = 'xh-cell--group-border-right';

    private enhanceConfigWithGroupBorders(config: ColumnSpec, group: ColumnGroupSpec): ColumnSpec {
        return {
            ...config,
            cellClassRules: {
                ...config.cellClassRules,
                [this.LEFT_BORDER_CLASS]: this.createGroupBorderFn('left', group),
                [this.RIGHT_BORDER_CLASS]: this.createGroupBorderFn('right', group)
            }
        };
    }

    private createGroupBorderFn(
        side: 'left' | 'right',
        group: ColumnGroupSpec
    ): ColumnCellClassRuleFn {
        return ({api, column, ...ctx}) => {
            if (!api || !column) return false;

            // Re-evaluate cell class rules when column is re-ordered
            // See https://www.ag-grid.com/javascript-data-grid/column-object/#reference-events
            if (!column['xhAppliedGroupBorderListener']) {
                column['xhAppliedGroupBorderListener'] = true;
                column.addEventListener('leftChanged', ({api, columns, source}: ColumnEvent) => {
                    if (source === 'uiColumnMoved') api.refreshCells({columns});
                });
            }

            // Don't render a left-border if col is first or if prev col already has right-border
            if (side === 'left') {
                const prevCol = api.getDisplayedColBefore(column);

                if (!prevCol) return false;

                const prevColDef = prevCol.getColDef(),
                    prevRule = prevColDef.cellClassRules[this.RIGHT_BORDER_CLASS];
                if (
                    isFunction(prevRule) &&
                    prevRule({
                        ...ctx,
                        api,
                        colDef: prevColDef,
                        column: prevCol
                    })
                ) {
                    return false;
                }
            }

            // Walk up parent groups to find "bordered" group. Return true if on relevant edge.
            const getter = side === 'left' ? first : last;
            for (let parent = column?.getParent(); parent; parent = parent.getParent()) {
                if (
                    group.groupId === parent.getGroupId() &&
                    getter(parent.getDisplayedLeafColumns()) === column
                ) {
                    return true;
                }
            }
        };
    }

    private getDefaultStateForColumn(column: Column): ColumnState {
        return {
            ...pick(column, ['colId', 'width', 'hidden', 'pinned']),
            // If not in managed auto-size mode, treat in-code column widths as manuallySized so
            // widths are not omitted from persistableColumnState. This is important because
            // PersistanceProvider.getPersistableState() expects a complete snapshot of initial
            // state in order to detect changes and restore initial state correctly.
            // See https://github.com/xh/hoist-react/issues/4102.
            manuallySized: !!(column.width && this.autosizeOptions.mode !== 'managed')
        };
    }
}
