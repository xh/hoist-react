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
    RowClickedEvent,
    RowDoubleClickedEvent
} from '@ag-grid-community/core';
import {
    Column,
    ColumnRenderer,
    ColumnSpec,
    Grid,
    GridConfig,
    GridContextMenuSpec,
    GridGroupSortFn,
    GridModel,
    GridSorter,
    GridSorterLike,
    GroupRowRenderer,
    RowClassFn,
    RowClassRuleFn,
    TreeStyle
} from '@xh/hoist/cmp/grid';
import {
    ZoneGridColConfig,
    zoneGridRenderer,
    ZoneGridSubField
} from '@xh/hoist/cmp/zoneGrid/impl/ZoneGridRenderer';
import {
    Awaitable,
    HoistModel,
    LoadSpec,
    managed,
    PlainObject,
    Some,
    VSide,
    XH
} from '@xh/hoist/core';
import {
    RecordAction,
    Store,
    StoreConfig,
    StoreRecordOrId,
    StoreSelectionConfig,
    StoreSelectionModel,
    StoreTransaction
} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {executeIfFunction, throwIf, withDefault} from '@xh/hoist/utils/js';
import {castArray, find, forOwn, isEmpty, isFinite, isPlainObject, isString} from 'lodash';
import {ReactNode} from 'react';
import {ZoneGridPersistenceModel} from './impl/ZoneGridPersistenceModel';
import {ZoneMapperConfig, ZoneMapperModel} from './impl/ZoneMapperModel';
import {Zone, ZoneGridModelPersistOptions, ZoneLimit, ZoneMapping} from './Types';

export interface ZoneGridConfig {
    /**
     * Available columns for this grid. Columns with an omit property evaluating to true will be
     * excluded. Note that the actual display of the zone columns is managed via `mappings` below.
     */
    columns: Array<ColumnSpec>;

    /** Mappings of columns to zones. */
    mappings: Record<Zone, Some<string | ZoneMapping>>;

    /** Optional configurations for zone constraints. */
    limits?: Partial<Record<Zone, ZoneLimit>>;

    /**
     * Optional renderers to produce a row specific label for each column.
     * If not specified, the label will default to the fixed  Header of the column.
     */
    labelRenderers?: Record<string, ColumnRenderer>;

    /**
     * Optional configs to apply to left column. Intended for use as an `escape hatch` - use with
     * care. Settings made here may interfere with the implementation of this component.
     */
    leftColumnSpec?: Partial<ColumnSpec>;

    /**
     * Optional configs to apply to right column. Intended for use as an `escape hatch` - use with
     * care. Settings made here may interfere with the implementation of this component.
     */
    rightColumnSpec?: Partial<ColumnSpec>;

    /** String rendered between consecutive SubFields. */
    delimiter?: string;

    /** Config with which to create a ZoneMapperModel, or boolean `true` to enable default. */
    zoneMapperModel?: ZoneMapperConfig | boolean;

    /**
     * A Store instance, or a config with which to create a Store.
     * If not supplied, store fields will be inferred from columns config.
     */
    store?: Store | StoreConfig;

    /** True if grid is a tree grid (default false). */
    treeMode?: boolean;

    /** Location for docked summary row(s). Requires `store.summaryRecords` to be populated. */
    showSummary?: boolean | VSide;

    /** Specification of selection behavior. Defaults to 'single' (desktop) and 'disabled' (mobile) */
    selModel?: StoreSelectionModel | StoreSelectionConfig | 'single' | 'multiple' | 'disabled';

    /**
     * Function to be called when the user triggers ZoneGridModel.restoreDefaultsAsync().
     * This function will be called after the built-in defaults have been restored, and can be
     * used to restore application specific defaults.
     */
    restoreDefaultsFn?: () => Awaitable<void>;

    /**
     * Confirmation warning to be presented to user before restoring default state. Set to
     * null to skip user confirmation.
     */
    restoreDefaultsWarning?: ReactNode;

    /** Options governing persistence. */
    persistWith?: ZoneGridModelPersistOptions;

    /**
     * Text/element to display if grid has no records. Defaults to null, in which case no empty
     * text will be shown.
     */
    emptyText?: ReactNode;

    /** True (default) to hide empty text until after the Store has been loaded at least once. */
    hideEmptyTextBeforeLoad?: boolean;

