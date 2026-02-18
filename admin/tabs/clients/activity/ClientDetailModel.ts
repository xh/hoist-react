/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ClientsModel} from '../ClientsModel';
import {ColumnSpec} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSpec, lookup, PlainObject, XH} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {ReactNode} from 'react';
import {ActivityDetailProvider} from '../../activity/tracking/detail/ActivityDetailModel';

export class ClientDetailModel extends HoistModel implements ActivityDetailProvider {
    @lookup(ClientsModel) clientsModel: ClientsModel;

    readonly isActivityDetailProvider = true;

    /** Client tabID for which to load and show activity. */
    @bindable tabId: string;
    @bindable.ref trackLogs: PlainObject[] = [];

    get selectedRec(): StoreRecord {
        return this.clientsModel?.gridModel.selectedRecord;
    }

    @computed
    get hasSelection(): boolean {
        return !!this.selectedRec;
    }

    get title(): ReactNode {
        return this.selectedRec?.data.user ?? 'Client Activity';
    }

    /** For child {@link ActivityDetailModel}. */
    readonly colDefaults: Record<string, Partial<ColumnSpec>> = {
        username: {hidden: true},
        impersonatingFlag: {hidden: true},
        tabId: {hidden: true},
        loadId: {hidden: false},
        device: {hidden: true}
    };

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        super.onLinked();

        this.addReaction(
            {
                track: () => this.clientsModel.gridModel.selectedRecord,
                run: rec => (this.tabId = rec?.get('tabId'))
            },
            {
                track: () => this.tabId,
                run: () => this.loadAsync(),
                debounce: 300
            }
        );
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {tabId} = this;

        if (!tabId) {
            this.trackLogs = [];
            return;
        }

        try {
            this.trackLogs = await XH.postJson({
                url: 'trackLogAdmin',
                body: {
                    filters: {field: 'tabId', op: '=', value: tabId}
                }
            });
        } catch (e) {
            if (loadSpec.isStale || !loadSpec.isAutoRefresh) return;

            XH.handleException(e, {alertType: 'toast'});
            this.trackLogs = [];
        }
    }
}
