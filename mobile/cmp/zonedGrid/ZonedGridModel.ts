/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/mobile/register';
import {HoistModel, LoadSpec, PlainObject, Some, managed, XH, Awaitable} from '@xh/hoist/core';
import {br, fragment} from '@xh/hoist/cmp/layout';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {StoreRecordOrId, StoreTransaction} from '@xh/hoist/data';
import {
    Column,
    ColumnSpec,
    Grid,
    GridConfig,
    GridModel,
    GridSorter,
    GridSorterLike,
    multiFieldRenderer
} from '@xh/hoist/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {castArray, forOwn, isEmpty, isFinite, isPlainObject, isString} from 'lodash';
import {ReactNode} from 'react';
import {ZoneMapperConfig, ZoneMapperModel} from './impl/ZoneMapperModel';
import {ZonedGridPersistenceModel} from './impl/ZonedGridPersistenceModel';
import {ZonedGridModelPersistOptions, Zone, ZoneLimit, ZoneMapping} from './Types';
import {throwIf} from '@xh/hoist/utils/js';

export interface ZonedGridConfig extends GridConfig {
    /**
     * Available columns for this grid. Note that the actual display of
     * the zoned columns is managed via `mappings` below.
     */
    columns: Array<ColumnSpec>;

    /** Mappings of columns to zones. */
    mappings: Record<Zone, Some<string | ZoneMapping>>;

    /**
     * Initial sort to apply to grid data.
     * Note that unlike GridModel, multi-sort is not supported.
     */
    sortBy?: GridSorterLike;

    /** Column ID(s) by which to do full-width grouping. */
    groupBy?: Some<string>;

    /** Optional configurations for zone constraints. */
    limits?: Partial<Record<Zone, ZoneLimit>>;

    /**
     * Optional configs to apply to left column. Intended for use as an `escape hatch`, and should be used with care.
     * Settings made here may interfere with the implementation of this component.
     */
    leftColumnSpec?: Partial<ColumnSpec>;

    /**
     * Optional configs to apply to right column. Intended for use as an `escape hatch`, and should be used with care.
     * Settings made here may interfere with the implementation of this component.
     */
    rightColumnSpec?: Partial<ColumnSpec>;

    /** String rendered between consecutive SubFields. */
    delimiter?: string;

    /** Config with which to create a ZoneMapperModel, or boolean `true` to enable default. */
    zoneMapperModel?: ZoneMapperConfig | boolean;

    /**
     * Function to be called when the user triggers ZonedGridModel.restoreDefaultsAsync().
     * This function will be called after the built-in defaults have been restored, and can be
     * used to restore application specific defaults.
     */
    restoreDefaultsFn?: () => Awaitable<boolean>;

    /**
     * Confirmation warning to be presented to user before restoring default state. Set to
     * null to skip user confirmation.
     */
    restoreDefaultsWarning?: ReactNode;

    /** Options governing persistence. */
    persistWith?: ZonedGridModelPersistOptions;
}

/**
 * ZonedGridModel is a wrapper around GridModel, which shows date in a grid with multi-line
 * full-width rows, each broken into four zones for top/bottom and left/right.
 *
 * This is the primary app entry-point for specifying ZonedGrid component options and behavior.
 */
export class ZonedGridModel extends HoistModel {
    static DEFAULT_RESTORE_DEFAULTS_WARNING = fragment(
        'This action will clear any customizations you have made to this grid, including zone mappings and sorting.',
        br(),
        br(),
        'OK to proceed?'
    );

    @managed
    gridModel: GridModel;

    @managed
    mapperModel: ZoneMapperModel;

    @observable.ref
    mappings: Record<Zone, ZoneMapping[]>;

    @bindable.ref
    leftColumnSpec: Partial<ColumnSpec>;

    @bindable.ref
    rightColumnSpec: Partial<ColumnSpec>;

    availableColumns: ColumnSpec[];
    limits: Partial<Record<Zone, ZoneLimit>>;
    delimiter: string;
    restoreDefaultsFn: () => Awaitable<boolean>;
    restoreDefaultsWarning: ReactNode;

    private _defaultState; // initial state provided to ctor - powers restoreDefaults().
    @managed persistenceModel: ZonedGridPersistenceModel;

    constructor(config: ZonedGridConfig) {
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
            restoreDefaultsFn,
            restoreDefaultsWarning = ZonedGridModel.DEFAULT_RESTORE_DEFAULTS_WARNING,
            persistWith,
            ...rest
        } = config;

        this.availableColumns = columns.map(it => ({...it, hidden: true}));
        this.limits = limits;
        this.mappings = this.parseMappings(mappings);

