/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {uniq} from 'lodash';
import {HoistModel, XH} from '@xh/hoist/core';
import {action, bindable, observable, makeObservable} from '@xh/hoist/mobx';
import {Icon} from '@xh/hoist/icon/Icon';

export class RegroupDialogModel extends HoistModel {
    _parent;

    @bindable groupName = null;
    @observable isOpen = false;

    regroupAction = {
        text: 'Change Group',
        icon: Icon.grip(),
        recordsRequired: true,
        actionFn: () => this.open(),
        displayFn: () => ({hidden: this._parent.gridModel.readonly})
    };

    get options() {
        return uniq(this._parent.gridModel.store.allRecords.map(it => it.data.groupName)).sort();
    }

    constructor(parent) {
        super();
        makeObservable(this);
        this._parent = parent;
    }

    async saveAsync() {
        const {_parent, groupName} = this,
            {selectedRecords, store} = _parent.gridModel,
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
