/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {exportFilename, getAppModel} from '@xh/hoist/admin/AdminUtils';
import * as Col from '@xh/hoist/admin/columns';
import {elapsedRenderer} from '@xh/hoist/admin/columns';
import type {ActivityTrackingDataFieldSpec} from '@xh/hoist/admin/tabs/activity/tracking/datafields/DataFieldsEditorModel';
import {DataFieldsEditorModel} from '@xh/hoist/admin/tabs/activity/tracking/datafields/DataFieldsEditorModel';
import {DateRangePickerModel} from '@xh/hoist/cmp/daterange';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {FormModel} from '@xh/hoist/cmp/form';
import type {ColumnRenderer, ColumnSpec} from '@xh/hoist/cmp/grid';
import {TreeStyle} from '@xh/hoist/cmp/grid';
import {CubeGridModel} from '@xh/hoist/cmp/cubegrid';
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import type {LoadSpec, PlainObject, SelectOption} from '@xh/hoist/core';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import type {CubeFieldSpec, FieldSpec, QueryConfig, ViewRowData} from '@xh/hoist/data';
import {Cube, getCubeLeaves} from '@xh/hoist/data';
import {dateRenderer, dateTimeSecRenderer, numberRenderer} from '@xh/hoist/format';
import {action, bindable, bindableRef, computed, observable, observableRef} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {compact, find, get, isEmpty, isEqual, isString, mapValues, round, takeRight} from 'lodash';
import moment from 'moment';
import type {ActivityDetailProvider} from './detail/ActivityDetailModel';

export class ActivityTrackingModel extends HoistModel implements ActivityDetailProvider {
    override telemetryPrefix = 'xh.client.admin.tracking';

    /** FormModel for server-side querying controls. */
    @managed formModel: FormModel;

    /** Period to query, resolved against the current app day. */
    @managed dateRangePickerModel: DateRangePickerModel;

    /** Models for data-handling components - can be rebuilt due to change in dataFields. */
    @managed @observableRef accessor groupingChooserModel: GroupingChooserModel;
    @managed @observableRef accessor cube: Cube;
    @managed @observableRef accessor filterChooserModel: FilterChooserModel;
    @managed @observableRef accessor cubeGridModel: CubeGridModel;
    @managed dataFieldsEditorModel: DataFieldsEditorModel;

    /** Dimension to pivot into columns, or null for the standard grouped grid. */
    @bindable accessor pivotBy: string = null;

    /** Measures shown per pivot value, at most `PIVOT_MAX_MEASURES`. */
    @bindableRef accessor pivotMeasures: string[] = ['entryCount'];

    /**
     * Optional spec for fields to be extracted from additional `data` returned by track entries
     * and promoted to top-level columns in the grids. Supports dot-delimited paths as names.
     */
    @observableRef accessor dataFields: ActivityTrackingDataFieldSpec[] = [];

    // TODO - process two collections - one for agg grid with _agg fields left as-is, another for
    //        detail grid and filter that replaces (potentially multiple) agg fields with a single
    //        underlying field.
    get dataFieldCols(): ColumnSpec[] {
        return this.dataFields.map(df => ({
            field: df,
            chooserGroup: 'Data Fields',
            renderer: this.getDfRenderer(df),
            appData: {showInAggGrid: !!df.aggregator}
        }));
    }

    @observable accessor showFilterChooser: boolean = false;

    get enabled(): boolean {
        return XH.trackService.enabled;
    }

    get dimensions(): string[] {
        return this.groupingChooserModel.value;
    }

    /**
     * Dimensions available to pivot on, carrying their distinct value count in the loaded data.
     * Those already grouping the rows are left out. Those with a single value, which would only
     * repeat the row summary, or too many to read are disabled.
     */
    @computed
    get pivotByOptions(): SelectOption[] {
        const {dimensions, pivotCardinality} = this;
        return this.cubeGridModel.pivotModel.availableDimensions
            .filter(it => !dimensions.includes(it.name))
            .map(it => {
                const count = pivotCardinality[it.name] ?? 0;
                return {
                    value: it.name,
                    label: `${it.displayName} (${count})`,
                    displayName: it.displayName,
                    isDisabled: count < 2 || count > PIVOT_MAX_PATHS
                };
            });
    }

    /** Distinct value count per pivotable dimension, over the records currently loaded. */
    @computed
    private get pivotCardinality(): Record<string, number> {
        const sets: Record<string, Set<any>> = {};
        PIVOT_DIMENSIONS.forEach(name => (sets[name] = new Set()));
        this.cube.records.forEach(({data}) => {
            PIVOT_DIMENSIONS.forEach(name => sets[name].add(data[name]));
        });
        return mapValues(sets, it => it.size);
    }

