/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {
    CellClickedEvent,
    CellContextMenuEvent,
    CellDoubleClickedEvent,
    ColumnEvent,
    RowClickedEvent,
    RowDoubleClickedEvent
} from '@ag-grid-community/core';
import {AgGridModel} from '@xh/hoist/cmp/ag-grid';
import {
    Column,
    ColumnCellClassRuleFn,
    ColumnGroup,
    ColumnGroupSpec,
    ColumnSpec,
    GridAutosizeMode,
    GridFilterModelConfig,
    GridGroupSortFn,
    TreeStyle
} from '@xh/hoist/cmp/grid';
import {GridFilterModel} from '@xh/hoist/cmp/grid/filter/GridFilterModel';
import {fragment, p} from '@xh/hoist/cmp/layout';
import {
    Awaitable,
    HoistModel,
    HSide,
    managed,
    PlainObject,
    SizingMode,
    Some,
    TaskObserver,
    VSide,
    XH
} from '@xh/hoist/core';
import {
    FieldSpec,
    Store,
    StoreConfig,
    StoreRecord,
    StoreRecordId,
    StoreRecordOrId,
    StoreSelectionConfig,
    StoreSelectionModel,
    StoreTransaction
} from '@xh/hoist/data';
import {PrintSupportGridConfig, PrintSupportModel} from '@xh/hoist/cmp/printsupport';
import {ColChooserModel as DesktopColChooserModel} from '@xh/hoist/dynamics/desktop';
import {ColChooserModel as MobileColChooserModel} from '@xh/hoist/dynamics/mobile';
import {action, bindable, makeObservable, observable, when} from '@xh/hoist/mobx';
import {wait, waitFor} from '@xh/hoist/promise';
import {ExportOptions} from '@xh/hoist/svc/GridExportService';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {
    deepFreeze,
    executeIfFunction,
    logWithDebug,
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
    isEmpty,
    isFunction,
    isNil,
    isPlainObject,
    isString,
    isUndefined,
    keysIn,
    last,
    max,
    min,
    omit,
    pick,
    pull
} from 'lodash';
import {ReactNode} from 'react';
import {GridAutosizeOptions} from './GridAutosizeOptions';
import {GridContextMenuSpec} from './GridContextMenu';
import {GridSorter, GridSorterLike} from './GridSorter';
import {GridPersistenceModel} from './impl/GridPersistenceModel';
import {managedRenderer} from './impl/Utils';
import {
    AutosizeState,
    ColChooserConfig,
    ColumnState,
    GridModelPersistOptions,
    GroupRowRenderer,
    RowClassFn,
    RowClassRuleFn
} from './Types';

export interface GridConfig {
    /** Columns for this grid. */
    columns?: Array<ColumnSpec | ColumnGroupSpec>;

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
    colChooserModel?: ColChooserConfig | boolean;

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
     * Callback when a cell is clicked.
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
     * Set to true to enable printing support for this grid, or provide a
     * config to further configure. Default false.
     */
    printSupport?: boolean | PrintSupportGridConfig;

    /**
     * Number of clicks required to expand / collapse a parent row in a tree grid. Defaults
     * to 2 for desktop, 1 for mobile. Any other value prevents clicks on row body from
     * expanding / collapsing (requires click on tree col affordance to expand/collapse).
     */
    clicksToExpand?: number;

    /**
     * Array of RecordActions, dividers, or token strings with which to create a context menu.
     * May also be specified as a function returning same.
     */
    contextMenu?: GridContextMenuSpec;

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
     * Flags for experimental features. These features are designed for early client-access and
     * testing, but are not yet part of the Hoist API.
     */
    experimental?: PlainObject;

    /** Extra app-specific data for the GridModel. */
    appData?: PlainObject;

    /** @internal */
    xhImpl?: boolean;
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
    experimental: PlainObject;
    onKeyDown: (e: KeyboardEvent) => void;
    onRowClicked: (e: RowClickedEvent) => void;
    onRowDoubleClicked: (e: RowDoubleClickedEvent) => void;
    onCellClicked: (e: CellClickedEvent) => void;
    onCellDoubleClicked: (e: CellDoubleClickedEvent) => void;
    onCellContextMenu: (e: CellContextMenuEvent) => void;
    appData: PlainObject;

    @managed filterModel: GridFilterModel;
    @managed agGridModel: AgGridModel;
    @managed printSupportModel: PrintSupportModel;

    //------------------------
    // Observable API
    //------------------------
    @observable.ref columns: Array<ColumnGroup | Column> = [];
    @observable.ref columnState: ColumnState[] = [];
    @observable.ref expandState: any = {};
    @observable.ref autosizeState: AutosizeState = {};
    @observable.ref sortBy: GridSorter[] = [];
    @observable.ref groupBy: string[] = null;

