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
import {pluralize, withDefault} from '@xh/hoist/utils/js';
import {
    addAction as baseAddAction,
    editAction as baseEditAction,
    viewAction as baseViewAction,
    deleteAction as baseDeleteAction
} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon/Icon';

import {RestFormModel} from './RestFormModel';

export const addAction = {
    ...baseAddAction,
    actionFn: ({gridModel, restModel = gridModel.restModel}) => restModel.addRecord()
};

export const editAction = {
    ...baseEditAction,
    actionFn: ({record, gridModel, restModel = gridModel.restModel}) => restModel.editRecord(record)
};

export const viewAction = {
    ...baseViewAction,
    actionFn: ({record, gridModel, restModel = gridModel.restModel}) => restModel.viewRecord(record)
};

export const deleteAction = {
    ...baseDeleteAction,
    displayConfigFn: ({action, record, defaultConfig}) => {
        return {
            ...defaultConfig,
            hidden: record && record.id === null // Hide this action if we are acting on a "new" record
        };
    },
    actionFn: ({record, gridModel, restModel = gridModel.restModel}) => restModel.confirmDeleteRecord(record)
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
    contextMenuActions;
    formToolbarActions;

    actionWarning = {
        add: null,
        edit: null,
        del: 'Are you sure you want to delete the selected record?'
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
     * @param {Object[]|RecordAction[]} [toolbarActions] - actions to display in the toolbar. Defaults to add, edit, delete.
     * @param {Object[]|RecordAction[]} [contextMenuActions] - actions to display in the grid context menu. Defaults to add, edit, delete.
     * @param {Object[]|RecordAction[]} [formToolbarActions] - actions to display in the form toolbar. Defaults to delete.
     * @param {Object} [actionWarning] - map of action (e.g. 'add'/'edit'/'delete') to string.  See default prop.
     * @param {string} [unit] - name that describes records in this grid.
     * @param {string[]} [filterFields] - Names of fields to include in this grid's quick filter logic.
     * @param {function} [enhanceToolbar] - a function used to mutate RestGridToolbar items
     * @param {Object[]} editors - array of editors
     * @param {*} ...rest - arguments for GridModel.
     */
    constructor({
        toolbarActions,
        contextMenuActions,
        formToolbarActions,
        actionWarning,
        unit = 'record',
        filterFields,
        enhanceToolbar,
        editors = [],
        ...rest
    }) {
        this.toolbarActions = withDefault(toolbarActions, [addAction, editAction, deleteAction]);
        this.contextMenuActions = withDefault(contextMenuActions,
            [addAction, editAction, deleteAction]);

        this.actionWarning = Object.assign(this.actionWarning, actionWarning);

        this.unit = unit;
        this.filterFields = filterFields;
        this.enhanceToolbar = enhanceToolbar;

        this.gridModel = new GridModel({
            contextMenuFn: this.contextMenuFn,
            exportFilename: pluralize(unit),
            restModel: this,
            ...rest
        });

        this.formModel = new RestFormModel({
            parent: this,
            editors,
            toolbarActions: formToolbarActions
        });
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

    @action
    viewRecord(record) {
        this.formModel.openView(record);
    }

    contextMenuFn = () => {
        return new StoreContextMenu({
            items: [
                ...this.contextMenuActions,
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
