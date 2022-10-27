/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {AgGridModel} from '@xh/hoist/cmp/ag-grid';
import {Column,
    ColumnConfig, ColumnGroup, ColumnGroupConfig, GridAutosizeMode, GridGroupSortFn, TreeStyle} from '@xh/hoist/cmp/grid';
import {GridFilterModel} from '@xh/hoist/cmp/grid/filter/GridFilterModel';
import {br, fragment} from '@xh/hoist/cmp/layout';
import {
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
    FieldType,
    FieldConfig,
    RawData,
    Store,
    StoreConfig,
    StoreRecord,
    StoreRecordId,
    StoreRecordOrId,
    StoreSelectionConfig,
    StoreSelectionModel
} from '@xh/hoist/data';
import {ColChooserModel as DesktopColChooserModel} from '@xh/hoist/dynamics/desktop';
import {ColChooserModel as MobileColChooserModel} from '@xh/hoist/dynamics/mobile';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable, when} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import { ExportOptions } from '@xh/hoist/svc/GridExportService';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {
    deepFreeze,
    ensureUnique,
    logWithDebug,
    throwIf,
    warnIf,
    withDebug,
    withDefault
} from '@xh/hoist/utils/js';
import equal from 'fast-deep-equal';
import {
    castArray,
    cloneDeep,
    compact,
    defaults,
    defaultsDeep,
    find,
    forEach,
    isArray,
    isEmpty,
    isFunction,
    isNil,
    isPlainObject,
    isString,
    isUndefined,
    max,
    min,
    omit,
    pull
} from 'lodash';
import {GridPersistenceModel} from './impl/GridPersistenceModel';
import {GridSorter} from './impl/GridSorter';
import {managedRenderer} from './impl/Utils';
import {GridAutosizeOptions} from "@xh/hoist/cmp/grid/GridAutosizeOptions";
import {ReactNode} from 'react';
import {GridModelPersistOptions, RowClassFn, RowClassRuleFn} from './Interfaces';


export interface GridConfig {

    /** Columns for this grid. */
    columns?: (ColumnConfig | ColumnGroupConfig)[];

    /**  Column configs to be set on all columns.  Merges deeply. */
    colDefaults?: Partial<ColumnConfig>;

    /**
     * A Store instance, or a config with which to create a Store. If not supplied,
     * store fields will be inferred from columns config.
     */
    store?: Store | StoreConfig;

    /** True if grid is a tree grid (default false). */
    treeMode?: boolean;

    /** Location for a docked summary row. Requires `store.SummaryRecord` to be populated. */
    showSummary?: boolean | VSide;

    /** Object providing selection behavior of Grid. */
    selModel?: StoreSelectionModel | StoreSelectionConfig | 'single' | 'multiple' | 'disabled';

    /** Config with which to create a GridFilterModel, or `true` to enable default. Desktop only.*/
    filterModel?: GridFilterConfig | boolean;

    /** Config with which to create aColChooserModel, or boolean `true` to enable default.*/
    colChooserModel?: any | boolean;

    /**
     * Async function to be called when the user triggers GridModel.restoreDefaultsAsync(). This
     * function will be called after the built-in defaults have been restored, and can be
     * used to restore application specific defaults.
     */
    restoreDefaultsFn?: () => Promise<boolean>;

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
    sortyBy?: Some<GridSorterSpec>;

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
    treeStyle: TreeStyle;

    /** True to use alternating backgrounds for rows. */
    stripeRow?: boolean;

    /** True to render cell borders. */
    cellBorders?: boolean;

    /** True to highlight the focused cell with a border. */
    showCellFocus?: boolean;

    /** True to suppress display of the grid's header row. */
    hideHeaders?: boolean;

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
    groupRowRenderer?: GroupRowRendererFn;

    /**
     * Function to use to sort full-row groups.  Called with two group values to compare
     * in the form of a standard JS comparator.  Default is an ascending string sort.
     * Set to `null` to prevent sorting of groups.
     */
    groupSortFn?: GridGroupSortFn;

    /**
     * Callback when a key down event is detected on the grid. Function will receive an event
     * with the standard 'target' element. Note that the ag-Grid API provides limited ability to
     * customize keyboard handling. This handler is designed to allow applications to workaround
     * this.
     */
    onKeyDown?: (e: KeyboardEvent) => void;

