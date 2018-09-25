/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action} from '@xh/hoist/mobx';
import {GridModel} from '@xh/hoist/desktop/cmp/grid';
import {StoreContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {actionCol} from '@xh/hoist/desktop/columns';
import {Icon} from '@xh/hoist/icon';
import {pluralize} from '@xh/hoist/utils/js';

import {RestFormModel} from './RestFormModel';

/**
 * Core Model for a RestGrid.
 */
@HoistModel
export class RestGridModel {

    //----------------
    // Properties
    //----------------
    actionEnabled = {
        add: true,
        edit: true,
        del: true
    };

    actionWarning = {
        add: null,
        edit: null,
        del: 'Are you sure you want to delete the selected record?'
    };

    actionLocation;

    editAction = {
        text: 'Edit',
        icon: Icon.edit(),
        intent: 'primary',
        actionFn: (item, record) => this.editRecord(record),
        recordsRequired: 1
    };

    deleteAction = {
        text: 'Delete',
        icon: Icon.delete(),
        intent: 'danger',
        actionFn: (item, record) => this.confirmDeleteRecord(record),
        recordsRequired: true
    };

    unit = null;
    filterFields = null;

    gridModel = null;
    formModel = null;

    get store() {return this.gridModel.store}

    get selModel() {return this.gridModel.selModel}

    get selection() {return this.gridModel.selection}

    get selectedRecord() {return this.gridModel.selectedRecord}

    /**
     * @param {Object} [actionEnabled] - map of action (e.g. 'add'/'edit'/'delete') to boolean  See default prop
     * @param {Object} [actionWarning] - map of action (e.g. 'add'/'edit'/'delete') to string.  See default prop.
     * @param {Object} [actionColEnabled] - whether an action column with edit and delete buttons should be added to the grid.
     * @param {string} [unit] - name that describes records in this grid.
     * @param {string[]} [filterFields] - Names of fields to include in this grid's quick filter logic.
     * @param {function} [enhanceToolbar] - a function used to mutate RestGridToolbar items
     * @param {Object[]} editors - array of editors
     * @param {*} ...rest, arguments for GridModel.
     */
    constructor({
        actionEnabled,
        actionWarning,
        actionColEnabled,
        unit = 'record',
        filterFields,
        enhanceToolbar,
        editors = [],
        columns,
        ...rest
    }) {
        this.actionEnabled = Object.assign(this.actionEnabled, actionEnabled);
        this.actionWarning = Object.assign(this.actionWarning, actionWarning);
        this.actionColEnabled = actionColEnabled;
        this.unit = unit;
        this.filterFields = filterFields;
        this.enhanceToolbar = enhanceToolbar;

        const cols = [];
        if (actionColEnabled && (this.actionEnabled.edit || this.actionEnabled.del)) {
            cols.push({
                ...actionCol,
                width: this.actionEnabled.edit && this.actionEnabled.del ? 78 : 50,
                actions: [
                    this.actionEnabled.edit ? this.editAction : null,
                    this.actionEnabled.del ? this.deleteAction : null
                ]
            });
        }

        cols.push(...columns);

        this.gridModel = new GridModel({
            contextMenuFn: this.contextMenuFn,
            exportFilename: pluralize(unit),
            columns: cols,
            ...rest
        });

        this.formModel = new RestFormModel({parent: this, editors});
    }

    /** Load the underlying store. */
    loadAsync(...args) {
        return this.store.loadAsync(...args);
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
        this.store.deleteRecordAsync(record).catchDefault();
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

    contextMenuFn = () => {
        return new StoreContextMenu({
            items: [
                {
                    text: 'Add',
                    icon: Icon.add(),
                    actionFn: () => this.addRecord()
                },
                {
                    ...this.editAction
                },
                {
                    ...this.deleteAction
                },
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

    export(...args) {
        this.gridModel.export(...args);
    }

    destroy() {
        XH.safeDestroy(this.gridModel, this.formModel);
    }
}
