/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action} from '@xh/hoist/mobx';
import {GridModel} from '@xh/hoist/cmp/grid';
import {MessageModel} from '@xh/hoist/cmp/message';
import {StoreContextMenu} from '@xh/hoist/cmp/contextmenu';
import {Icon} from '@xh/hoist/icon';
import {pluralize} from '@xh/hoist/utils/JsUtils';

import {RestFormModel} from './RestFormModel';

/**
 * Core Model for a RestGrid.
 */
@HoistModel()
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
        del: 'Are you sure you want to delete the selected record(s)?'
    };

    unit = null;
    filterFields = null;

    gridModel = null;
    formModel = null;
    messageModel = null;

    get store()             {return this.gridModel.store}
    get selModel()          {return this.gridModel.selModel}
    get selection()         {return this.gridModel.selection}
    get selectedRecord()    {return this.gridModel.selectedRecord}

    /**
     * @param {Object} [actionEnabled] - map of action (e.g. 'add'/'edit'/'delete') to boolean  See default prop
     * @param {Object} [actionWarning] - map of action (e.g. 'add'/'edit'/'delete') to string.  See default prop.
     * @param {string} [unit] - name that describes records in this grid.
     * @param {string[]} [filterFields] - Names of fields to include in this grid's quick filter logic.
     * @param {function} [enhanceToolbar] - a function used to mutate RestGridToolbar items
     * @param {Object[]} editors - array of editors
     * @param {*} ...rest, arguments for GridModel.
     */
    constructor({
        actionEnabled,
        actionWarning,
        unit = 'record',
        filterFields,
        enhanceToolbar,
        editors = [],
        ...rest
    }) {
        this.actionEnabled = Object.assign(this.actionEnabled, actionEnabled);
        this.actionWarning = Object.assign(this.actionWarning, actionWarning);
        this.unit = unit;
        this.filterFields = filterFields;
        this.enhanceToolbar = enhanceToolbar;
        this.gridModel = new GridModel({contextMenuFn: this.contextMenuFn, ...rest});
        this.formModel = new RestFormModel({parent: this, editors});
        this.messageModel = new MessageModel({title: 'Warning', icon: Icon.warning({size: 'lg'})});
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
                    action: () => this.addRecord()
                },
                {
                    text: 'Edit',
                    icon: Icon.edit(),
                    action: (item, record) => this.editRecord(record),
                    recordsRequired: 1
                },
                {
                    text: 'Delete',
                    icon: Icon.delete(),
                    action: (item, record) => this.confirmDeleteRecord(record),
                    recordsRequired: true
                },
                '-',
                'copy',
                'copyWithHeaders',
                '-',
                'export',
                'autoSizeAll'
            ]
        });
    }

    confirmDeleteSelection() {
        const record = this.selectedRecord;
        if (record) this.confirmDeleteRecord(record);
    }

    confirmDeleteRecord(record) {
        const warning = this.actionWarning.del;
        if (warning) {
            this.messageModel.confirm({
                message: warning,
                onConfirm: () => this.deleteRecord(record)
            });
        } else {
            this.deleteRecord(record);
        }
    }

    export() {
        const fileName = pluralize(this.unit);
        this.gridModel.exportDataAsExcel({fileName});
    }

    destroy() {
        XH.safeDestroy(this.messageModel, this.gridModel, this.formModel);
    }
}
