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
    actionFn: ({metadata}) => metadata.restGridModel.addRecord()
};

export const restGridEditAction = {
    text: 'Edit',
    icon: Icon.edit(),
    intent: 'primary',
    actionFn: ({record, metadata}) => metadata.restGridModel.editRecord(record),
    recordsRequired: 1
};

export const restGridViewAction = {
    text: 'View',
    icon: Icon.search(),
    actionFn: ({record, metadata}) => metadata.restGridModel.viewRecord(record),
    recordsRequired: 1
};

export const restGridDeleteAction = {
    text: 'Delete',
    icon: Icon.delete(),
    intent: 'danger',
    prepareFn: ({action, record}) => {
        // Hide this action if we are acting on a "new" record
        action.hidden = record && record.id === null;
    },
    actionFn: ({record, metadata}) => metadata.restGridModel.deleteRecord(record),
    recordsRequired: true,
    confirm: {
        message: 'Are you sure you want to delete the selected record?',
        title: 'Warning',
        icon: Icon.warning({size: 'lg'})
    }
};

// TODO: Would like this to live in RestFormModel.js, but for some reason the restGridDeleteAction
//       is undefined when this object is constructed?! Not understanding something about "static" const objects and imports
export const restFormDeleteAction = {
    ...restGridDeleteAction,
    actionFn: ({record, metadata}) => metadata.restFormModel.deleteRecord(record)
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

    unit = null;
    filterFields = null;

    gridModel = null;
    formModel = null;

    get store()             {return this.gridModel.store}
    get selModel()          {return this.gridModel.selModel}
    get selection()         {return this.gridModel.selection}
    get selectedRecord()    {return this.gridModel.selectedRecord}

    /**
     * @param {Object[]|RecordAction[]} [toolbarActions] - actions to display in the toolbar. Defaults to add, edit, delete.
     * @param {Object[]|RecordAction[]} [contextMenuActions] - actions to display in the grid context menu. Defaults to add, edit, delete.
     * @param {Object[]|RecordAction[]} [formToolbarActions] - actions to display in the form toolbar. Defaults to delete.
     * @param {string} [unit] - name that describes records in this grid.
     * @param {string[]} [filterFields] - Names of fields to include in this grid's quick filter logic.
     * @param {function} [enhanceToolbar] - a function used to mutate RestGridToolbar items
     * @param {Object[]} editors - array of editors
     * @param {*} ...rest, arguments for GridModel.
     */
    constructor({
        toolbarActions,
        contextMenuActions,
        formToolbarActions,
        unit = 'record',
        filterFields,
        enhanceToolbar,
        editors = [],
        ...rest
    }) {
        this.toolbarActions = withDefault(toolbarActions, [restGridAddAction, restGridEditAction, restGridDeleteAction]);
        this.contextMenuActions = withDefault(contextMenuActions, [restGridAddAction, restGridEditAction, restGridDeleteAction]);

        this.unit = unit;
        this.filterFields = filterFields;
        this.enhanceToolbar = enhanceToolbar;

        this.gridModel = new GridModel({
            contextMenuFn: this.contextMenuFn,
            exportFilename: pluralize(unit),
            restGridModel: this,
            ...rest
        });

        this.formModel = new RestFormModel({
            parent: this,
            editors,
            toolbarActions: formToolbarActions,
            actionMetadata: this.actionMetadata
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

    export(...args) {
        this.gridModel.export(...args);
    }

    destroy() {
        XH.safeDestroy(this.gridModel, this.formModel);
    }
}