    /**
     * Initial sort to apply to grid data.
     * Note that unlike GridModel, multi-sort is not supported.
     */
    sortBy?: GridSorterLike;

    /** Column ID(s) by which to do full-width grouping. */
    groupBy?: Some<string>;

    /** True (default) to show a count of group member rows within each full-width group row. */
    showGroupRowCounts?: boolean;

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
 * ZoneGridModel is a wrapper around GridModel, which shows date in a grid with multi-line
 * full-width rows, each broken into four zones for top/bottom and left/right.
 *
 * This is the primary app entry-point for specifying ZoneGrid component options and behavior.
 */
export class ZoneGridModel extends HoistModel {
    @managed
    gridModel: GridModel;

    @managed
    mapperModel: ZoneMapperModel;

    @observable.ref
    mappings: Record<Zone, ZoneMapping[]>;

    labelRenderers: Record<string, ColumnRenderer>;

    @bindable.ref
    leftColumnSpec: Partial<ColumnSpec>;

    @bindable.ref
    rightColumnSpec: Partial<ColumnSpec>;

    availableColumns: ColumnSpec[];
    limits: Partial<Record<Zone, ZoneLimit>>;
    delimiter: string;
    restoreDefaultsFn: () => Awaitable<void>;
    restoreDefaultsWarning: ReactNode;

    private _defaultState; // initial state provided to ctor - powers restoreDefaults().
    @managed persistenceModel: ZoneGridPersistenceModel;

    constructor(config: ZoneGridConfig) {
        super();
        makeObservable(this);

        const {
            columns,
            limits,
            mappings,
            sortBy,
            groupBy,
            leftColumnSpec,
            rightColumnSpec,
            delimiter,
            zoneMapperModel,
            labelRenderers,
            restoreDefaultsFn,
            restoreDefaultsWarning,
            persistWith,
            ...rest
        } = config;

        this.availableColumns = columns
            .filter(it => !executeIfFunction(it.omit))
            .map(it => ({...it, hidden: true}));
        this.limits = limits;
        this.mappings = this.parseMappings(mappings, true);

        this.leftColumnSpec = leftColumnSpec;
        this.rightColumnSpec = rightColumnSpec;
        this.delimiter = delimiter ?? ' • ';
        this.restoreDefaultsFn = restoreDefaultsFn;
        this.restoreDefaultsWarning = restoreDefaultsWarning;
        this.labelRenderers = labelRenderers ?? {};

        this._defaultState = {
            mappings: this.mappings,
            sortBy: sortBy,
            groupBy: groupBy
        };

        this.gridModel = this.createGridModel(rest);

        this.setSortBy(sortBy);
        this.setGroupBy(groupBy);

        this.mapperModel = this.parseMapperModel(zoneMapperModel);
        this.persistenceModel = persistWith
            ? new ZoneGridPersistenceModel(this, persistWith)
            : null;

        this.addReaction({
            track: () => [this.leftColumnSpec, this.rightColumnSpec],
            run: () => this.gridModel.setColumns(this.getColumns())
        });
    }

