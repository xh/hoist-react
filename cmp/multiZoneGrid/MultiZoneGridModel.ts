/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSpec, PlainObject, Some, managed, XH} from '@xh/hoist/core';
import {bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {StoreRecordOrId, StoreTransaction, genDisplayName} from '@xh/hoist/data';
import {
    ColumnSpec,
    Grid,
    GridConfig,
    GridModel,
    GridSorterLike,
    multiFieldRenderer
} from '@xh/hoist/cmp/grid';
import {castArray, forOwn, isEmpty, isFinite, isString} from 'lodash';
import {Zone, ZoneLimit, ZoneMapping} from './Types';

export interface MultiZoneGridConfig extends GridConfig {
    /**
     * Available columns for this grid. Note that the actual display of
     * the multi-zone columns is managed via `mappings` below.
     */
    columns: Array<ColumnSpec>;
    /** Mappings of columns to zones. */
    mappings: Record<Zone, Some<string | ZoneMapping>>;
    /** Optional configurations for zone constraints. */
    limits?: Partial<Record<Zone, ZoneLimit>>;
    /** Optional configs to apply to left column */
    leftColumnSpec?: Partial<ColumnSpec>;
    /** Optional configs to apply to right column */
    rightColumnSpec?: Partial<ColumnSpec>;
    /** String rendered between consecutive SubFields. */
    delimiter?: string;
}

/**
 * MultiZoneGridModel is a wrapper around GridModel, which shows date in a grid with multi-line
 * full-width rows, each broken into four zones for top/bottom and left/right.
 *
 * This is the primary app entry-point for specifying MultiZoneGrid component options and behavior.
 */
export class MultiZoneGridModel extends HoistModel {
    @managed
    gridModel: GridModel;

    @observable.ref
    mappings: Record<Zone, ZoneMapping[]>;

    @bindable.ref
    leftColumnSpec: Partial<ColumnSpec>;

    @bindable.ref
    rightColumnSpec: Partial<ColumnSpec>;

    availableColumns: ColumnSpec[];
    limits: Partial<Record<Zone, ZoneLimit>>;
    delimiter: string;

    constructor(config: MultiZoneGridConfig) {
        super();
        makeObservable(this);

        const {columns, limits, mappings, leftColumnSpec, rightColumnSpec, delimiter, ...rest} =
            config;

        this.availableColumns = columns.map(it => ({...it, hidden: true}));
        this.limits = limits;
        this.mappings = this.parseMappings(mappings);

        this.leftColumnSpec = leftColumnSpec;
        this.rightColumnSpec = rightColumnSpec;
        this.delimiter = delimiter ?? ' • ';

        this.gridModel = new GridModel({
            ...rest,
            sizingMode: 'standard',
            cellBorders: true,
            rowBorders: true,
            stripeRows: false,
            autosizeOptions: {mode: 'disabled'},
            columns: this.getColumns()
        });

        this.addReaction({
            track: () => [this.mappings, this.leftColumnSpec, this.rightColumnSpec],
            run: () => this.gridModel.setColumns(this.getColumns())
        });
    }

    setMappings(mappings: Record<Zone, Some<string | ZoneMapping>>) {
        this.mappings = this.parseMappings(mappings);
    }

    //-----------------------
    // Implementation
    //-----------------------
    getColumns(): ColumnSpec[] {
        return [
            this.buildMultiZoneColumn(true),
            this.buildMultiZoneColumn(false),
            // Ensure all available columns are provided as hidden columns for lookup by multifield renderer
            ...this.availableColumns
        ];
    }

    buildMultiZoneColumn(isLeft: boolean) {
        const topMappings = this.mappings[isLeft ? 'tl' : 'tr'],
            bottomMappings = this.mappings[isLeft ? 'bl' : 'br'];

        if (isEmpty(topMappings)) {
            throw XH.exception(
                `${isLeft ? 'Left' : 'Right'} column requires at least one top mapping`
            );
        }

        // Extract the primary column from the top mappings
        const primaryCol = this.findColumnSpec(topMappings[0]);

        let headerName = primaryCol.headerName ?? primaryCol.displayName;
        if (!headerName) {
            const {field} = primaryCol;
            if (!isString(field)) headerName = field.displayName;
            if (!headerName) headerName = genDisplayName(isString(field) ? field : field.name);
        }

        // Extract the sub-fields from the other mappings
        const subFields = [];
        topMappings.splice(1).forEach(it => {
            subFields.push({colId: it.field, label: it.showLabel, position: 'top'});
        });
        bottomMappings.forEach(it => {
            subFields.push({colId: it.field, label: it.showLabel, position: 'bottom'});
        });

        return {
            colId: isLeft ? 'left_column' : 'right_column',
            headerName,
            field: primaryCol.field,
            renderer: multiFieldRenderer,
            rowHeight: Grid['MULTIFIELD_ROW_HEIGHT'],
            flex: isLeft ? 2 : 1,
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
            ...(isLeft ? this.leftColumnSpec : this.rightColumnSpec)
        };
    }

    findColumnSpec(mapping: ZoneMapping): ColumnSpec {
        return this.availableColumns.find(it => {
            const {field} = it;
            return isString(field) ? field === mapping.field : field.name === mapping.field;
        });
    }

    parseMappings(mappings: Record<Zone, Some<string | ZoneMapping>>): Record<Zone, ZoneMapping[]> {
        const ret = {} as Record<Zone, ZoneMapping[]>;
        forOwn(mappings, (rawMapping, zone) => {
            // 1) Standardize mapping into an array of ZoneMappings
            const mapping = [];
            castArray(rawMapping).forEach(it => {
                if (!it) return;

                const ret = isString(it) ? {field: it} : it,
                    col = this.findColumnSpec(ret);

                if (!col) throw XH.exception(`Column not found for field ${ret.field}`);
                return mapping.push(ret);
            });

            // 2) Ensure mapping respects configured limits
            const limit = this.limits?.[zone];
            if (limit) {
                if (isFinite(limit.min) && mapping.length < limit.min) {
                    throw XH.exception(`Requires minimum ${limit.min} mappings in zone "${zone}"`);
                }
                if (isFinite(limit.max) && mapping.length > limit.max) {
                    throw XH.exception(`Exceeds maximum ${limit.max} mappings in zone "${zone}"`);
                }
                if (!isEmpty(limit.only)) {
                    mapping.forEach(it => {
                        if (!limit.only.includes(it.field)) {
                            throw XH.exception(`Field "${it.field}" not allowed in zone "${zone}"`);
                        }
                    });
                }
            }

            ret[zone] = mapping;
        });
        return ret;
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

    get sortBy() {
        return this.gridModel.sortBy;
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

    setSortBy(sorters: Some<GridSorterLike>) {
        return this.gridModel.setSortBy(sorters);
    }
}