    /**
     * Callback when a row is clicked - will receive an event with a data node containing
     * the row's data. (Note that this may be null - e.g. for clicks on full-width group rows.)
     */
    onRowClicked?: (e: any) => void;

    /**
     * Callback when a row is double clicked - will receive an event with a data node containing
     * the row's data. (Note that this may be null - e.g. for clicks on full-width group rows.)
     */
    onRowDoubleClicked?: (e: any) => void;

    /**
     * Callback when a cell is clicked. Function will receive an event with a data node,
     * cell value, and column.
     */
    onCellClicked?: (e: any) => void;

    /**
     * Callback when a cell is double clicked. Function will receive an event with a data node,
     * cell value, and column.
     */
    onCellDoubleClicked?: (e: any) => void;

    /**
     * Callback when the context menu is opened. Function will receive an event with a data
     * node containing the row's data. Note that this event can also be triggered via a
     * long press (aka tap and hold) on mobile devices.
     */
    onCellContextMenu?: (e: any) => void;

    /**
     * Number of clicks required to expand / collapse a parent row in a tree grid. Defaults
     * to 2 for desktop, 1 for mobile. Any other value prevents clicks on row body from
     * expanding / collapsing (requires click on tree col > control).
     */
    clicksToExpand?: number;

    /**
     * Array of RecordActions, configs or token strings with which to create grid context
     * menu items.  May also be specified as a function returning a StoreContextMenu. Desktop only.
     */
    contextMenu?: any;  // TODO: update to menu type.

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

    /** Additional data to attach to this model instance. */
    [x:string]: any;
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

