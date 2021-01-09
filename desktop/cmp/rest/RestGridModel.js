/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {isFunction} from 'lodash';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon/Icon';
import {pluralize, throwIf} from '@xh/hoist/utils/js';
import {filter, isPlainObject, pickBy} from 'lodash';
import {RestStore} from './data/RestStore';
import {RestFormModel} from './impl/RestFormModel';

export const addAction = {
    text: 'Add',
    icon: Icon.add(),
    intent: 'success',
    actionFn: ({gridModel}) => gridModel.restGridModel.addRecord()
};

export const editAction = {
    text: 'Edit',
    icon: Icon.edit(),
    intent: 'primary',
    recordsRequired: 1,
    actionFn: ({record, gridModel}) => gridModel.restGridModel.editRecord(record)
};

export const viewAction = {
    text: 'View',
    icon: Icon.search(),
    recordsRequired: 1,
    actionFn: ({record, gridModel}) => gridModel.restGridModel.viewRecord(record)
};

export const cloneAction = {
    text: 'Clone',
    icon: Icon.copy(),
    recordsRequired: 1,
    actionFn: ({record, gridModel}) => {
        gridModel.restGridModel.cloneRecord(record);
    }
};

export const deleteAction = {
    text: 'Delete',
    icon: Icon.delete(),
    intent: 'danger',
    recordsRequired: true,
    displayFn: ({record}) => ({
        hidden: record && record.id === null // Hide this action if we are acting on a "new" record
    }),
    actionFn: ({gridModel}) => gridModel.restGridModel.confirmDeleteRecords()
};

/**
 * Core Model for a RestGrid.
 */
@HoistModel
@LoadSupport
export class RestGridModel {

    //----------------
    // Properties
    //----------------
    /** @member {boolean} */
    readonly;

    /** @member {RestGridEditor[]} */
    editors;

    toolbarActions;
    menuActions;
    formActions;

    actionWarning = {
        add: null,
        edit: null,
        del: (recs) => (recs.length > 1 ?
            `Are you sure you want to delete the selected ${recs.length} ${pluralize(this.unit)}?` :
            `Are you sure you want to delete the selected ${this.unit}?`)
    };

    prepareCloneFn;

    unit;
    filterFields = null;

    /** @member {GridModel} */
    @managed
    gridModel = null;

    /** @member {RestFormModel} */
    @managed
    formModel = null;

    /** @return {RestStore} */
    get store() {return this.gridModel.store}
    /** @return {StoreSelectionModel} */
    get selModel() {return this.gridModel.selModel}
    /** @return {Record[]} */
    get selection() {return this.gridModel.selection}
    /** @return {Record} */
    get selectedRecord() {return this.gridModel.selectedRecord}

    /**
     * @param {boolean} [readonly] - Prevent users from creating, updating, or destroying a record. Defaults to false.
     * @param {Object[]|RecordAction[]} [toolbarActions] - actions to display in the toolbar. Defaults to add, edit, delete.
     * @param {Object[]|RecordAction[]} [menuActions] - actions to display in the grid context menu. Defaults to add, edit, delete.
     * @param {Object[]|RecordAction[]} [formActions] - actions to display in the form toolbar. Defaults to delete.
     * @param {Object} [actionWarning] - map of action (e.g. 'add'/'edit'/'del') to string or a fn to create one. See default prop.
     *      Function will be passed an array of selected records to be acted upon.
     * @param {string} [unit] - name that describes records in this grid.
     * @param {string[]} [filterFields] - Names of fields to include in this grid's quick filter logic.
     * @param {PrepareCloneFn} [prepareCloneFn] - called prior to passing the original record and cloned record to the editor form
     * @param {RestGridEditor[]} editors - specifications for fields to be displayed in editor form.
     * @param {*} ...rest - arguments for GridModel.
     */
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
        store,
        ...rest
    }) {
        this.readonly = readonly;
        this.editors = editors;
        this.toolbarActions = toolbarActions;
        this.menuActions = menuActions;
        this.formActions = formActions;

        this.actionWarning = Object.assign(this.actionWarning, actionWarning);

        this.prepareCloneFn = prepareCloneFn;

        this.unit = unit;
        this.filterFields = filterFields;

        this.gridModel = new GridModel({
            contextMenu: [...this.menuActions, '-', ...GridModel.defaultContextMenu],
            exportOptions: {filename: pluralize(unit)},
            restGridModel: this,
            store: this.parseStore(store),
            enableExport: true,
            ...rest
        });

        this.formModel = new RestFormModel(this);
    }

    /** Load the underlying store. */
    doLoadAsync(loadSpec) {
        return this.store.loadAsync(loadSpec);
    }

    /** Load the underlying store. */
    loadData(...args) {
        return this.store.loadData(...args);
    }

    //-----------------
    // Actions
    //------------------
    addRecord() {
        this.formModel.openAdd();
    }

    cloneRecord(record) {
        const editableFields = filter(record.fields, 'editable').map(it => it.name),
            clone = pickBy(record.data, (v, k) => editableFields.includes(k));
        const {prepareCloneFn} = this;
        if (prepareCloneFn) prepareCloneFn({record, clone});
        this.formModel.openClone(clone);
    }

    async deleteRecordAsync(record) {
        throwIf(this.readonly, 'Record not deleted: this grid is read-only');
        return this.store.deleteRecordAsync(record)
            .then(() => this.formModel.close())
            .linkTo(this.loadModel)
            .catchDefault();
    }

    async bulkDeleteRecordsAsync(records) {
        throwIf(this.readonly, 'Records not deleted: this grid is read-only');
        return this.store.bulkDeleteRecordsAsync(records)
            .then(resp => {
                const intent = resp.fail > 0 ? 'warning' : 'success',
                    message = `Deleted ${resp.success} ${pluralize(this.unit)} with ${resp.fail} failures`;

                XH.toast({intent, message});
            })
            .linkTo(this.loadModel)
            .catchDefault();
    }

    editRecord(record) {
        this.formModel.openEdit(record);
    }

    viewRecord(record) {
        this.formModel.openView(record);
    }

    confirmDeleteRecords() {
        const records = this.selection,
            warning = this.actionWarning.del,
            delFn = () => records.length > 1 ? this.bulkDeleteRecordsAsync(records) : this.deleteRecordAsync(records[0]);

        if (!warning) {
            delFn();
        } else {
            const message = isFunction(warning) ? warning(records) : warning;
            XH.confirm({
                message,
                title: 'Warning',
                icon: Icon.warning({size: 'lg'}),
                onConfirm: delFn
            });
        }
    }

    async exportAsync(...args) {
        return this.gridModel.exportAsync(...args);
    }

    //-----------------
    // Implementation
    //-----------------
    parseStore(store) {
        return isPlainObject(store) ? this.markManaged(new RestStore(store)) : store;
    }
}

/**
 * @typedef {Object} RestGridEditor
 * @property {string} field - name of field to appear in the editor form - should match name of a
 *      Store Field configured for this RestGridModel.
 * @property {Object} formField - partial config for FormField to be used to display this field.
 *      Can be used to specify or customize the input used for editing/displaying this Field.
 * @property {Object} [fieldModel] - partial config for underlying FieldModel to be used for
 *      form display. Can be used for to specify additional validation requirements.
 */

/**
 * @callback PrepareCloneFn
 * @param {Object} input
 * @param {input.record} original record from the REST grid
 * @param {input.clone} cloned record that is used to populate the editor form
 */