        this.leftColumnSpec = leftColumnSpec;
        this.rightColumnSpec = rightColumnSpec;
        this.delimiter = delimiter ?? ' • ';
        this.restoreDefaultsFn = restoreDefaultsFn;
        this.restoreDefaultsWarning = restoreDefaultsWarning;

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
            ? new ZonedGridPersistenceModel(this, persistWith)
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
        this.mappings = this.parseMappings(mappings);
        this.gridModel.setColumns(this.getColumns());
    }

    //-----------------------
    // Getters and methods trampolined from GridModel.
    //-----------------------
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

    loadData(rawData: any[], rawSummaryData?: PlainObject) {
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

    //-----------------------
    // Implementation
    //-----------------------
    private createGridModel(config: GridConfig): GridModel {
        return new GridModel({
            ...config,
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
            this.buildZonedColumn(true),
            this.buildZonedColumn(false),
            // Ensure all available columns are provided as hidden columns for lookup by multifield renderer
            ...this.availableColumns
        ];
    }

    private buildZonedColumn(isLeft: boolean): ColumnSpec {
        const topMappings = this.mappings[isLeft ? 'tl' : 'tr'],
            bottomMappings = this.mappings[isLeft ? 'bl' : 'br'];

        throwIf(
            isEmpty(topMappings),
            `${isLeft ? 'Left' : 'Right'} column requires at least one top mapping`
        );

        // Extract the primary column from the top mappings
        const primaryCol = new Column(this.findColumnSpec(topMappings[0]), this.gridModel);

        // Extract the sub-fields from the other mappings
        const subFields = [];
        topMappings.slice(1).forEach(it => {
            subFields.push({colId: it.field, label: it.showLabel, position: 'top'});
        });
        bottomMappings.forEach(it => {
            subFields.push({colId: it.field, label: it.showLabel, position: 'bottom'});
        });

        return {
            // Controlled properties
            colId: isLeft ? 'left_column' : 'right_column',
            headerName: primaryCol.headerName,
            field: primaryCol.field,
            flex: isLeft ? 2 : 1,
            align: isLeft ? 'left' : 'right',
            renderer: multiFieldRenderer,
            rowHeight: Grid['MULTIFIELD_ROW_HEIGHT'],
            resizable: false,
            movable: false,
            hideable: false,
            appData: {
                multiFieldConfig: {
                    mainRenderer: primaryCol.renderer,
                    delimiter: this.delimiter,
                    subFields
                }
            },

            // Properties inherited from primary column
            absSort: primaryCol.absSort,
            sortingOrder: primaryCol.sortingOrder,
            sortValue: primaryCol.sortValue,
            sortToBottom: primaryCol.sortToBottom,
            comparator: primaryCol.comparator,
            sortable: primaryCol.sortable,
            getValueFn: primaryCol.getValueFn,

            // Optional overrides
            ...(isLeft ? this.leftColumnSpec : this.rightColumnSpec)
        };
    }

    private findColumnSpec(mapping: ZoneMapping): ColumnSpec {
        return this.availableColumns.find(it => {
            const {field} = it;
            return isString(field) ? field === mapping.field : field.name === mapping.field;
        });
    }

    private parseMappings(
        mappings: Record<Zone, Some<string | ZoneMapping>>
    ): Record<Zone, ZoneMapping[]> {
        const ret = {} as Record<Zone, ZoneMapping[]>;
        forOwn(mappings, (rawMapping, zone) => {
            // 1) Standardize mapping into an array of ZoneMappings
            const mapping = [];
            castArray(rawMapping).forEach(it => {
                if (!it) return;

                const ret = isString(it) ? {field: it} : it,
                    col = this.findColumnSpec(ret);

                throwIf(!col, `Column not found for field ${ret.field}`);
                return mapping.push(ret);
            });

            // 2) Ensure mapping respects configured limits
            const limit = this.limits?.[zone];
            if (limit) {
                throwIf(
                    isFinite(limit.min) && mapping.length < limit.min,
                    `Requires minimum ${limit.min} mappings in zone "${zone}"`
                );
                throwIf(
                    isFinite(limit.max) && mapping.length > limit.max,
                    `Exceeds maximum ${limit.max} mappings in zone "${zone}"`
                );

                if (!isEmpty(limit.only)) {
                    mapping.forEach(it => {
                        throwIf(
                            !limit.only.includes(it.field),
                            `Field "${it.field}" not allowed in zone "${zone}"`
                        );
                    });
                }
            }

            ret[zone] = mapping;
        });
        return ret;
    }

    private parseMapperModel(mapperModel: ZoneMapperConfig | boolean): ZoneMapperModel {
        if (isPlainObject(mapperModel)) {
            return new ZoneMapperModel({
                ...(mapperModel as ZoneMapperConfig),
                zonedGridModel: this
            });
        }
        return mapperModel ? new ZoneMapperModel({zonedGridModel: this}) : null;
    }
}
