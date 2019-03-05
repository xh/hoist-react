/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed, LoadSupport} from '@xh/hoist/core';
import {action} from '@xh/hoist/mobx';
import {GridModel} from '@xh/hoist/cmp/grid';
import {StoreContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {pluralize, throwIf} from '@xh/hoist/utils/js';
import {Icon} from '@xh/hoist/icon/Icon';

import {RestFormModel} from './impl/RestFormModel';
import {PendingTaskModel} from '@xh/hoist/utils/async';

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

export const deleteAction = {
    text: 'Delete',
    icon: Icon.delete(),
    intent: 'danger',
    recordsRequired: 1,
    displayFn: ({record}) => ({
        hidden: record && record.id === null // Hide this action if we are acting on a "new" record
    }),
    actionFn: ({record, gridModel}) => gridModel.restGridModel.confirmDeleteRecord(record)
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
    readonly;

    editors;
    toolbarActions;
    menuActions;
    formActions;

    actionWarning = {
        add: null,
        edit: null,
        del: 'Are you sure you want to delete the selected record?'
    };

    unit = null;
    filterFields = null;

    @managed
    gridModel = null;

    @managed
    formModel = null;

    @managed
    loadModel = new PendingTaskModel();

    get store() {return this.gridModel.store}

    get selModel() {return this.gridModel.selModel}

    get selection() {return this.gridModel.selection}

    get selectedRecord() {return this.gridModel.selectedRecord}

    /**
     * @param {boolean} [readonly] - Prevent users from creating, updating, or destroying a record. Defaults to false.
     * @param {Object[]|RecordAction[]} [toolbarActions] - actions to display in the toolbar. Defaults to add, edit, delete.
     * @param {Object[]|RecordAction[]} [menuActions] - actions to display in the grid context menu. Defaults to add, edit, delete.
     * @param {Object[]|RecordAction[]} [formActions] - actions to display in the form toolbar. Defaults to delete.
     * @param {Object} [actionWarning] - map of action (e.g. 'add'/'edit'/'delete') to string.  See default prop.
     * @param {string} [unit] - name that describes records in this grid.
     * @param {string[]} [filterFields] - Names of fields to include in this grid's quick filter logic.
     * @param {function} [enhanceToolbar] - a function used to mutate RestGridToolbar items
     * @param {RestGridEditor[]} editors - specifications for fields to be displayed in editor form.
     * @param {*} ...rest - arguments for GridModel.
     */
    constructor({
        readonly = false,
        toolbarActions = !readonly ? [addAction, editAction, deleteAction] : [viewAction],
        menuActions = !readonly ? [addAction, editAction, deleteAction] : [viewAction],
        formActions = !readonly ? [deleteAction] : [],
        actionWarning,
        unit = 'record',
        filterFields,
        enhanceToolbar,
        editors = [],
        ...rest
    }) {
        this.readonly = readonly;
        this.editors = editors;
        this.toolbarActions = toolbarActions;
        this.menuActions = menuActions;
        this.formActions = formActions;

        this.actionWarning = Object.assign(this.actionWarning, actionWarning);

        this.unit = unit;
        this.filterFields = filterFields;
        this.enhanceToolbar = enhanceToolbar;

        this.gridModel = new GridModel({
            contextMenuFn: this.contextMenuFn,
            exportOptions: {filename: pluralize(unit)},
            restGridModel: this,
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
    @action
    addRecord() {
        this.formModel.openAdd();
    }

    @action
    deleteSelection() {
        const record = this.selectedRecord;
        if (record) this.deleteRecord(record);
    }

    @action
    deleteRecord(record) {
        throwIf(this.readonly, 'Record not deleted: this grid is read-only');
        this.store.deleteRecordAsync(record)
            .then(() => this.formModel.close())
            .catchDefault();
    }

    @action
    editSelection() {
        const record = this.selectedRecord;
        if (record) this.editRecord(record);
    }

    @action
    editRecord(record) {
        this.formModel.openEdit(record);
    }

    @action
    viewRecord(record) {
        this.formModel.openView(record);
    }

    contextMenuFn = () => {
        return new StoreContextMenu({
            items: [
                ...this.menuActions,
                '-',
                ...GridModel.defaultContextMenuTokens
            ],
            gridModel: this.gridModel
        });
    };

    confirmDeleteSelection() {
        const record = this.selectedRecord;
        if (record) this.confirmDeleteRecord(record);
    }

    confirmDeleteRecord(record) {
        const warning = this.actionWarning.del;
        if (warning) {
            XH.confirm({
                message: warning,
                title: 'Warning',
                icon: Icon.warning({size: 'lg'}),
                onConfirm: () => this.deleteRecord(record)
            });
        } else {
            this.deleteRecord(record);
        }
    }

    async exportAsync(...args) {
        return this.gridModel.exportAsync(...args);
    }
}

/**
 * @typedef {Object} RestGridEditor
 * @property {String} field - name of field to appear in the editor form.  Should correspond to member in
 *      the store's Fields collection.
 * @property {Object} formField - partial config for FormField to be used to display this field.  Used to specify
 *      control to be used for this Field.
 * @property {Object} [fieldModel] - partial config for underlying FieldModel to be used for form display.
 *      May be used for to specify additional validation requirements.
 */