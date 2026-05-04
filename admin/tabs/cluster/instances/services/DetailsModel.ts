/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSpec, lookup, PlainObject} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {ServiceModel} from './ServiceModel';

export class DetailsModel extends HoistModel {
    override spanPrefix = 'xh.client.admin.services';

    @lookup(ServiceModel)
    parent: ServiceModel;

    @bindable.ref
    svcName: String;

    @bindable.ref
    stats: PlainObject;

    get selectedRecord() {
        return this.parent.gridModel.selectedRecord;
    }

    constructor() {
        super();
        makeObservable(this);
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

        await this.runOn(loadSpec)
            .newSpan('getStats')
            .run(async ctx => {
                this.stats = await ctx.fetchJson({
                    url: 'serviceManagerAdmin/getStats',
                    params: {instance: parent.instanceName, name: selected.name},
                    autoAbortKey: 'serviceDetails'
                });
            });
    }
}