    get pivotMeasureOptions(): SelectOption[] {
        const {measures, availableMeasures} = this.cubeGridModel.pivotModel;
        return availableMeasures.map(it => {
            const header = find(measures, {field: it.name})?.column?.headerName;
            return {value: it.name, label: isString(header) ? header : it.displayName};
        });
    }

    @computed
    get hasFilter(): boolean {
        return !!this.filterChooserModel.value;
    }

    get maxRowOptions() {
        return (
            XH.trackService.conf.maxRows?.options?.map(rowCount => ({
                value: rowCount,
                label: `${round(rowCount / 1000, 1)}k`
            })) ?? []
        );
    }

    get maxRows(): number {
        return this.formModel.values.maxRows;
    }

    /** True if data loaded from the server has been topped by maxRows. */
    @computed
    get maxRowsReached(): boolean {
        return this.maxRows === this.cube.store.allCount;
    }

    get viewManagerModel() {
        return getAppModel().viewManagerModels.activityTracking;
    }

    //-----------------------
    // ActivityDetailProvider
    //-----------------------
    readonly isActivityDetailProvider = true;

    /** Raw leaf-level log entries for the selected aggregate record, for detail. */
    @observableRef accessor trackLogs: PlainObject[] = [];

    private _monthFormat = 'MMM YYYY';

    constructor() {
        super();

        this.persistWith = {viewManagerModel: this.viewManagerModel};
        this.markPersist('showFilterChooser');

        this.formModel = this.createQueryFormModel();
        this.dateRangePickerModel = this.createDateRangePickerModel();

        this.dataFieldsEditorModel = new DataFieldsEditorModel(this);
        this.markPersist('dataFields');
        this.markPersist('pivotBy');
        this.markPersist('pivotMeasures');

        this.addReaction(
            {
                track: () => this.dataFields,
                run: () => this.createAndSetCoreModels(),
                fireImmediately: true
            },
            {
                track: () => this.query,
                run: () => this.loadAsync(),
                debounce: 100
            },
            {
                track: () => [
                    this.cubeGridModel,
                    this.dimensions,
                    this.pivotBy,
                    this.pivotMeasures
                ],
                run: () => this.syncQuery()
            },
            {
                track: () => this.cubeGridModel.selectedRecords,
                run: recs =>
                    (this.trackLogs = recs.flatMap(r => getCubeLeaves(r.raw as ViewRowData))),
                debounce: 100
            }
        );
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {enabled, cube, query} = this;
        if (!enabled) return;

        return this.runner({loadSpec})
            .span('load')
            .run(async ctx => {
                const data: PlainObject[] = await XH.postJson(
                    {
                        url: 'trackLogAdmin',
                        body: query
                    },
                    ctx
                );

                if (loadSpec.isStale) return;

                data.forEach(it => this.processRawTrackLog(it));
                await cube.loadDataAsync(data);
                await this.cubeGridModel.preSelectFirstAsync();
            })
            .catch(async e => {
                if (loadSpec.isStale || loadSpec.isAutoRefresh) return;
                await cube.clearAsync();
                XH.handleException(e);
            });
    }

    @action
    setDataFields(dataFields: ActivityTrackingDataFieldSpec[]) {
        if (!isEqual(dataFields, this.dataFields)) {
            this.dataFields = dataFields ?? [];
        }
    }

    /** Keeps the most recent picks, so a third choice replaces the oldest. */
    @action
    setPivotMeasures(measures: string[]) {
        this.pivotMeasures = takeRight(measures ?? [], PIVOT_MAX_MEASURES);
    }

    @action
    toggleFilterChooser() {
        this.showFilterChooser = !this.showFilterChooser;
    }

    getDisplayName(fieldName: string) {
        return fieldName ? (this.cube.store.getField(fieldName)?.displayName ?? fieldName) : null;
    }

    //------------------
    // Implementation
    //------------------
    private createQueryFormModel(): FormModel {
        return new FormModel({
            persistWith: {...this.persistWith, path: 'queryFormValues', includeFields: ['maxRows']},
            fields: [{name: 'maxRows', initialValue: XH.trackService.conf.maxRows?.default}]
        });
    }

    private createDateRangePickerModel(): DateRangePickerModel {
        return new DateRangePickerModel({
            persistWith: this.persistWith,
            presets: [
                'anchorDay',
                'prevDay',
                'prev7Days',
                'prev30Days',
                'prev90Days',
                'mtd',
                'prevMonth',
                'ytd'
            ],
            initialValue: 'anchorDay',
            // Track logs are stamped in the app time zone - follow its day, across midnight too.
            anchorDay: 'appDay'
        });
    }

    private cubeLabelComparator(valA, valB, sortDir, abs, {recordA, recordB, defaultComparator}) {
        const rawA = recordA?.raw,
            rawB = recordB?.raw,
            sortValA = this.getComparableValForDim(rawA, rawA?.cubeDimension),
            sortValB = this.getComparableValForDim(rawB, rawB?.cubeDimension);

        return defaultComparator(sortValA, sortValB);
    }

