/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {RestGridModel} from '@xh/hoist/desktop/cmp/rest';
import {computed, makeObservable} from '@xh/hoist/mobx';

/**
 * Backs a {@link restDetailPanel}. Resolves the host RestGridModel via `@lookup` - the model of an
 * enclosing component must expose it as a public property - then tracks its single selection and
 * mirrors the selected record into a read-only FormModel with a field for every store field.
 */
export class RestDetailModel extends HoistModel {
    override xhImpl = true;

    @lookup(RestGridModel) gridModel: RestGridModel;

    @managed formModel: FormModel;

    get record(): StoreRecord {
        return this.gridModel.selectedRecord;
    }

    @computed
    get hasSelection(): boolean {
        return !!this.record;
    }

    get readonly(): boolean {
        return this.gridModel.readonly;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.formModel = new FormModel({
            readonly: true,
            fields: this.gridModel.store.fields.map(f => ({
                name: f.name,
                displayName: f.displayName
            }))
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
        this.gridModel.editRecord(this.record);
    }
}
