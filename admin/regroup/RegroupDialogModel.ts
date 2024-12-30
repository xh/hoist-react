/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon/Icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {uniq} from 'lodash';

export class RegroupDialogModel extends HoistModel {
    private parent;

    @bindable groupName = null;
    @observable isOpen = false;

    regroupAction = {
        text: 'Change Group',
        icon: Icon.folder(),
        recordsRequired: true,
        actionFn: () => this.open(),
        displayFn: () => ({hidden: this.parent.gridModel.readonly})
    };

    get options() {
        return uniq(this.parent.gridModel.store.allRecords.map(it => it.data.groupName)).sort();
    }

    constructor(parent) {
        super();
        makeObservable(this);
        this.parent = parent;
    }

    async saveAsync() {
        const {parent, groupName} = this,
            {selectedRecords, store} = parent.gridModel,
            ids = selectedRecords.map(it => it.id),
            resp = await store.bulkUpdateRecordsAsync(ids, {groupName}),
            failuresPresent = resp.fail > 0,
            intent = failuresPresent ? 'warning' : 'success';

        let message = `Successfully updated ${resp.success} records.`;
        if (failuresPresent) message += ` Failed to update ${resp.fail} records.`;

        XH.toast({intent, message});
        this.close();
    }

    //-----------------
    // Actions
    //-----------------
    @action
    close() {
        this.groupName = null;
        this.isOpen = false;
    }

    @action
    open() {
        this.isOpen = true;
    }
}