    private getComparableValForDim(raw, dim) {
        const rawVal = raw ? raw[dim] : null;
        if (rawVal == null) return null;

        switch (dim) {
            // Sort date desc by default
            case 'day':
                return rawVal.timestamp * -1;
            // Months are formatted "June 2020" strings - sort desc.
            case 'month':
                return moment(rawVal, this._monthFormat).valueOf() * -1;
            // Everything else can sort with its natural value.
            default:
                return rawVal;
        }
    }

    @computed
    private get query() {
        const {start, end} = this.dateRangePickerModel.currentRange;
        return {
            startDay: start,
            endDay: end,
            maxRows: this.formModel.values.maxRows,
            filters: this.filterChooserModel.value
        };
    }

    //------------------------
    // Impl - query
    //------------------------
    /**
     * Requery the view to match the grouping and pivot controls. The grid follows on its own, and
     * shows the path cap's error in its place if the pivot outgrows it.
     */
    private syncQuery() {
        this.cubeGridModel.view.updateQuery(this.queryConfig);
    }

    private get queryConfig(): QueryConfig {
        const {dimensions, pivotBy, pivotMeasures} = this,
            pivot =
                pivotBy && !dimensions.includes(pivotBy) && !isEmpty(pivotMeasures)
                    ? pivotBy
                    : null;

        return {
            dimensions,
            includeRoot: true,
            provideLeaves: true,
            pivot: pivot
                ? {dimensions: [pivot], measures: pivotMeasures, maxPivotPaths: PIVOT_MAX_PATHS}
                : null
        };
    }

    //------------------------
    // Impl - core data models
    //------------------------
    @action
    private createAndSetCoreModels() {
        this.cube = this.createCube();
        this.filterChooserModel = this.createFilterChooserModel();
        this.groupingChooserModel = this.createGroupingChooserModel();
        this.cubeGridModel = this.createCubeGridModel();
    }

    private createCube(): Cube {
        const fields = [
            Col.appEnvironment.field,
            Col.appVersion.field,
            Col.browser.field,
            Col.category.field,
            Col.clientAppCode.field,
            Col.correlationId.field,
            {name: 'count', type: 'int', aggregator: 'CHILD_COUNT'},
            Col.data.field,
            {...(Col.dateCreated.field as FieldSpec), displayName: 'Timestamp'},
            Col.day.field,
            Col.dayRange.field,
            Col.device.field,
            Col.errorName.field,
            {...(Col.elapsed.field as FieldSpec), displayName: 'Elapsed (avg)'},
            {...(Col.elapsedMax.field as FieldSpec), displayName: 'Elapsed (max)'},
            Col.entryCount.field,
            Col.impersonating.field,
            Col.instance.field,
            Col.loadId.field,
            Col.msg.field,
            {name: 'month', type: 'string', isDimension: true, aggregator: 'UNIQUE'},
            Col.severity.field,
            Col.tabId.field,
            Col.userAgent.field,
            Col.username.field,
            Col.url.field,
            Col.userAlertedFlag.field,
            Col.userMessageFlag.field,
            ...this.dataFields
        ] as CubeFieldSpec[];

        return new Cube({fields});
    }

    private createFilterChooserModel(): FilterChooserModel {
        // TODO - data fields?
        const ret = new FilterChooserModel({
            persistWith: {
                ...this.persistWith,
                // Faves persisted to local storage (vs trapped within a single VM view)
                persistFavorites: {localStorageKey: 'xhAdminActivityTabState'}
            },
            fieldSpecs: [
                {field: 'appEnvironment', displayName: 'Environment'},
                {field: 'appVersion'},
                {field: 'browser'},
                {field: 'category'},
                {field: 'correlationId'},
                {field: 'data'},
                {field: 'device'},
                {field: 'elapsed', fieldType: 'number', valueRenderer: elapsedRenderer},
                {field: 'instance'},
                {field: 'loadId'},
                {field: 'msg', displayName: 'Message'},
                {field: 'severity', values: ['DEBUG', 'INFO', 'WARN', 'ERROR']},
                {field: 'tabId'},
                {field: 'clientAppCode'},
                {field: 'userAgent'},
                {field: 'username', displayName: 'User'},
                {field: 'url', displayName: 'URL'}
            ]
        });

        // Load lookups - not awaited
        this.runner()
            .span('lookups')
            .run(async ctx => {
                const lookups = await XH.fetchJson({url: 'trackLogAdmin/lookups'}, ctx);
                if (ret !== this.filterChooserModel) return;
                ret.fieldSpecs.forEach(spec => {
                    const {field} = spec,
                        lookup = lookups[field] ? compact(lookups[field]) : null;

                    if (!isEmpty(lookup)) {
                        spec.values = lookup;
                        spec.enableValues = true;
                        spec.hasExplicitValues = true;
                    }
                });
            })
            .catchDefault({title: 'Error loading lookups for filtering'});

        return ret;
    }