    /**
     * Restore the mapping, sorting, and grouping configs as specified by the application at
     * construction time. This is the state without any user changes applied.
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

        const {mappings, sortBy, groupBy} = this._defaultState;
        this.setMappings(mappings);
        this.setSortBy(sortBy);
        this.setGroupBy(groupBy);

        this.persistenceModel?.clear();

        if (this.restoreDefaultsFn) {
            await this.restoreDefaultsFn();
        }

        return true;
    }

    showMapper() {
        this.mapperModel.open();
    }

    @action
    setMappings(mappings: Record<Zone, Some<string | ZoneMapping>>) {
        this.mappings = this.parseMappings(mappings, false);
        this.gridModel.setColumns(this.getColumns());
    }

    getDefaultContextMenu = () => [
        'filter',
        '-',
        'copy',
        'copyWithHeaders',
        'copyCell',
        '-',
        'expandCollapseAll',
        '-',
        'restoreDefaults',
        '-',
        new RecordAction({
            text: 'Customize Fields',
            icon: Icon.gridLarge(),
            hidden: !this?.mapperModel,
            actionFn: () => (this?.mapperModel as any)?.open()
        })
    ];

    //-----------------------
    // Getters and methods trampolined from GridModel.
    //-----------------------
    get sortBy(): GridSorter {
        const ret = this.gridModel.sortBy?.[0];
        if (!ret) return null;

        // Normalize 'left_column' and 'right_column' to actual underlying fields
        if (ret?.colId === 'left_column') {
            const colId = this.mappings.tl[0]?.field;
            return colId ? new GridSorter({...ret, colId}) : null;
        } else if (ret?.colId === 'right_column') {
            const colId = this.mappings.tr[0]?.field;
            return colId ? new GridSorter({...ret, colId}) : null;
        }

        return ret;
    }

    setSortBy(cfg: GridSorterLike) {
        // If the field is mapping to the primary field in a left/right column, set
        // 'left_column'/'right_column' colId instead to display the arrows in the header.
        const sorter = GridSorter.parse(cfg);
        if (sorter?.colId === this.mappings.tl[0]?.field) {
            return this.gridModel.setSortBy({...sorter, colId: 'left_column'});
        }
        if (sorter?.colId === this.mappings.tr[0]?.field) {
            return this.gridModel.setSortBy({...sorter, colId: 'right_column'});
        }
        return this.gridModel.setSortBy(sorter);
    }

    get store() {
        return this.gridModel.store;
    }

    get empty() {
        return this.gridModel.empty;
    }

    get selModel() {
        return this.gridModel.selModel;
    }

    get hasSelection() {
        return this.gridModel.hasSelection;
    }

    get selectedRecords() {
        return this.gridModel.selectedRecords;
    }

    get selectedRecord() {
        return this.gridModel.selectedRecord;
    }

    get selectedId() {
        return this.gridModel.selectedId;
    }

    get groupBy() {
        return this.gridModel.groupBy;
    }

    selectAsync(
        records: Some<StoreRecordOrId>,
        opts: {ensureVisible?: boolean; clearSelection?: boolean}
    ) {
        return this.gridModel.selectAsync(records, opts);
    }

    preSelectFirstAsync() {
        return this.gridModel.preSelectFirstAsync();
    }

    selectFirstAsync(opts: {ensureVisible?: boolean} = {}) {
        return this.gridModel.selectFirstAsync(opts);
    }

    ensureSelectionVisibleAsync() {
        return this.gridModel.ensureSelectionVisibleAsync();
    }

    override doLoadAsync(loadSpec: LoadSpec) {
        return this.gridModel.doLoadAsync(loadSpec);
    }

    loadData(rawData: any[], rawSummaryData?: Some<PlainObject>) {
        return this.gridModel.loadData(rawData, rawSummaryData);
    }

    updateData(rawData: PlainObject[] | StoreTransaction) {
        return this.gridModel.updateData(rawData);
    }

    clear() {
        return this.gridModel.clear();
    }

    setGroupBy(colIds: Some<string>) {
        return this.gridModel.setGroupBy(colIds);
    }

    //-----------------------
    // Implementation
    //-----------------------
    private createGridModel(config: GridConfig): GridModel {
        return new GridModel({
            ...config,
            xhImpl: true,
            contextMenu: withDefault(config.contextMenu, this.getDefaultContextMenu),
            sizingMode: 'standard',
            cellBorders: true,
            rowBorders: true,
            stripeRows: false,
            autosizeOptions: {mode: 'disabled'},
            columns: this.getColumns()
        });
    }

    private getColumns(): ColumnSpec[] {
        return [
            this.buildZoneColumn(true),
            this.buildZoneColumn(false),
            // Ensure all available columns are provided as hidden columns for lookup by multifield renderer
            ...this.availableColumns
        ];
    }

    private buildZoneColumn(isLeft: boolean): ColumnSpec {
        const {gridModel, labelRenderers, mappings, delimiter} = this,
            topMappings = mappings[isLeft ? 'tl' : 'tr'],
            bottomMappings = mappings[isLeft ? 'bl' : 'br'];

        throwIf(
            isEmpty(topMappings),
            `${isLeft ? 'Left' : 'Right'} column requires at least one top mapping`
        );

        // Extract the primary column from the top mappings
        const primaryCol = new Column(this.findColumnSpec(topMappings[0]), gridModel);

        // Extract the sub-fields from the other mappings
        const subFields: ZoneGridSubField[] = [];
        topMappings.slice(1).forEach(it => {
            const colId = it.field;
            subFields.push({
                colId,
                label: it.showLabel ? labelRenderers[colId] ?? true : false,
                position: 'top'
            });
        });
        bottomMappings.forEach(it => {
            const colId = it.field;
            subFields.push({
                colId,
                label: it.showLabel ? labelRenderers[colId] ?? true : false,
                position: 'bottom'
            });
        });

        const zoneGridConfig: ZoneGridColConfig = {
            mainRenderer: primaryCol.renderer,
            delimiter,
            subFields
        };

        const overrideSpec = (isLeft ? this.leftColumnSpec : this.rightColumnSpec) ?? {};

        return {
            // Controlled properties
            field: isLeft ? 'left_column' : 'right_column',
            align: isLeft ? 'left' : 'right',
            flex: overrideSpec.width ? null : isLeft ? 2 : 1,
            renderer: (value, context) => zoneGridRenderer(value, context, isLeft),
            rendererIsComplex: true,
            rowHeight: Grid['ZONEGRID_ROW_HEIGHT'],
            resizable: false,
            movable: false,
            hideable: false,
            appData: {zoneGridConfig},

            // Properties inherited from primary column
            headerName: primaryCol.headerName,
            absSort: primaryCol.absSort,
            sortingOrder: primaryCol.sortingOrder,
            sortValue: primaryCol.sortValue,
            sortToBottom: primaryCol.sortToBottom,
            comparator: primaryCol.comparator,
            sortable: primaryCol.sortable,
            getValueFn: primaryCol.getValueFn,

            // Optional overrides
            ...overrideSpec
        };
    }

    private findColumnSpec(mapping: ZoneMapping): ColumnSpec {
        return this.availableColumns.find(it => {
            const {field} = it;
            return isString(field) ? field === mapping.field : field.name === mapping.field;
        });
    }

    private parseMappings(
        mappings: Record<Zone, Some<string | ZoneMapping>>,
        strict: boolean
    ): Record<Zone, ZoneMapping[]> {
        const ret = {} as Record<Zone, ZoneMapping[]>;
        forOwn(mappings, (rawMapping, zone: Zone) => {
            try {
                ret[zone] = this.parseZoneMapping(zone, rawMapping);
            } catch (e) {
                if (strict) throw e;
                this.logWarn(e.message);
                ret[zone] = this._defaultState.mappings[zone];
            }
        });
        return ret;
    }

    private parseZoneMapping(zone: Zone, rawMapping: Some<string | ZoneMapping>): ZoneMapping[] {
        const ret: ZoneMapping[] = [];

        // 1) Standardize raw mapping into an array of ZoneMappings
        castArray(rawMapping).forEach(it => {
            if (!it) return;

            const fieldSpec = isString(it) ? {field: it} : it,
                col = this.findColumnSpec(fieldSpec);

            throwIf(!col, `Column not found for field '${fieldSpec.field}'`);

            ret.push(fieldSpec);
        });

        // 2) Ensure we respect configured limits
        const limit = this.limits?.[zone];
        if (limit) {
            throwIf(
                isFinite(limit.min) && ret.length < limit.min,
                `Requires minimum ${limit.min} mappings in zone "${zone}."`
            );

            throwIf(
                isFinite(limit.max) && ret.length > limit.max,
                `Exceeds maximum ${limit.max} mappings in zone "${zone}".`
            );

            if (!isEmpty(limit.only)) {
                const offender = find(ret, it => !limit.only.includes(it.field));
                throwIf(offender, `Field "${offender?.field}" not allowed in zone "${zone}".`);
            }
        }

        // 3) Ensure top zones have at least the minimum required single field
        throwIf(
            (zone == 'tl' || zone == 'tr') && isEmpty(ret),
            `Top mapping '${zone}' requires at least one field.`
        );

        return ret;
    }

    private parseMapperModel(mapperModel: ZoneMapperConfig | boolean): ZoneMapperModel {
        if (isPlainObject(mapperModel)) {
            return new ZoneMapperModel({
                ...(mapperModel as ZoneMapperConfig),
                zoneGridModel: this
            });
        }
        return mapperModel ? new ZoneMapperModel({zoneGridModel: this}) : null;
    }
}