    @bindable showSummary: boolean | VSide = false;
    @bindable.ref emptyText: ReactNode;
    @bindable treeStyle: TreeStyle;

    /**
     * Flag to track inline editing at a granular level. Will toggle each time row
     * or cell editing is activated or ended.
     */
    @observable isEditing = false;

    /**
     * Flag to track inline editing at a general level.
     * Will not change during transient navigation from cell to cell or row to row,
     * but rather is debounced such that grid editing will need to "settle" for a
     * short time before toggling.
     */
    @observable isInEditingMode: boolean = false;

    /** Is the grid rendering in its print view state? Observable property. */
    get isPrinting(): boolean {
        return !!this.printSupportModel?.isPrinting;
    }

    get hasPrintSupport(): boolean {
        return !!this.printSupportModel;
    }

    static defaultContextMenu = [
        'filter',
        '-',
        'print',
        '-',
        'copy',
        'copyWithHeaders',
        'copyCell',
        '-',
        'expandCollapseAll',
        '-',
        'exportExcel',
        'exportCsv',
        '-',
        'restoreDefaults',
        '-',
        'colChooser',
        'autosizeColumns'
    ];

    private _defaultState; // initial state provided to ctor - powers restoreDefaults().
    @managed persistenceModel: GridPersistenceModel;

    /**
     * Is autosizing enabled on this grid?
     * To disable autosizing, set autosizeOptions.mode to GridAutosizeMode.DISABLED.
     */
    get autosizeEnabled(): boolean {
        return this.autosizeOptions.mode !== 'disabled';
    }

    /** Tracks execution of filtering operations.*/
    @managed filterTask = TaskObserver.trackAll();

    /** Tracks execution of autosize operations. */
    @managed autosizeTask = TaskObserver.trackAll();

