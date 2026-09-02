/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {ConfigPanelModel} from './ConfigPanelModel';

/**
 * Backs the read-only detail panel docked beside the config grid. Tracks the grid's single
 * selection and mirrors the selected record into a read-only FormModel for display.
 */
export class ConfigDetailModel extends HoistModel {
    override xhImpl = true;

    @lookup(ConfigPanelModel) parentModel: ConfigPanelModel;

    @managed formModel: FormModel;

    get record(): StoreRecord {
        return this.parentModel.gridModel.selectedRecord;
    }

    @computed
    get hasSelection(): boolean {
        return !!this.record;
    }

    get readonly(): boolean {
        return this.parentModel.gridModel.readonly;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        const {persistWith} = this.parentModel;
        this.persistWith = persistWith ? {...persistWith, path: 'detailPanel'} : null;

        this.formModel = new FormModel({
            readonly: true,
            fields: [
                {name: 'name'},
                {name: 'groupName', displayName: 'Group'},
                {name: 'valueType', displayName: 'Type'},
                {name: 'value'},
                {name: 'resolvedValue'},
                {name: 'defaultValue'},
                {name: 'overrideValue'},
                {name: 'clientVisible', displayName: 'Client Visible'},
                {name: 'note', displayName: 'Notes'},
                {name: 'lastUpdatedBy', displayName: 'Updated By'},
                {name: 'lastUpdated', displayName: 'Updated'}
            ]
        });

        // Record identity changes on selection and on store reload (e.g. after a save), so the
        // form tracks both a new selection and fresh data for the current one.
        this.addReaction({
            track: () => this.record,
            run: rec => this.formModel.init(rec?.data ?? {}),
            fireImmediately: true
        });
    }

    edit() {
        this.parentModel.gridModel.editRecord(this.record);
    }
}
