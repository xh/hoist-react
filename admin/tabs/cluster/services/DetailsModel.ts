/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSpec, lookup, PlainObject, XH} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {bindable} from '@xh/hoist/mobx';
import {ServiceModel} from './ServiceModel';

export class DetailsModel extends HoistModel {
    @lookup(ServiceModel)
    parent: ServiceModel;

    @bindable.ref
    svcName: StoreRecord;

    @bindable.ref
    stats: PlainObject;

    get selectedRecord() {
        return this.parent.gridModel.selectedRecord;
    }

    override onLinked() {
        this.addReaction({
            track: () => this.selectedRecord,
            run: () => this.loadAsync(),
            debounce: 500
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {selectedRecord, parent} = this,
            selected = selectedRecord?.data;

        // Fetch needed, clear existing data if known obsolete
        if (selected?.displayName != this.svcName) this.stats = null;
        this.svcName = selected?.displayName;

        if (!selected) return;

        const resp = await XH.fetchJson({
            url: 'serviceManagerAdmin/getStats',
            params: {instance: parent.instanceName, name: selected.name},
            autoAbortKey: 'serviceDetails',
            loadSpec
        });
        if (loadSpec.isStale) return;
        this.stats = resp;
    }
}