    private createGroupingChooserModel(): GroupingChooserModel {
        return new GroupingChooserModel({
            persistWith: {
                ...this.persistWith,
                // Faves persisted to local storage (vs trapped within a single VM view)
                persistFavorites: {localStorageKey: 'xhAdminActivityTabState'}
            },
            dimensions: this.cube.dimensions,
            initialValue: ['username', 'category']
        });
    }

    private createCubeGridModel(): CubeGridModel {
        const hidden = true;
        return new CubeGridModel({
            cube: this.cube,
            query: this.queryConfig,
            columns: [
                {
                    field: 'cubeLabel',
                    headerName: 'Group',
                    chooserName: 'Group',
                    minWidth: 100,
                    autosizeMaxWidth: 400,
                    isTreeColumn: true,
                    comparator: this.cubeLabelComparator.bind(this)
                },
                {...Col.username, hidden},
                {...Col.category, hidden},
                {...Col.device, hidden},
                {...Col.browser, hidden},
                {...Col.userAgent, hidden},
                {...Col.impersonating, hidden},
                {...Col.elapsed, hidden},
                {...Col.elapsedMax, hidden},
                {...Col.dayRange, hidden},
                {...Col.entryCount},
                {field: 'count', chooserGroup: 'Core Data', hidden},
                {...Col.appEnvironment, hidden},
                {...Col.appVersion, hidden},
                {...Col.clientAppCode, hidden},
                {...Col.loadId, hidden},
                {...Col.tabId, hidden},
                {...Col.url, hidden},
                {...Col.instance, hidden},
                {...Col.errorName, hidden},
                {...Col.userAlertedFlag, hidden},
                ...this.dataFieldCols.map(it => ({...it, hidden: !it.appData.showInAggGrid}))
            ],
            gridConfig: {
                showSummary: 'top',
                persistWith: {...this.persistWith, path: 'aggGrid'},
                selModel: 'multiple',
                enableExport: true,
                colChooserModel: {height: 450},
                treeStyle: TreeStyle.HIGHLIGHTS_AND_BORDERS,
                autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
                exportOptions: {filename: exportFilename('activity-summary')},
                emptyText: 'No activity reported.',
                sortBy: ['cubeLabel'],
                expandLevel: 1
            },
            pivotConfig: {
                dimensions: PIVOT_DIMENSIONS.map(field => ({field})),
                dimensionDefaults: {showSummary: true},
                measures: [
                    {field: 'entryCount', column: {width: 80}},
                    {field: 'elapsed', column: {width: 100, renderer: elapsedRenderer}},
                    {field: 'elapsedMax', column: {width: 100, renderer: elapsedRenderer}}
                ]
            }
        });
    }

    //------------------------------
    // Impl - data fields processing
    //------------------------------
    private processRawTrackLog(raw: PlainObject) {
        try {
            raw.day = LocalDate.from(raw.day);
            raw.month = raw.day.format(this._monthFormat);
            raw.dayRange = {min: raw.day, max: raw.day};

            // Workaround lack of support for multiple aggregations on the same field.
            raw.elapsedMax = raw.elapsed;

            const data = JSON.parse(raw.data);
            if (!isEmpty(data)) {
                raw.userMessage = get(data, 'userMessage');
                raw.userAlerted = get(data, 'userAlerted');
                raw.errorName = get(data, 'error.name');

                this.dataFields.forEach(df => {
                    const path = df.path;
                    raw[df.name] = get(data, path);
                });
            }
        } catch (e) {
            this.logError(`Error processing raw track log`, e);
        }
    }

    private getDfRenderer(df: ActivityTrackingDataFieldSpec): ColumnRenderer {
        switch (df.type) {
            case 'number':
                return numberRenderer();
            case 'date':
                return dateTimeSecRenderer();
            case 'localDate':
                return dateRenderer();
            default:
                return v => v ?? '-';
        }
    }
}

/** Dimensions offered for pivoting, in menu order - those with a bounded set of values. */
const PIVOT_DIMENSIONS = [
    'day',
    'month',
    'appEnvironment',
    'appVersion',
    'browser',
    'category',
    'clientAppCode',
    'device',
    'errorName',
    'instance',
    'severity',
    'username'
];

/** Widest pivot offered - beyond this the grid is unreadable long before it is slow. */
const PIVOT_MAX_PATHS = 30;

/** Measures per pivot value - each one multiplies the column count. */
const PIVOT_MAX_MEASURES = 2;