    static DEFAULT_RESTORE_DEFAULTS_WARNING =
        fragment(
            'This action will clear any customizations you have made to this grid, including filters, column selection, ordering, and sizing.', br(), br(),
            'OK to proceed?'
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
    contextMenu: any;
    groupRowHeight: number;
    groupRowRenderer: GroupRowRendererFn;
    groupSortFn: GridGroupSortFn;
    showGroupRowCounts: boolean;
    enableColumnPinning: boolean;
    enableExport: boolean;
    externalSort: boolean;
    exportOptions: ExportOptions;
    useVirtualColumns: boolean;
    autosizeOptions: GridAutosizeOptions;
    restoreDefaultsFn: () => Promise<boolean>;
    restoreDefaultsWarning: ReactNode;
    fullRowEditing: boolean;
    hideEmptyTextBeforeLoad: boolean;
    highlightRowOnClick: boolean;
    clicksToExpand: number;
    clicksToEdit: number;
    lockColumnGroups: boolean;
    colDefaults: Partial<ColumnConfig>;
    experimental: PlainObject;
    onKeyDown: (e: KeyboardEvent) => void;
    onRowClicked: (e: any) => void;
    onRowDoubleClicked: (e: any) => void;
    onCellClicked: (e: any) => void;
    onCellDoubleClicked: (e: any) => void;
    onCellContextMenu: (e: any) => void;


    @managed filterModel: GridFilterModel;
    @managed agGridModel: AgGridModel;

    //------------------------
    // Observable API
    //------------------------
    @observable.ref columns: (ColumnGroup|Column)[] = [];
    @observable.ref columnState: ColumnState[] = [];
    @observable.ref expandState: any = {};
    @observable.ref autosizeState: AutosizeState = {};
    @observable.ref sortBy: GridSorter[] = [];
    @observable.ref groupBy: string[] = null;
    @observable showSummary: boolean|VSide = false;
    @observable.ref emptyText: ReactNode;
    @observable treeStyle: TreeStyle;

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

    static defaultContextMenu = [
        'filter',
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
    @bindable xhFindQuery = null;

    constructor({
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
        stripeRows = (!treeMode || treeStyle === 'none'),
        showCellFocus = false,
        hideHeaders = false,

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
        highlightRowOnClick = XH.isMobileApp,
        experimental,
        xhImpl,
        ...rest
    }: GridConfig) {
        super();
        makeObservable(this);
        this.xhImpl = xhImpl;

        this._defaultState = {columns, sortBy, groupBy};

        this.treeMode = treeMode;
        this.treeStyle = treeStyle;
        this.showSummary = showSummary;

        this.emptyText = emptyText;
        this.hideEmptyTextBeforeLoad = hideEmptyTextBeforeLoad;
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
            autosizeOptions.fillMode && !['all', 'left', 'right', 'none'].includes(autosizeOptions.fillMode),
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

        this.addReaction({
            track: () => this.isEditing,
            run: (isEditing) => this.isInEditingMode = isEditing,
            debounce: 500
        });
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
                title: 'Please Confirm',
                icon: Icon.warning(),
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

        if (this.autosizeOptions.mode === GridAutosizeMode.MANAGED) {
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
    localExport(filename: string, type: 'excel'|'csv', params: PlainObject = {}) {
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
     *
     * @param records - one or more record(s) / ID(s) to select.
     * @param options.ensureVisible - true to make selection visible if it is within a
     *      collapsed node or outside of the visible scroll window. Default true.
     * @param options.clearSelection - true to clear previous selection (rather than
     *      add to it). Default true.
     */
    async selectAsync(
        records: Some<StoreRecordOrId>,
        opts: {ensureVisible?: boolean, clearSelection?: boolean} = {}
    ) {
        const {ensureVisible = true, clearSelection = true} = opts;
        this.selModel.select(records, clearSelection);
        if (ensureVisible) await this.ensureSelectionVisibleAsync();
    }

    /**
     * Select the first row in the grid.
     *
     * See {@see preSelectFirstAsync()} for a useful variant of this method.  preSelectFirstAsync()
     * will not change the selection if there is already a selection, which is what applications
     * typically want to do when loading/reloading a grid.
     *
     * @param options.ensureVisible - true to make selection visible if it is within a
     *      collapsed node or outside of the visible scroll window. Default true.
     */
    async selectFirstAsync(opts: {ensureVisible?: boolean} = {}) {
        const {ensureVisible = true} = opts;
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
     * This method delegates to {@see selectFirstAsync}.
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
        records.forEach(({agId}) => {
            for (let row = agApi.getRowNode(agId)?.parent; row; row = row.parent) {
                if (!row.expanded) {
                    agApi.setRowNodeExpanded(row, true);
                }
            }
        });

        await wait();

        // 2) Scroll to all nodes
        records.forEach(({agId}) => {
            const rowIndex = agApi.getRowNode(agId)?.rowIndex;
            if (!isNil(rowIndex)) indices.push(rowIndex);
        });

        const indexCount = indices.length;
        if (indexCount !== records.length) {
            console.warn('Grid row nodes not found for all provided records.');
        }

        if (indexCount === 1) {
            agApi.ensureIndexVisible(indices[0]);
        } else if (indexCount > 1) {
            agApi.ensureIndexVisible(max(indices));
            agApi.ensureIndexVisible(min(indices));
        }
    }

    /** True if any records are selected. */
    get hasSelection(): boolean {return !this.selModel.isEmpty}

    /** Currently selected records. */
    get selectedRecords(): StoreRecord[] {return this.selModel.selectedRecords}

    /** IDs of currently selected records. */
    get selectedIds(): StoreRecordId[] {return this.selModel.selectedIds}

    /**
     * Single selected record, or null if multiple/no records selected.
     *
     * Note that this getter will also change if just the data of selected record is changed
     * due to store loading or editing.  Applications only interested in the identity
     * of the selection should use {@see selectedId} instead.
     */
    get selectedRecord(): StoreRecord {return this.selModel.selectedRecord}

    /**
     * ID of selected record, or null if multiple/no records selected.
     *
     * Note that this getter will *not* change if just the data of selected record is changed
     * due to store loading or editing.  Applications also interested in the contents of the
     * of the selection should use the {@see selectedRecord} getter instead.
     */
    get selectedId(): StoreRecordId {return this.selModel.selectedId}

    /** True if this grid has no records to show in its store. */
    get empty(): boolean {return this.store.empty}

    get isReady(): boolean {return this.agGridModel.isReady}
    get agApi() {return this.agGridModel.agApi}
    get agColumnApi() {return this.agGridModel.agColumnApi}

    get sizingMode(): SizingMode {return this.agGridModel.sizingMode}
    setSizingMode(v: SizingMode) {this.agGridModel.setSizingMode(v)}

    get showHover(): boolean { return this.agGridModel.showHover }
    setShowHover(v: boolean) { this.agGridModel.setShowHover(v) }

    get rowBorders(): boolean { return this.agGridModel.rowBorders }
    setRowBorders(v: boolean) { this.agGridModel.setRowBorders(v) }

    get stripeRows(): boolean { return this.agGridModel.stripeRows }
    setStripeRows(v: boolean) { this.agGridModel.setStripeRows(v) }

    get cellBorders(): boolean { return this.agGridModel.cellBorders }
    setCellBorders(v: boolean) { this.agGridModel.setCellBorders(v) }

    get showCellFocus(): boolean { return this.agGridModel.showCellFocus }
    setShowCellFocus(v: boolean) { this.agGridModel.setShowCellFocus(v) }

    get hideHeaders(): boolean { return this.agGridModel.hideHeaders }
    setHideHeaders(v: boolean) { this.agGridModel.setHideHeaders(v) }

    @action setTreeStyle(v: TreeStyle) { this.treeStyle = v }

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
            console.warn('Unknown colId specified in groupBy - grid will not be grouped.', invalidColIds);
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
     * Set the location for a docked summary row. Requires `store.SummaryRecord` to be populated.
     * @param showSummary - true/'top' or 'bottom' to show, false to hide.
     */
    @action
    setShowSummary(showSummary: boolean|VSide) {
        this.showSummary = showSummary;
    }

    /** @param emptyText - text/element to display if grid has no records. */
    @action
    setEmptyText(emptyText: ReactNode) {
        this.emptyText = emptyText;
    }

    /**
     * Sort this grid.
     * This method is a no-op if provided any sorters without a corresponding column.
     */
    @action
    setSortBy(sorters: Some<GridSorter|GridSorterSpec>) {
        if (!sorters) {
            this.sortBy = [];
            return;
        }

        sorters = castArray(sorters);
        sorters = sorters.map(it => {
            if (it instanceof GridSorter) return it;
            return GridSorter.parse(it);
        });

        // Allow sorts associated with Hoist columns as well as ag-Grid dynamic grouping columns
        const invalidSorters = sorters.filter(it => !it.colId?.startsWith('ag-Grid') && !this.findColumn(this.columns, it.colId));
        if (invalidSorters.length) {
            console.warn('GridSorter colId not found in grid columns', invalidSorters);
            return;
        }

        this.sortBy = sorters;
    }

    override async doLoadAsync(loadSpec) {
        // Delegate to any store that has load support
        return (this.store as any).loadSupport?.loadAsync(loadSpec);
    }

    /** Load the underlying store. */
    loadData(...args) {
        // @ts-ignore
        return this.store.loadData(...args);
    }

    /** Update the underlying store. */
    updateData(...args) {
        // @ts-ignore
        return this.store.updateData(...args);
    }

    /** Clear the underlying store, removing all rows. */
    clear() {
        this.store.clear();
    }

    /** @param colConfigs - {@link Column} or {@link ColumnGroup} configs. */
    @action
    setColumns(colConfigs: (ColumnConfig | ColumnGroupConfig)[]) {
        this.validateColConfigs(colConfigs);
        colConfigs = this.enhanceColConfigsFromStore(colConfigs);

        const columns = compact(colConfigs.map(c => this.buildColumn(c)));
        this.validateColumns(columns);

        this.columns = columns;
        this.columnState = this.getLeafColumns()
            .map(it => {
                const {colId, width, hidden, pinned} = it;
                return {colId, width, hidden, pinned};
            });
    }

    setColumnState(colState: ColumnState[]) {
        colState = this.cleanColumnState(colState);
        colState = this.removeTransientWidths(colState);
        this.applyColumnStateChanges(colState);
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
    applyColumnStateChanges(colStateChanges: ColumnState[]) {
        if (isEmpty(colStateChanges)) return;

        let columnState = cloneDeep(this.columnState);

        throwIf(colStateChanges.some(({colId}) => !this.findColumn(columnState, colId)),
            'Invalid columns detected in column changes!');

        // 1) Update any width, visibility or pinned changes
        colStateChanges.forEach(change => {
            const col = this.findColumn(columnState, change.colId);

            if (!isNil(change.width)) col.width = change.width;
            if (!isNil(change.hidden)) col.hidden = change.hidden;
            if (!isUndefined(change.pinned)) col.pinned = change.pinned;
            if (!isNil(change.manuallySized)) col.manuallySized = change.manuallySized;
        });

        // 2) If the changes provided is a full list of leaf columns, synchronize the sort order
        if (colStateChanges.length === this.getLeafColumns().length) {
            columnState = colStateChanges.map(c => this.findColumn(columnState, c.colId));
        }

        if (!equal(this.columnState, columnState)) {
            this.columnState = columnState;
        }
    }

    getColumn(colId: string): Column {
        return this.findColumn(this.columns, colId);
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

    showColumn(colId: string) {this.setColumnVisible(colId, true)}

    hideColumn(colId: string) {this.setColumnVisible(colId, false)}

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

    /**
     * Return matching leaf-level Column or ColumnState object from the provided collection for the
     * given colId, if any. Used as a utility function to find both types of objects.
     */
    findColumn(cols: Column[], colId: string): Column {
        for (let col of cols) {
            if (col.children) {
                const ret = this.findColumn(col.children, colId);
                if (ret) return ret;
            } else {
                if (col.colId === colId) return col;
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

    buildColumn(config) {
        // Merge leaf config with defaults.
        // Ensure *any* tooltip setting on column itself always wins.
        if (this.colDefaults && !config.children) {
            let colDefaults = {...this.colDefaults};
            if (config.tooltip || config.tooltipElement) {
                colDefaults.tooltip = null;
                colDefaults.tooltipElement = null;
            }
            config = defaultsDeep({}, config, colDefaults);
        }

        const omit = isFunction(config.omit) ? config.omit() : config.omit;
        if (omit) return null;

        if (config.children) {
            const children = compact(config.children.map(c => this.buildColumn(c)));
            return !isEmpty(children) ? new ColumnGroup({...config, children}, this) : null;
        }

        return new Column(config, this);
    }

    /**
     * Autosize columns to fit their contents.
     *
     * @param options - overrides of default autosize options to use for this action.
     *
     * This method will ignore hidden columns, columns with a flex value, and columns with
     * autosizable = false.
     */
    @logWithDebug
    async autosizeAsync(options: GridAutosizeOptions = {}) {
        options = {...this.autosizeOptions, ...options};

        if (options.mode === 'disabled') {
            return;
        }

        // 1) Pre-process columns to be operated on
        const {columns} = options;
        if (columns) options.fillMode = 'none';  // Fill makes sense only for the entire set.

        let colIds, includeColFn = (col) => true;
        if (isFunction(columns)) {
            includeColFn = columns as ((col) => boolean)
            colIds = this.columnState.map(it => it.colId);
        } else {
            colIds = columns ?? this.columnState.map(it => it.colId);
        }

        colIds = castArray(colIds).filter(id => {
            if (!this.isColumnVisible(id)) return false;
            const col = this.getColumn(id);
            return col && col.autosizable && !col.flex && includeColFn(col);
        });

        if (isEmpty(colIds)) return;

        await this
            .autosizeColsInternalAsync(colIds, options)
            .linkTo(this.autosizeTask);
    }

    /**
     * Begin an inline editing session.
     * @param recOrId - StoreRecord/ID to edit. If unspecified, the first selected StoreRecord
     *      will be used, if any, or the first overall StoreRecord in the grid.
     * @param colId - ID of column on which to start editing. If unspecified, the first
     *      editable column will be used.
     */
    async beginEditAsync(opts: {record?: StoreRecordOrId, colId?: string} = {}) {
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
            console.warn(
                'Unable to start editing - ' +
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
            console.warn(
                'Unable to start editing - ' +
                (colId ? `column with colId ${colId} not found, or not editable` : 'no editable columns found')
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
            withDebug(`Grid failed to enter ready state after waiting ${timeout}ms`, null, this);
        }
        await wait();

        return this.isReady;
    }

    //-----------------------
    // Implementation
    //-----------------------
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

        let ret: Store
        // 4) Create store if needed
        if (isPlainObject(store)) {
            store = this.enhanceStoreConfigFromColumns(store);
            ret = new Store({loadTreeData: this.treeMode, ...store});
            ret.xhImpl = this.xhImpl;
            this.markManaged(ret);
        } else {
            ret = store as Store;
        }

        this.store = ret;
    }

    private validateStoreConfig(store) {
        throwIf(
            !(store instanceof Store || isPlainObject(store)),
            'GridModel.store config must be either an instance of a Store or a config to create one.'
        );
    }

    private validateColConfigs(colConfigs) {
        throwIf(
            !isArray(colConfigs),
            'GridModel.columns config must be an array.'
        );
        throwIf(
            colConfigs.some(c => !isPlainObject(c)),
            'GridModel.columns config only accepts plain objects for Column or ColumnGroup configs.'
        );
    }

    private validateColumns(cols) {
        if (isEmpty(cols)) return;

        const ids = this.collectIds(cols);
        ensureUnique(ids, 'All colIds and groupIds in a GridModel columns collection must be unique.');

        const treeCols = cols.filter(it => it.isTreeColumn);
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
        gridCols.forEach(({colId}, idx) => {
            if (!find(ret, {colId})) {
                ret.splice(idx, 0, {colId});
            }
        });

        return ret;
    }

    // Remove the width from any non-resizable column - we don't want to track those widths as
    // they are set programmatically (e.g. fixed / action columns), and saved state should not
    // conflict with any code-level updates to their widths.
    removeTransientWidths(columnState) {
        const gridCols = this.getLeafColumns();
        return columnState.map(state => {
            const col = this.findColumn(gridCols, state.colId);
            if (!col.resizable) state = omit(state, 'width');
            return state;
        });
    }


    // Selectively enhance raw column configs with field-level metadata from store.fields and/or
    // field config partials provided by the column configs themselves.
    private enhanceColConfigsFromStore(colConfigs, storeOrConfig?) {
        const store = storeOrConfig || this.store,
            storeFields = store?.fields,
            fieldsByName = {};

        // Extract field definitions in all supported forms: pull Field instances/configs from
        // storeFields first, then fill in with any col-level `field` config objects.
        storeFields?.forEach(sf => fieldsByName[sf.name] = sf);
        colConfigs.forEach(cc => {
            if (isPlainObject(cc.field) && !fieldsByName[cc.field.name]) {
                fieldsByName[cc.field.name] = cc.field;
            }
        });

        if (isEmpty(fieldsByName)) return colConfigs;

        const numTypes = [FieldType.INT, FieldType.NUMBER],
            dateTypes = [FieldType.DATE, FieldType.LOCAL_DATE];
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
                sortingOrder = col.absSort ?
                    Column.ABS_DESC_FIRST :
                    (isNum || isDate ? Column.DESC_FIRST : Column.ASC_FIRST);

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

        const newFields: FieldConfig[] = [];
        forEach(leafColsByFieldName, (col, name) => {
            if (name !== 'id' && !storeFieldNames.includes(name)) {
                newFields.push({name, displayName: col.displayName, ...col.fieldSpec});
            }
        });

        return isEmpty(newFields) ?
            storeConfig :
            {...storeConfig, fields: [...fields, ...newFields]};
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
                run: (mode) => this.setSizingMode(mode)
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

        // Assume its just the mode...
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
        return new GridFilterModel({
            bind: this.store,
            ...filterModel,
            gridModel: this
        });
    }

    private parseExperimental(experimental) {
        return {
            ...XH.getConf('xhGridExperimental', {}),
            ...experimental
        };
    }

    private parseChooserModel(chooserModel) {
        const modelClass = XH.isMobileApp ? MobileColChooserModel : DesktopColChooserModel;

        if (isPlainObject(chooserModel)) {
            return this.markManaged(new modelClass({...chooserModel, gridModel: this}));
        }

        return chooserModel ? this.markManaged(new modelClass({gridModel: this})) : null;
    }

    defaultGroupSortFn = (a, b) => {
        return a < b ? -1 : (a > b ? 1 : 0);
    };
}

