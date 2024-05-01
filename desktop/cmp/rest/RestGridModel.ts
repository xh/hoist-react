/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {RowDoubleClickedEvent} from '@ag-grid-community/core';
import {BaseFieldConfig} from '@xh/hoist/cmp/form';
import {GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {PrintSupportConfig} from '@xh/hoist/cmp/printsupport';
import {HoistModel, managed, PlainObject, ElementSpec, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {RecordAction, RecordActionSpec, StoreRecord} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon/Icon';
import {pluralize, throwIf, withDefault} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';
import {RestStore, RestStoreConfig} from './data/RestStore';
import {RestFormModel} from './impl/RestFormModel';
import {FormFieldProps} from '../form';
import {addAction, deleteAction, editAction, viewAction} from './Actions';
import {ExportOptions} from '@xh/hoist/svc';

export interface RestGridConfig extends GridConfig {
    store?: RestStore | RestStoreConfig;

    /** Prevent users from creating, updating, or destroying a record. Defaults to false. */
    readonly?: boolean;

    /** Actions to display in the toolbar. Defaults to add, edit, delete. */
    toolbarActions?: Array<RecordAction | RecordActionSpec>;

    /** actions to display in the grid context menu. Defaults to add, edit, delete. */
    menuActions?: Array<RecordAction | RecordActionSpec>;

    /** Actions to display in the form toolbar. Defaults to delete. */
    formActions?: Array<RecordAction | RecordActionSpec>;

    /** Warning to display before actions on a selection of  records. */
    actionWarning?: {
        add?: string | ((recs: StoreRecord[]) => string);
        del?: string | ((recs: StoreRecord[]) => string);
        edit?: string | ((recs: StoreRecord[]) => string);
    };

    /** Name that describes records in this grid. */
    unit?: string;

    /** Names of fields to include in this grid's quick filter logic. */
    filterFields?: string[];

    /** Called prior to passing the original record and cloned record to the editor form. */
    prepareCloneFn?: (input: {record: StoreRecord; clone: PlainObject}) => void;

    /** Specifications for fields to be displayed in editor form. */
    editors?: RestGridEditor[];

    /** Callback to call when a row is double-clicked. */
    onRowDoubleClicked?: (e: RowDoubleClickedEvent) => void;

    /**
     * Set to true to enable printing support for this restgrid, or provide a
     * config to further configure. Default false.
     */
    printSupport?: boolean | PrintSupportConfig;
}

export interface RestGridEditor {
    /**
     *  Name of field to appear in the editor form - should match name of a Store Field
     *  configured for this RestGridModel.
     */
    field: string;

    /**
     * Partial config for FormField to be used to display this field.  Can be used to specify or
     * customize the input used for editing/displaying this Field.
     */
    formField?: ElementSpec<Partial<FormFieldProps>>;

    /**
     * Partial config for underlying FieldModel to be used for form display. Can be used to
     * specify additional validation requirements.
     */
    fieldModel?: Partial<BaseFieldConfig>;

    /**
     * True to omit this field from the editor form.  Can also be a function that returns true to
     * omit the field based on the current field value and the parent RestFormModel.
     */
    omit?: boolean | ((fieldValue: unknown, model: RestFormModel) => boolean);
}

/**
 * Core Model for a RestGrid.
 */
export class RestGridModel extends HoistModel {
    declare config: RestGridConfig;

    //----------------
    // Properties
    //----------------
    readonly: boolean;
    editors: RestGridEditor[];
    toolbarActions: Array<RecordAction | RecordActionSpec>;
    menuActions: Array<RecordAction | RecordActionSpec>;
    formActions: Array<RecordAction | RecordActionSpec>;
    prepareCloneFn: (input: {record: StoreRecord; clone: PlainObject}) => void;
    unit: string;
    filterFields: string[] = null;

    actionWarning: RestGridConfig['actionWarning'] = {
        add: null,
        edit: null,
        del: recs =>
            recs.length > 1
                ? `Are you sure you want to delete the selected ${recs.length} ${pluralize(
                      this.unit
                  )}?`
                : `Are you sure you want to delete the selected ${this.unit}?`
    };

    @managed gridModel: GridModel = null;
    @managed formModel: RestFormModel = null;

    get store() {
        return this.gridModel.store as RestStore;
    }
    get selModel() {
        return this.gridModel.selModel;
    }
    get selectedRecords() {
        return this.gridModel.selectedRecords;
    }
    get selectedRecord() {
        return this.gridModel.selectedRecord;
    }

    print() {
        if (!this.hasPrintSupport || this.gridModel.isPrinting) return;

        this.gridModel.printSupportModel.toggleIsPrinting();
    }

    get hasPrintSupport(): boolean {
        return !!this.gridModel.hasPrintSupport;
    }

    constructor({
        readonly = false,
        toolbarActions = !readonly ? [addAction, editAction, deleteAction] : [viewAction],
        menuActions = !readonly ? [addAction, editAction, deleteAction] : [viewAction],
        formActions = !readonly ? [deleteAction] : [],
        actionWarning,
        prepareCloneFn,
        unit = 'record',
        filterFields,
        editors = [],
        onRowDoubleClicked,
        printSupport,
        store,
        appData,
        ...rest
    }: RestGridConfig) {
        super();
        this.readonly = readonly;
        this.editors = editors;
        this.toolbarActions = toolbarActions;
        this.menuActions = menuActions;
        this.formActions = formActions;

        this.actionWarning = Object.assign(this.actionWarning, actionWarning);

        this.prepareCloneFn = prepareCloneFn;

        this.unit = unit;
        this.filterFields = filterFields;

        onRowDoubleClicked = withDefault(onRowDoubleClicked, row => {
            if (!row.data) return;

            this.readonly ? this.formModel.openView(row.data) : this.formModel.openEdit(row.data);
        });

        this.gridModel = new GridModel({
            contextMenu: [...this.menuActions, '-', ...GridModel.defaultContextMenu],
            exportOptions: {filename: pluralize(unit)},
            store: this.parseStore(store),
            enableExport: true,
            onRowDoubleClicked,
            appData: {restGridModel: this, ...appData},
            xhImpl: true,
            printSupport,
            ...rest
        });

        this.formModel = new RestFormModel(this);
    }

    /** Load the underlying store. */
    override async doLoadAsync(loadSpec) {
        return this.store.loadAsync(loadSpec);
    }

    /** Load the underlying store. */
    loadData(rawData: PlainObject[], rawSummaryData?: PlainObject) {
        return this.store.loadData(rawData, rawSummaryData);
    }

    //-----------------
    // Actions
    //------------------
    addRecord() {
        this.formModel.openAdd();
    }

    cloneRecord(record: StoreRecord) {
        const clone = this.store.editableDataForRecord(record);
        this.prepareCloneFn?.({record, clone});
        this.formModel.openClone(clone);
    }

    async deleteRecordAsync(record: StoreRecord) {
        throwIf(this.readonly, 'Record not deleted: this grid is read-only');
        return this.store
            .deleteRecordAsync(record)
            .then(() => this.formModel.close())
            .linkTo(this.loadModel)
            .catchDefault();
    }

    async bulkDeleteRecordsAsync(records: StoreRecord[]) {
        throwIf(this.readonly, 'Records not deleted: this grid is read-only');
        return this.store
            .bulkDeleteRecordsAsync(records)
            .then(resp => {
                const intent = resp.fail > 0 ? 'warning' : 'success',
                    message = `Deleted ${resp.success} ${pluralize(this.unit)} with ${
                        resp.fail
                    } failures`;

                XH.toast({intent, message});
            })
            .linkTo(this.loadModel)
            .catchDefault();
    }

    editRecord(record: StoreRecord) {
        this.formModel.openEdit(record);
    }

    viewRecord(record: StoreRecord) {
        this.formModel.openView(record);
    }

    confirmDeleteRecords() {
        const records = this.selectedRecords,
            delFn = () =>
                records.length > 1
                    ? this.bulkDeleteRecordsAsync(records)
                    : this.deleteRecordAsync(records[0]),
            warning = this.actionWarning.del,
            message = isFunction(warning) ? warning(records) : warning;

        message
            ? XH.confirm({message, title: 'Warning', icon: Icon.warning(), onConfirm: delFn})
            : delFn();
    }

    async exportAsync(options?: ExportOptions) {
        return this.gridModel.exportAsync(options);
    }

    //-----------------
    // Implementation
    //-----------------
    private parseStore(store: RestStore | RestStoreConfig) {
        return store instanceof RestStore ? store : this.markManaged(new RestStore(store));
    }
}
