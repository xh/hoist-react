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
import {Icon} from '@xh/hoist/icon';
import {pluralize} from '@xh/hoist/utils/js';

import {RestFormModel} from './RestFormModel';
import {withDefault} from '../../../utils/js/LangUtils';

export const restGridAddAction = {
    text: 'Add',
    icon: Icon.add(),
    intent: 'success',
    actionFn: ({context}) => context.addRecord()
};

export const restGridEditAction = {
    text: 'Edit',
    icon: Icon.edit(),
    intent: 'primary',
    actionFn: ({record, context}) => context.editRecord(record),
    recordsRequired: 1
};

export const restGridDeleteAction = {
    text: 'Delete',
    icon: Icon.delete(),
    intent: 'danger',
    actionFn: ({record, context}) => context.deleteRecord(record),
    recordsRequired: true,
    confirm: {
        message: 'Are you sure you want to delete the selected record?',
        title: 'Warning',
        icon: Icon.warning({size: 'lg'})
    }
};

/**
 * Core Model for a RestGrid.
 */
@HoistModel
export class RestGridModel {

    //----------------
    // Properties
    //----------------
    toolbarActions;

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

    unit = null;
    filterFields = null;

    gridModel = null;
    formModel = null;

    get store()             {return this.gridModel.store}
    get selModel()          {return this.gridModel.selModel}
    get selection()         {return this.gridModel.selection}
    get selectedRecord()    {return this.gridModel.selectedRecord}

    /**
     * @param {Object} [actionEnabled] - map of action (e.g. 'add'/'edit'/'delete') to boolean  See default prop
     * @param {Object} [actionWarning] - map of action (e.g. 'add'/'edit'/'delete') to string.  See default prop.
     * @param {Object[]|RecordAction[]} [toolbarActions] - actions to display in the toolbar. Defaults to add, edit, delete.
     * @param {string} [unit] - name that describes records in this grid.
     * @param {string[]} [filterFields] - Names of fields to include in this grid's quick filter logic.
     * @param {function} [enhanceToolbar] - a function used to mutate RestGridToolbar items
     * @param {Object[]} editors - array of editors
     * @param {*} ...rest, arguments for GridModel.
     */
    constructor({
        actionEnabled,
        actionWarning,
        toolbarActions,
        unit = 'record',
        filterFields,
        enhanceToolbar,
        editors = [],
        ...rest
    }) {
        this.actionEnabled = Object.assign(this.actionEnabled, actionWarning);
        this.actionWarning = Object.assign(this.actionWarning, actionWarning);
        this.toolbarActions = withDefault(toolbarActions, [restGridAddAction, restGridEditAction, restGridDeleteAction]);
        this.unit = unit;
        this.filterFields = filterFields;
        this.enhanceToolbar = enhanceToolbar;
        this.gridModel = new GridModel({contextMenuFn: this.contextMenuFn, exportFilename: pluralize(unit), ...rest});

        this.gridModel = new GridModel({
            contextMenuFn: this.contextMenuFn,
            exportFilename: pluralize(unit),
            actionContext: this,
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
                restGridEditAction,
                restGridDeleteAction,
                '-',
                ...GridModel.defaultContextMenuTokens
            ],
            gridModel: this.gridModel
        });
    }

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
