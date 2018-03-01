/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {remove} from 'lodash';
import {XH} from 'hoist/core';
import {action} from 'hoist/mobx';
import {RecordSpec} from 'hoist/data';
import {GridModel} from 'hoist/grid';
import {AlertModel} from 'hoist/cmp';


import {RestFormModel} from './RestFormModel';

/**
 * Core Model for a RestGrid.
 */
export class RestGridModel {

    //----------------
    // Properties
    //----------------
    actionEnabled = {
        add: true,
        edit: true,
        del: true
    }

    actionWarning = {
        add: null,
        edit: null,
        del: 'Are you sure you want to delete the selected record(s)?'
    }

    gridModel = null;
    formModel = null;
    alertModel = new AlertModel();

    get store()     {return this.gridModel.store}
    get selection() {return this.gridModel.selection}

    /**
     * Construct this Object.
     *
     * @param actionEnabled, map of action (e.g. 'add'/'edit'/'delete') to boolean  See default prop
     * @param actionWarning, map of action (e.g. 'add'/'edit'/'delete') to string.  See default prop.
     * @param editors, array of editors
     * @param rest, arguments for GridModel.
     */
    constructor({
        actionEnabled,
        actionWarning,
        editors = [],
        ...rest
    }) {
        this.actionEnabled = Object.assign(this.actionEnabled, actionEnabled);
        this.actionWarning = Object.assign(this.actionWarning, actionWarning);
        this.formModel = new RestFormModel({parent: this, editors});
        this.gridModel = new GridModel(rest);
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
        const record = this.selection.singleRecord;
        if (record) {
            this.store.deleteRecordAsync(record).catchDefault();
        }
    }

    @action
    editSelection() {
        const record = this.selection.singleRecord;
        if (record) {
            this.formModel.openEdit(record);
        }
    }
}