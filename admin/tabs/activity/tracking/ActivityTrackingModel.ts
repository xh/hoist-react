/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilename, getAppModel} from '@xh/hoist/admin/AdminUtils';
import * as Col from '@xh/hoist/admin/columns';
import {elapsedRenderer} from '@xh/hoist/admin/columns';
import {
    ActivityTrackingDataFieldSpec,
    DataFieldsEditorModel
} from '@xh/hoist/admin/tabs/activity/tracking/datafields/DataFieldsEditorModel';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {FormModel} from '@xh/hoist/cmp/form';
import {ColumnRenderer, ColumnSpec, GridModel, TreeStyle} from '@xh/hoist/cmp/grid';
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {HoistModel, LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {Cube, CubeFieldSpec, FieldSpec, StoreRecord} from '@xh/hoist/data';
import {dateRenderer, dateTimeSecRenderer, numberRenderer} from '@xh/hoist/format';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {compact, get, isEmpty, isEqual, round} from 'lodash';
import moment from 'moment';
import {ActivityDetailProvider} from './detail/ActivityDetailModel';

export class ActivityTrackingModel extends HoistModel implements ActivityDetailProvider {
    /** FormModel for server-side querying controls. */
    @managed formModel: FormModel;

    /** Models for data-handling components - can be rebuilt due to change in dataFields. */
    @managed @observable.ref groupingChooserModel: GroupingChooserModel;
    @managed @observable.ref cube: Cube;
    @managed @observable.ref filterChooserModel: FilterChooserModel;
    @managed @observable.ref gridModel: GridModel;
    @managed dataFieldsEditorModel: DataFieldsEditorModel;

    /**
     * Optional spec for fields to be extracted from additional `data` returned by track entries
     * and promoted to top-level columns in the grids. Supports dot-delimited paths as names.
     */
    @observable.ref dataFields: ActivityTrackingDataFieldSpec[] = [];

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

    @observable showFilterChooser: boolean = false;

    get enabled(): boolean {
        return XH.trackService.enabled;
    }

    get dimensions(): string[] {
        return this.groupingChooserModel.value;
    }

    get endDay(): LocalDate {
        return this.formModel.values.endDay;
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
    @observable.ref trackLogs: PlainObject[] = [];

    private _monthFormat = 'MMM YYYY';

    constructor() {
        super();
        makeObservable(this);

        this.persistWith = {viewManagerModel: this.viewManagerModel};
        this.markPersist('showFilterChooser');

        this.formModel = this.createQueryFormModel();

        this.dataFieldsEditorModel = new DataFieldsEditorModel(this);
        this.markPersist('dataFields');

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
                track: () => [this.cube.records, this.dimensions],
                run: () => this.loadGridAsync(),
                debounce: 100
            },
            {
                track: () => this.gridModel.selectedRecords,
                run: recs => (this.trackLogs = this.getAllLeafRows(recs)),
                debounce: 100
            }
        );
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {enabled, cube, query} = this;
        if (!enabled) return;

        try {
            const data = await XH.postJson({
                url: 'trackLogAdmin',
                body: query,
                loadSpec
            });

            data.forEach(it => this.processRawTrackLog(it));

            await cube.loadDataAsync(data);
        } catch (e) {
            await cube.clearAsync();
            XH.handleException(e);
        }
    }

    @action
    setDataFields(dataFields: ActivityTrackingDataFieldSpec[]) {
        if (!isEqual(dataFields, this.dataFields)) {
            this.dataFields = dataFields ?? [];
        }
    }

    @action
    toggleFilterChooser() {
        this.showFilterChooser = !this.showFilterChooser;
    }

    adjustDates(dir: 'add' | 'subtract') {
        const {startDay, endDay} = this.formModel.fields,
            appDay = LocalDate.currentAppDay(),
            start: LocalDate = startDay.value,
            end: LocalDate = endDay.value,
            diff = end.diff(start),
            incr = diff + 1;

        let newStart = start[dir](incr),
            newEnd = end[dir](incr);

        if (newEnd > appDay) {
            newStart = appDay.subtract(Math.abs(diff));
            newEnd = appDay;
        }

        startDay.setValue(newStart);
        endDay.setValue(newEnd);
    }

    // Set the start date by taking the end date and pushing back [value] [units] - then pushing
    // forward one day as the day range query is inclusive.
    adjustStartDate(value, unit) {
        this.formModel.setValues({
            startDay: this.endDay.subtract(value, unit).nextDay()
        });
    }

    isInterval(value, unit) {
        const {startDay, endDay} = this.formModel.values;
        return startDay === endDay.subtract(value, unit).nextDay();
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
            fields: [
                {name: 'startDay', initialValue: () => LocalDate.currentAppDay()},
                {name: 'endDay', initialValue: () => LocalDate.currentAppDay()},
                {name: 'maxRows', initialValue: XH.trackService.conf.maxRows?.default}
            ]
        });
    }

    private async loadGridAsync() {
        const {cube, gridModel, dimensions} = this,
            data = cube.executeQuery({
                dimensions,
                includeRoot: true,
                includeLeaves: true
            });

        data.forEach(node => this.separateLeafRows(node));
        gridModel.loadData(data);
        await gridModel.preSelectFirstAsync();
    }

    // Cube emits leaves in "children" collection - rename that collection to "leafRows" so we can
    // carry the leaves with the record, but deliberately not show them in the tree grid. We only
    // want the tree grid to show aggregate records.
    private separateLeafRows(node) {
        if (isEmpty(node.children)) return;

        const childrenAreLeaves = !node.children[0].children;
        if (childrenAreLeaves) {
            node.leafRows = node.children;
            delete node.children;
        } else {
            node.children.forEach(child => this.separateLeafRows(child));
        }
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
        const {values} = this.formModel;
        return {
            startDay: values.startDay,
            endDay: values.endDay,
            maxRows: values.maxRows,
            filters: this.filterChooserModel.value
        };
    }

    // Extract all leaf, track-entry-level rows from an aggregate record (at any level).
    private getAllLeafRows(aggRecs: StoreRecord[], ret = []): PlainObject[] {
        if (isEmpty(aggRecs)) return [];

        aggRecs.forEach(aggRec => {
            if (aggRec.children.length) {
                this.getAllLeafRows(aggRec.children, ret);
            } else if (aggRec.raw.leafRows) {
                aggRec.raw.leafRows.forEach(leaf => {
                    ret.push({...leaf});
                });
            }
        });

        return ret;
    }

    //------------------------
    // Impl - core data models
    //------------------------
    @action
    private createAndSetCoreModels() {
        this.cube = this.createCube();
        this.filterChooserModel = this.createFilterChooserModel();
        this.groupingChooserModel = this.createGroupingChooserModel();
        this.gridModel = this.createGridModel();
    }

    private createCube(): Cube {
        const fields = [
            Col.appEnvironment.field,
            Col.appVersion.field,
            Col.browser.field,
            Col.category.field,
            Col.correlationId.field,
            {name: 'count', type: 'int', aggregator: 'CHILD_COUNT'},
            Col.data.field,
            {...(Col.dateCreated.field as FieldSpec), displayName: 'Timestamp'},
            Col.day.field,
            Col.dayRange.field,
            Col.device.field,
            Col.errorName.field,
            Col.elapsed.field,
            Col.elapsedMax.field,
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
                {field: 'userAgent'},
                {field: 'username', displayName: 'User'},
                {field: 'url', displayName: 'URL'}
            ]
        });

        // Load lookups - not awaited
        try {
            XH.fetchJson({url: 'trackLogAdmin/lookups'}).then(lookups => {
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
            });
        } catch (e) {
            XH.handleException(e, {title: 'Error loading lookups for filtering'});
        }

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

    private createGridModel(): GridModel {
        const hidden = true;
        return new GridModel({
            persistWith: {...this.persistWith, path: 'aggGrid'},
            selModel: 'multiple',
            enableExport: true,
            treeMode: true,
            colChooserModel: {height: 450},
            treeStyle: TreeStyle.HIGHLIGHTS_AND_BORDERS,
            autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
            exportOptions: {filename: exportFilename('activity-summary')},
            emptyText: 'No activity reported...',
            sortBy: ['cubeLabel'],
            columns: [
                {
                    field: {
                        name: 'cubeLabel',
                        type: 'string',
                        displayName: 'Group'
                    },
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
                {...Col.elapsed, displayName: 'Elapsed (avg)', hidden},
                {...Col.elapsedMax, displayName: 'Elapsed (max)', hidden},
                {...Col.dayRange, hidden},
                {...Col.entryCount},
                {field: 'count', chooserGroup: 'Core Data', hidden},
                {...Col.appEnvironment, hidden},
                {...Col.appVersion, hidden},
                {...Col.loadId, hidden},
                {...Col.tabId, hidden},
                {...Col.url, hidden},
                {...Col.instance, hidden},
                {...Col.errorName, hidden},
                {...Col.userAlertedFlag, hidden},
                ...this.dataFieldCols.map(it => ({...it, hidden: !it.appData.showInAggGrid}))
            ]
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
