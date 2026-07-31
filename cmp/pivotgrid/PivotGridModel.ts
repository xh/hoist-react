import {ColumnGroupSpec, ColumnSpec, GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, HSide, managed, PlainObject, ReactionSpec, VSide} from '@xh/hoist/core';
import {CubeFieldSpec, Field, StoreRecord} from '@xh/hoist/data';
import {action, bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {isArray, isEmpty, isString, orderBy, sortBy, uniq} from 'lodash';
import {PivotDataModel, PivotFieldSpec, PivotQuery, PivotValue} from './PivotDataModel';

export type ColumnSpecOverrides = Pick<ColumnSpec, 'width' | 'autosizable' | 'headerName'>;

export interface PivotGridConfig {
    // The base fields used for this grid
    fields?: PivotFieldSpec[];

    // Which base fields to group the data on
    groupBy?: string[];

    // Which base fields to pivot the data on
    pivotBy?: string[];

    // The base fields which should be processed into pivoted value fields
    valueFields?: string[];

    // Location for docked value-field row-summary columns. Defaults to 'right'
    summaryColumnSide?: HSide;

    // True to show a summary column (row aggregates for each value field)
    showSummaryColumn?: boolean;

    // Location for docked value field column summary row. Defaults to 'top'
    summaryRowSide?: VSide;

    // True to show a summary row (column aggregates for each value field at each pivot path)
    showSummaryRow?: boolean;

    // Additional fields to show summary columns for
    extraSummaryColumnFields?: string[];

    // Additional fields to show summary rows for
    extraSummaryRowFields?: string[];

    // Overrides to apply to the label column
    labelColumnOverrides?: ColumnSpecOverrides;

    // Overrides to apply to value columns which will take precedence over the columnTemplate in the PivotFieldSpec
    // Helpful when trying to enforce consistency between value columns
    valueColumnOverrides?: ColumnSpecOverrides;

    pivotSortBy?: PivotSort[];

    gridConfig?: GridConfig;
}

export type PivotSort = 'asc' | 'desc' | any[] | null;

export class PivotGridModel extends HoistModel {
    static readonly SUMMARY_COL_ID_PREFIX = '__summaryCol_';

    @bindable.ref fields: PivotFieldSpec[] = [];

    @bindable.ref groupBy: string[] = [];
    @bindable.ref pivotBy: string[] = [];
    @bindable.ref pivotSortBy: PivotSort[] = [];
    @bindable.ref valueFields: string[] = [];
    @bindable summaryColumnSide: HSide = 'right';
    @bindable showSummaryColumn: boolean = false;
    @bindable summaryRowSide: VSide = 'top';
    @bindable showSummaryRow: boolean = false;
    @bindable.ref extraSummaryColumnFields: string[];
    @bindable.ref extraSummaryRowFields: string[];

    // Allows overriding properties of the label column
    @bindable.ref labelColumnOverrides?: ColumnSpecOverrides;

    // Allows overriding certain properties of all value columns, such as width
    @bindable.ref valueColumnOverrides?: ColumnSpecOverrides;

    // -------------------------------
    // Child Models
    // -------------------------------

    @managed gridModel: GridModel;
    @managed pivotDataModel: PivotDataModel;

    get hasPivotConfig(): boolean {
        return !isEmpty(this.pivotBy) && !isEmpty(this.valueFields);
    }

    @computed.struct
    get groupByFields(): PivotFieldSpec[] {
        return this.groupBy.map(it => this.fields.find(f => f.name === it));
    }

    @computed.struct
    get pivotByFields(): PivotFieldSpec[] {
        return this.pivotBy.map(it => this.fields.find(f => f.name === it));
    }

    constructor(config?: PivotGridConfig) {
        super();
        makeObservable(this);

        const {
            fields,
            groupBy,
            pivotBy,
            valueFields,
            summaryColumnSide,
            showSummaryColumn,
            summaryRowSide,
            showSummaryRow,
            extraSummaryColumnFields,
            extraSummaryRowFields,
            labelColumnOverrides,
            valueColumnOverrides,
            pivotSortBy,
            gridConfig
        } = config ?? {};

        this.fields = fields ?? []; // TODO: Should we parse the fields?
        this.groupBy = groupBy ?? []; // TODO: Validate
        this.pivotBy = pivotBy ?? []; // TODO: Validate
        this.valueFields = valueFields ?? []; // TODO: Validate
        this.summaryColumnSide = summaryColumnSide ?? 'right';
        this.showSummaryColumn = !!showSummaryColumn;
        this.summaryRowSide = summaryRowSide ?? 'top';
        this.showSummaryRow = !!showSummaryRow;
        this.extraSummaryColumnFields = extraSummaryColumnFields ?? []; // TODO: Validate
        this.extraSummaryRowFields = extraSummaryRowFields ?? []; // TODO: Validate
        this.labelColumnOverrides = labelColumnOverrides;
        this.valueColumnOverrides = valueColumnOverrides;
        this.pivotSortBy = pivotSortBy ?? [];

        this.pivotDataModel = new PivotDataModel();
        this.pivotDataModel.updateQuery(this.pivotQuery);

        this.gridModel = this.createGridModel(gridConfig);

        this.addReaction(
            this.pivotDataReaction(),
            this.pivotQueryReaction(),
            this.summaryRowConfigReaction(),
            this.syncColumnsReaction()
        );
    }

    loadData(data: PlainObject[]) {
        this.pivotDataModel.update(data, this.pivotQuery);
    }

    clearData() {
        this.pivotDataModel.clearData();
    }

    // -------------------------------
    // Reactions
    // -------------------------------

    private pivotDataReaction(): ReactionSpec<
        [PlainObject[], PivotValue[], CubeFieldSpec[], string[]]
    > {
        return {
            track: () => [
                this.pivotDataModel.data,
                this.pivotDataModel.pivotValues,
                this.pivotDataModel.pivotedValueFields,
                this.extraSummaryColumnFields
            ],
            run: () => this.updateGrid(),
            fireImmediately: true
        };
    }

    private pivotQueryReaction(): ReactionSpec<PivotQuery> {
        return {
            track: () => this.pivotQuery,
            run: query => this.pivotDataModel.updateQuery(query)
        };
    }

    private summaryRowConfigReaction(): ReactionSpec<[boolean, VSide, string[]]> {
        return {
            track: () => [this.showSummaryRow, this.summaryRowSide, this.extraSummaryRowFields],
            run: ([showSummaryRow, summaryRowSide, extraSummaryFields]) => {
                const {gridModel} = this;
                if (!showSummaryRow && isEmpty(extraSummaryFields)) {
                    gridModel.showSummary = false;
                } else {
                    gridModel.showSummary = summaryRowSide;
                }
            },
            fireImmediately: true
        };
    }

    private syncColumnsReaction(): ReactionSpec<
        [ColumnSpecOverrides, ColumnSpecOverrides, PivotSort[], boolean, HSide]
    > {
        return {
            track: () => [
                this.valueColumnOverrides,
                this.labelColumnOverrides,
                this.pivotSortBy,
                this.showSummaryColumn,
                this.summaryColumnSide
            ],
            run: () => {
                this.updateGridColumns();
                this.gridModel.autosizeAsync();
            }
        };
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    @computed.struct
    private get pivotQuery(): PivotQuery {
        const {
            fields,
            pivotBy,
            groupBy,
            valueFields,
            showSummaryRow,
            extraSummaryRowFields,
            extraSummaryColumnFields
        } = this;
        return {
            fields,
            pivotBy,
            groupBy,
            valueFields,
            includeSummaryRow: showSummaryRow,
            extraSummaryRowFields,
            extraSummaryColumnFields
        };
    }

    private createGridModel(config: GridConfig): GridModel {
        return new GridModel({
            emptyText: 'No data',
            ...config,
            store: {
                ...(config?.store ?? {}),
                fields: ['cubeLabel', 'cubeDimension', 'summaryField']
            },
            treeMode: true,
            colChooserModel: true,
            colDefaults: {
                ...(config?.colDefaults ?? {}),

                // Since we generate fields based on data, we may have dots in values, and we know we don't need this, so disable it
                enableDotSeparatedFieldPath: false
            },
            columns: this.buildGridColumns(),

            // TODO: Don't hardcode these!
            autosizeOptions: {
                mode: 'managed',
                includeHiddenColumns: true,
                bufferPx: 3
            },
            stripeRows: true,
            rowBorders: true
        });
    }

    private get store() {
        return this.gridModel.store;
    }

    @action
    private updateGridColumns() {
        const {gridModel} = this,
            labelColumnState = gridModel.getStateForColumn('cubeLabel');
        gridModel.setColumns(this.buildGridColumns());
        gridModel.updateColumnState([labelColumnState]);
    }

    private updateGrid() {
        const {fields, pivotDataModel, gridModel} = this,
            {pivotedValueFields, data, summaryRowData} = pivotDataModel,
            {store} = gridModel;

        // 1. Update the Store config to include all of our base fields as well as any pivoted value fields
        store.fields = [
            {name: 'cubeLabel'},
            {name: 'cubeDimension'},
            {name: 'summaryField'},
            ...fields,
            ...pivotedValueFields
        ].map(it => new Field(it));
        // @ts-expect-error
        store._fieldMap = store.createFieldMap();
        // @ts-expect-error
        store._dataDefaults = store.createDataDefaults();

        // 2. Build the grid column structure from the pivoted values (if we have any), while preserving the label column state
        this.updateGridColumns();

        // 3. Load the pivoted data into the grid
        gridModel.loadData(data, summaryRowData);
    }

    private buildGridColumns(): Array<ColumnSpec | ColumnGroupSpec> {
        const pivotValues = this.buildSortedPivotValues(),
            {
                hasPivotConfig,
                valueFields,
                showSummaryColumn,
                summaryColumnSide,
                extraSummaryColumnFields
            } = this;

        let columns: Array<ColumnSpec | ColumnGroupSpec> = [];
        if (!hasPivotConfig) {
            columns = this.fields.map(it => {
                const ret: ColumnSpec = it.columnTemplate ?? {};
                ret.field = it;
                return ret;
            });
        } else {
            if (!isEmpty(pivotValues)) {
                columns = pivotValues.map(it => this.buildPivotColumns(it));
            }

            // Add row summary columns
            let summaryColumnFields = uniq([...valueFields, ...extraSummaryColumnFields]).map(it =>
                    this.pivotDataModel.getField(it)
                ),
                summaryColumns: ColumnSpec[] = summaryColumnFields.map((field, idx) => {
                    const valueColSpec = this.buildValueColumn(
                        field,
                        null,
                        idx,
                        summaryColumnFields.length
                    );
                    return {
                        ...valueColSpec,
                        colId: `${PivotGridModel.SUMMARY_COL_ID_PREFIX}${field.name}`,
                        // Start hidden if we aren't showing the value summary columns and this is a value summary column
                        hidden: !showSummaryColumn && valueFields.includes(field.name)
                    };
                });

            if (summaryColumns.length > 1) {
                summaryColumns = [
                    {
                        groupId: `${PivotGridModel.SUMMARY_COL_ID_PREFIX}group`,
                        headerName: 'Total',
                        headerAlign: 'center',
                        children: summaryColumns
                    } as ColumnGroupSpec
                ];
            } else {
                summaryColumns[0].headerName = 'Total';
                summaryColumns[0].headerAlign = 'center';
            }

            if (summaryColumnSide === 'left') {
                columns.unshift(...summaryColumns);
            } else {
                columns.push(...summaryColumns);
            }
        }

        return [
            {
                field: 'cubeLabel',
                isTreeColumn: true,
                pinned: false,
                headerName: () => {
                    const {groupByFields} = this;
                    if (isEmpty(groupByFields)) {
                        return '';
                    }

                    return groupByFields.map(it => it.displayName ?? it.name).join('->');
                },
                sortValue: (v, {record}) => {
                    const {cubeDimension} = record.data,
                        field = this.store.getField(cubeDimension);

                    return field?.parseVal?.(v);
                },
                renderer: v => (isEmpty(v) || v === 'null' ? '(empty)' : v),
                ...(this.labelColumnOverrides ?? {})
            },
            ...columns
        ];
    }

    private buildPivotColumns(
        pivotValue: PivotValue,
        childIdx: number = 0,
        childCount: number = 1
    ): ColumnSpec | ColumnGroupSpec {
        const {field, path, label, children} = pivotValue;
        if (!isEmpty(children)) {
            return {
                groupId: path,
                headerName: () => label,
                headerAlign: 'center',
                children: children.map((it, idx) =>
                    this.buildPivotColumns(it, idx, children.length)
                )
            } as ColumnGroupSpec;
        } else {
            const pivotField = this.pivotDataModel.getField(field),
                ret = this.buildValueColumn(pivotField, path, childIdx, childCount);

            // If we have a value for this pivot level, then use that as the header name and center-align the header.
            // This will be true for the special case where we only have a single value column and do not want to unnecessarily add an extra level of column grouping
            if (!isEmpty(label)) {
                ret.headerName = label;
                ret.headerAlign = 'center';
            }

            return ret;
        }
    }

    private buildValueColumn(
        field: PivotFieldSpec,
        path: string,
        childIdx: number,
        childCount: number
    ): ColumnSpec {
        const colOverrides = this.valueColumnOverrides ?? {},
            ret = {
                ...field.columnTemplate,
                ...colOverrides,
                colId: field.name,
                field: field
            } as ColumnSpec;

        // If we have extra summary rows, then we need to set some stuff up
        const {extraSummaryRowFields, valueFields} = this;
        if (!isEmpty(extraSummaryRowFields)) {
            const isExtraSummaryRow = (record: StoreRecord) => {
                return record.isSummary && record.id !== 'root';
            };

            // 1. Update the renderer to show the summary value and use the summary field renderer
            // TODO: We should be doing some of this work in the getDataFn, not all in the renderer
            ret.renderer = (v, params) => {
                const {record, column} = params;
                if (isExtraSummaryRow(record)) {
                    const {summaryField} = record.data;

                    // If this is a summary column and the summaryField does not match this summary row's field, then show nothing
                    // unless we only have a single value field being shown
                    if (
                        this.isSummaryColumn(column.colId) &&
                        this.summaryColumnCount > 1 &&
                        column.field !== summaryField
                    ) {
                        return '';
                    }

                    // Path may be null in the case where this is the main summary column, in which case we want to show the grand total for this field
                    const fieldName = `${path ? path + '>>' : ''}${summaryField}`,
                        field = this.pivotDataModel.getField(fieldName),
                        summaryValue = record.get(fieldName);

                    return field.columnTemplate.renderer?.(summaryValue, params) ?? summaryValue;
                }

                return field.columnTemplate.renderer?.(v, params) ?? v;
            };

            // 2. Configure some column styling and behavior to make the summary row cells look better when there are multiple value columns.
            //      * Span across the entire leaf pivot group in case we have multiple value fields
            //      * Center the value within the spanned cell
            if (childIdx === 0 && valueFields.length > 1) {
                ret.agOptions = {
                    ...(ret.agOptions ?? {}),
                    colSpan: ({data: record, column}) =>
                        !this.isSummaryColumn(column.getColId()) && isExtraSummaryRow(record)
                            ? childCount
                            : 1,
                    cellStyle: ({data: record, column}) =>
                        !this.isSummaryColumn(column.getColId()) &&
                        isExtraSummaryRow(record) &&
                        childCount > 1
                            ? {
                                  textAlign: 'center',
                                  justifyContent: 'flex-end'
                              }
                            : {}
                };
            }
        }

        return ret;
    }

    private get summaryColumnCount(): number {
        return this.gridModel.agApi.getColumns().filter(it => this.isSummaryColumn(it.getColId()))
            .length;
    }

    private isSummaryColumn(colId: string): boolean {
        return colId.startsWith(PivotGridModel.SUMMARY_COL_ID_PREFIX);
    }

    private buildSortedPivotValues() {
        const {pivotValues} = this.pivotDataModel;
        return this.sortPivotValues(pivotValues);
    }

    private sortPivotValues(values: PivotValue[], idx: number = 0): PivotValue[] {
        const {pivotSortBy} = this,
            sortCfg = idx < pivotSortBy.length ? pivotSortBy[idx] : null;

        if (isString(sortCfg)) {
            values = orderBy(values, 'value', sortCfg);
        } else if (isArray(sortCfg)) {
            values = sortBy(values, it => {
                const idx = sortCfg.indexOf(it.value);
                return idx === -1 ? values.length : idx;
            });
        } else {
            values = [...values];
        }

        values.forEach(it => {
            if (!isEmpty(it.children)) {
                it.children = this.sortPivotValues(it.children, idx + 1);
            }
        });

        return values;
    }
}
