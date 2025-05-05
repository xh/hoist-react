/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {RoleModel} from '@xh/hoist/admin/tabs/userData/roles/RoleModel';
import {HoistModel, TaskObserver, XH} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon/Icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {compact, every, filter, map, uniq} from 'lodash';

export class RecategorizeDialogModel extends HoistModel {
    private parent: RoleModel;
    selectedRecords: StoreRecord[];

    readonly savingTask = TaskObserver.trackLast();

    @bindable categoryName = null;
    @observable isOpen = false;

    recategorizeAction() {
        return {
            text: 'Change Category',
            icon: Icon.folder(),
            recordsRequired: true,
            actionFn: ({selectedRecords}) => this.open(selectedRecords),
            displayFn: ({selectedRecords}) => {
                return {
                    hidden: this.parent.readonly,
                    disabled: every(selectedRecords, it => it.data?.isGroupRow)
                };
            }
        };
    }

    get options() {
        return [
            ...compact(uniq(this.parent.allRoles.map(it => it.category))).sort(),
            {value: '_CLEAR_ROLES_', label: '[Clear Existing Category]'}
        ];
    }

    constructor(parent) {
        super();
        makeObservable(this);
        this.parent = parent;
    }

    async saveAsync() {
        if (this.parent.readonly) return;
        const roleSpec = filter(
            this.selectedRecords.map(it => it.data),
            it => !it.isGroupRow
        );
        const roles: string[] = map(roleSpec, it => it.name);
        try {
            await XH.fetchService
                .postJson({
                    url: 'roleAdmin/bulkCategoryUpdate',
                    body: {
                        roles,
                        category: this.categoryName === '_CLEAR_ROLES_' ? null : this.categoryName
                    }
                })
                .linkTo(this.savingTask);
            this.close();
            await this.parent.refreshAsync();
        } catch (e) {
            XH.handleException(e);
        }
    }

    //-----------------
    // Actions
    //-----------------
    @action
    close() {
        this.categoryName = null;
        this.isOpen = false;
    }

    @action
    open(selectedRecords) {
        this.selectedRecords = selectedRecords;
        this.isOpen = true;
    }
}