    /** @internal - used internally by any GridFindField that is bound to this GridModel. */
    @bindable xhFindQuery: string = null;

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
            printSupport = false,
            clicksToExpand = XH.isMobileApp ? 1 : 2,
            contextMenu,
            useVirtualColumns = false,
            autosizeOptions = {},
            restoreDefaultsFn,
            restoreDefaultsWarning = GridModel.DEFAULT_RESTORE_DEFAULTS_WARNING,
            fullRowEditing = false,
            clicksToEdit = 2,
            highlightRowOnClick = XH.isMobileApp,
            experimental,
            appData,
            xhImpl,
            ...rest
        }: GridConfig = config;

        this.xhImpl = xhImpl;

        this._defaultState = {columns, sortBy, groupBy};

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
        this.contextMenu = withDefault(contextMenu, GridModel.defaultContextMenu);
        this.useVirtualColumns = useVirtualColumns;
        this.externalSort = externalSort;
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
        this.persistenceModel = persistWith ? new GridPersistenceModel(this, persistWith) : null;
        this.experimental = this.parseExperimental(experimental);
        this.onKeyDown = onKeyDown;
        this.onRowClicked = onRowClicked;
        this.onRowDoubleClicked = onRowDoubleClicked;
        this.onCellClicked = onCellClicked;
        this.onCellDoubleClicked = onCellDoubleClicked;
        this.onCellContextMenu = onCellContextMenu;

        if (!XH.isMobileApp && printSupport) {
            this.printSupportModel =
                printSupport === true
                    ? new PrintSupportModel(this)
                    : new PrintSupportModel(this, printSupport);
        }

        warnIf(XH.isMobileApp && printSupport, 'Print support is not available on mobile devices.');

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
                    intent: 'primary'
                }
            });
            if (!confirmed) return false;
        }

        const {columns, sortBy, groupBy} = this._defaultState;
        this.setColumns(columns);
        this.setSortBy(sortBy);
        this.setGroupBy(groupBy);

        this.filterModel?.clear();
        this.persistenceModel?.clear();

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

    print() {
        if (!this.hasPrintSupport || this.isPrinting) return;

        this.printSupportModel.toggleIsPrinting();
    }

    /**
     * Select records in the grid.
     *
     * @param records - one or more record(s) / ID(s) to select.
     * @param options - additional options containing the following keys:
     *      ensureVisible - true to make selection visible if it is within a
     *          collapsed node or outside of the visible scroll window. Default true.
     *      clearSelection - true to clear previous selection (rather than
     *          add to it). Default true.
     */
    async selectAsync(
        records: Some<StoreRecordOrId>,
        opts?: {ensureVisible?: boolean; clearSelection?: boolean}
    ) {
        const {ensureVisible = true, clearSelection = true} = opts ?? {};
        this.selModel.select(records, clearSelection);
        if (ensureVisible) await this.ensureSelectionVisibleAsync();
    }

    /**
     * Select the first row in the grid.
     *
     * See {@link preSelectFirstAsync} for a useful variant of this method.  preSelectFirstAsync()
     * will not change the selection if there is already a selection, which is what applications
     * typically want to do when loading/reloading a grid.
     *
     * @param opts - set key 'ensureVisible' to true to make selection visible if it is within a
     *      collapsed node or outside of the visible scroll window. Default true.
     */
    async selectFirstAsync(opts?: {ensureVisible?: boolean}) {
        const {ensureVisible = true} = opts ?? {};
        await this.whenReadyAsync();
        if (!this.isReady) return;

        // Get first displayed row with data - i.e. backed by a record, not a full-width group row.
        const {selModel} = this,
            id = this.agGridModel.getFirstSelectableRowNode()?.data.id;

        if (id != null) {
            selModel.select(id);
            if (ensureVisible) await this.ensureSelectionVisibleAsync();
        }
    }

    /**
     * Select the first row in the grid, if no other selection present.
     *
     * This method delegates to {@link selectFirstAsync}.
     */
    async preSelectFirstAsync() {
        if (!this.hasSelection) return this.selectFirstAsync();
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
     * of the selection should use the {@link selectedRecord} getter instead.
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
        const {agApi} = this;
        if (agApi) {
            agApi.expandAll();
            this.noteAgExpandStateChange();
        }
    }

    /** Collapse all parent rows in grouped or tree grid. */
    collapseAll() {
        const {agApi} = this;
        if (agApi) {
            agApi.collapseAll();
            this.noteAgExpandStateChange();
        }
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

    override async doLoadAsync(loadSpec) {
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

    /** @param colConfigs - {@link Column} or {@link ColumnGroup} configs. */
    @action
    setColumns(colConfigs: Array<ColumnSpec | ColumnGroupSpec>) {
        this.validateColConfigs(colConfigs);
        colConfigs = this.enhanceColConfigsFromStore(colConfigs);

        const columns = compact(colConfigs.map(c => this.buildColumn(c)));
        this.validateColumns(columns);

        this.columns = columns;
        this.columnState = this.getLeafColumns().map(it => {
            const {colId, width, hidden, pinned} = it;
            return {colId, width, hidden, pinned};
        });
    }

    setColumnState(colState: Partial<ColumnState>[]) {
        this.applyColumnStateChanges(this.cleanColumnState(colState));
    }

    showColChooser() {
        (this.colChooserModel as any)?.open();
    }

    noteAgColumnStateChanged(agColState) {
        const colStateChanges = agColState.map(({colId, width, hide, pinned}) => {
            const col = this.findColumn(this.columns, colId);
            if (!col) return null;
            return {
                colId,
                pinned: pinned ?? null,
                hidden: !!hide,
                width: col.flex ? undefined : width
            };
        });

        pull(colStateChanges, null);
        this.applyColumnStateChanges(colStateChanges);
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

    @action
    setAutosizeState(autosizeState) {
        if (!equal(this.autosizeState, autosizeState)) {
            this.autosizeState = deepFreeze(autosizeState);
        }
    }

    noteColumnManuallySized(colId, width) {
        const col = this.findColumn(this.columns, colId);
        if (!width || !col || col.flex) return;
        const colStateChanges = [{colId, width, manuallySized: true}];
        this.applyColumnStateChanges(colStateChanges);
    }

    noteColumnsAutosized(colIds) {
        const colStateChanges = castArray(colIds).map(colId => ({colId, manuallySized: false}));
        this.applyColumnStateChanges(colStateChanges);
        this.setAutosizeState({sizingMode: this.sizingMode});
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
    applyColumnStateChanges(colStateChanges: Partial<ColumnState>[]) {
        if (isEmpty(colStateChanges)) return;

        let columnState = cloneDeep(this.columnState);

        throwIf(
            colStateChanges.some(({colId}) => !find(columnState, {colId})),
            'Invalid columns detected in column changes!'
        );

        // 1) Update any width, visibility or pinned changes
        colStateChanges.forEach(change => {
            const col = find(columnState, {colId: change.colId});

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
        this.applyColumnStateChanges([{colId, hidden: !visible}]);
    }

    showColumn(colId: string) {
        this.setColumnVisible(colId, true);
    }

    hideColumn(colId: string) {
        this.setColumnVisible(colId, false);
    }

    setColumnGroupVisible(groupId: string, visible: boolean) {
        this.applyColumnStateChanges(
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
    findColumn(cols: Array<Column | ColumnGroup>, colId: string): Column {
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
    findColumnGroup(cols: Array<Column | ColumnGroup>, groupId: string): ColumnGroup {
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
     * @param options - optional overrides of this model's configured {@link autosizeOptions}.
     */
    @logWithDebug
    async autosizeAsync(options: GridAutosizeOptions = {}) {
        options = {...this.autosizeOptions, ...options};

        if (options.mode === 'disabled') {
            return;
        }

        // 1) Pre-process columns to be operated on
        const {columns} = options;
        if (columns) options.fillMode = 'none'; // Fill makes sense only for the entire set.

        let colIds,
            includeColFn = col => true;
        if (isFunction(columns)) {
            includeColFn = columns as (col) => boolean;
            colIds = this.columnState.map(it => it.colId);
        } else {
            colIds = columns ?? this.columnState.map(it => it.colId);
        }

        colIds = castArray(colIds).filter(id => {
            if (!options.includeHiddenColumns && !this.isColumnVisible(id)) return false;
            const col = this.getColumn(id);
            return col && col.autosizable && !col.flex && includeColFn(col);
        });

        if (isEmpty(colIds)) return;

        await this.autosizeColsInternalAsync(colIds, options).linkTo(this.autosizeTask);
    }

    /**
     * Begin an inline editing session.
     * @param recOrId - StoreRecord/ID to edit. If unspecified, the first selected StoreRecord
     *      will be used, if any, or the first overall StoreRecord in the grid.
     * @param colId - ID of column on which to start editing. If unspecified, the first
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
    onCellEditingStarted = () => {
        this.isEditing = true;
    };

    /** @internal*/
    @action
    onCellEditingStopped = () => {
        this.isEditing = false;
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

    //-----------------------
    // Implementation
    //-----------------------
    private buildColumn(config: ColumnGroupSpec | ColumnSpec, borderedGroup?: ColumnGroupSpec) {
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
            const children = compact(
                config.children.map(c => this.buildColumn(c, borderedGroup))
            ) as Array<ColumnGroup | Column>;
            return !isEmpty(children)
                ? new ColumnGroup(config as ColumnGroupSpec, this, children)
                : null;
        }

        if (borderedGroup) {
            config = this.enhanceConfigWithGroupBorders(config, borderedGroup);
        }

        return new Column(config, this);
    }

    private async autosizeColsInternalAsync(colIds, options) {
        await this.whenReadyAsync();
        if (!this.isReady) return;

        const {agApi, empty} = this,
            {showMask} = options;

        if (showMask) {
            agApi.showLoadingOverlay();
        }

        try {
            await XH.gridAutosizeService.autosizeAsync(this, colIds, options);
            this.noteColumnsAutosized(colIds);
        } finally {
            if (showMask) {
                await wait();
                if (empty) {
                    agApi.showNoRowsOverlay();
                } else {
                    agApi.hideOverlay();
                }
            }
        }
    }

    private gatherLeaves(columns, leaves = []) {
        columns.forEach(col => {
            if (col.groupId) this.gatherLeaves(col.children, leaves);
            if (col.colId) leaves.push(col);
        });

        return leaves;
    }

    private collectIds(cols, ids = []) {
        cols.forEach(col => {
            if (col.colId) ids.push(col.colId);
            if (col.groupId) {
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
    private parseAndSetColumnsAndStore(colConfigs, store = {}) {
        // 1) Validate configs.
        this.validateStoreConfig(store);
        this.validateColConfigs(colConfigs);

        // 2) Enhance colConfigs with field-level metadata provided by store, if any.
        colConfigs = this.enhanceColConfigsFromStore(colConfigs, store);

        // 3) Create and set columns with (possibly) enhanced configs.
        this.setColumns(colConfigs);

        let newStore: Store;
        // 4) Create store if needed
        if (isPlainObject(store)) {
            store = this.enhanceStoreConfigFromColumns(store);
            newStore = new Store({loadTreeData: this.treeMode, ...store});
            newStore.xhImpl = this.xhImpl;
            this.markManaged(newStore);
        } else {
            newStore = store as Store;
        }

        this.store = newStore;
    }

    private validateStoreConfig(store) {
        throwIf(
            !(store instanceof Store || isPlainObject(store)),
            'GridModel.store config must be either an instance of a Store or a config to create one.'
        );
    }

    private validateColConfigs(colConfigs) {
        throwIf(!isArray(colConfigs), 'GridModel.columns config must be an array.');
        throwIf(
            colConfigs.some(c => !isPlainObject(c)),
            'GridModel.columns config only accepts plain objects for Column or ColumnGroup configs.'
        );
    }

    private validateColumns(cols) {
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

    cleanColumnState(columnState) {
        const gridCols = this.getLeafColumns();

        // REMOVE any state columns that are no longer found in the grid. These were likely saved
        // under a prior release of the app and have since been removed from the code.
        let ret = columnState.filter(({colId}) => this.findColumn(gridCols, colId));

        // ADD any grid columns that are not found in state. These are newly added to the code.
        // Insert these columns in position based on the index at which they are defined.
        gridCols.forEach(({colId}, idx) => {
            if (!find(ret, {colId})) {
                ret.splice(idx, 0, {colId});
            }
        });

        ret = ret.map(state => {
            const col = this.findColumn(gridCols, state.colId);

            // Remove the width from any non-resizable column - we don't want to track those widths as
            // they are set programmatically (e.g. fixed / action columns), and saved state should not
            // conflict with any code-level updates to their widths.
            if (!col.resizable) state = omit(state, 'width');

            // Remove all metadata other than the id and the hidden state from hidden columns, to save
            // on space when storing user configs with large amounts of hidden fields.
            if (state.hidden) state = pick(state, 'colId', 'hidden');

            return state;
        });

        return ret;
    }

    // Selectively enhance raw column configs with field-level metadata from store.fields and/or
    // field config partials provided by the column configs themselves.
    private enhanceColConfigsFromStore(colConfigs, storeOrConfig?) {
        const store = storeOrConfig || this.store,
            storeFields = store?.fields,
            fieldsByName = {};

        // Extract field definitions in all supported forms: pull Field instances/configs from
        // storeFields first, then fill in with any col-level `field` config objects.
        storeFields?.forEach(sf => (fieldsByName[sf.name] = sf));
        colConfigs.forEach(cc => {
            if (isPlainObject(cc.field) && !fieldsByName[cc.field.name]) {
                fieldsByName[cc.field.name] = cc.field;
            }
        });

        if (isEmpty(fieldsByName)) return colConfigs;

        const numTypes = ['int', 'number'],
            dateTypes = ['date', 'localDate'];
        return colConfigs.map(col => {
            // Recurse into children for column groups
            if (col.children) {
                return {
                    ...col,
                    children: this.enhanceColConfigsFromStore(col.children, storeOrConfig)
                };
            }

            const colFieldName = isPlainObject(col.field) ? col.field.name : col.field,
                field = fieldsByName[colFieldName];

            if (!field) return col;

            const {displayName, type} = field,
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
                sortingOrder,
                align,
                ...col
            };
        });
    }

    // Ensure store config has a complete set of fields for all configured columns. Note this
    // requires columns to have been constructed and set, and will only work with a raw store
    // config object, not an instance.
    private enhanceStoreConfigFromColumns(storeConfig) {
        const fields = storeConfig.fields ?? [],
            storeFieldNames = fields.map(it => it.name ?? it),
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

    private parseSelModel(selModel): StoreSelectionModel {
        const {store} = this;
        selModel = withDefault(selModel, XH.isMobileApp ? 'disabled' : 'single');

        if (selModel instanceof StoreSelectionModel) {
            return selModel;
        }

        if (isPlainObject(selModel)) {
            return this.markManaged(new StoreSelectionModel({...selModel, store, xhImpl: true}));
        }

        // Assume it's just the mode...
        let mode: any = 'single';
        if (isString(selModel)) {
            mode = selModel;
        } else if (selModel === null) {
            mode = 'disabled';
        }
        return this.markManaged(new StoreSelectionModel({mode, store, xhImpl: true}));
    }

    private parseFilterModel(filterModel) {
        if (XH.isMobileApp || !filterModel) return null;
        filterModel = isPlainObject(filterModel) ? filterModel : {};
        return new GridFilterModel({bind: this.store, ...filterModel}, this);
    }

    private parseExperimental(experimental) {
        return {
            ...XH.getConf('xhGridExperimental', {}),
            ...experimental
        };
    }

    private parseChooserModel(chooserModel): HoistModel {
        const modelClass = XH.isMobileApp ? MobileColChooserModel : DesktopColChooserModel;

        if (isPlainObject(chooserModel)) {
            return this.markManaged(new modelClass({...chooserModel, gridModel: this}));
        }

        return chooserModel ? this.markManaged(new modelClass({gridModel: this})) : null;
    }

    private isGroupSpec(col: ColumnGroupSpec | ColumnSpec): col is ColumnGroupSpec {
        return 'children' in col;
    }

    defaultGroupSortFn = (a, b) => {
        return a < b ? -1 : a > b ? 1 : 0;
    };

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
}
