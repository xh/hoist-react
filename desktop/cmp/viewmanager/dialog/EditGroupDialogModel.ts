/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {
    composeGroupPath,
    getGroupLeaf,
    getGroupParent,
    normalizeGroupPath,
    VIEW_GROUP_DELIMITER
} from '@xh/hoist/cmp/viewmanager';
import {HoistModel} from '@xh/hoist/core';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {ManageDialogModel} from './ManageDialogModel';

/**
 * Backing model for the dialog used to rename or re-parent a view group, launched from the
 * "Edit Group" context menu on group rows within the manage dialog grids.
 */
export class EditGroupDialogModel extends HoistModel {
    parent: ManageDialogModel;

    @observable isOpen: boolean = false;

    /** Group path under edit. */
    @observable.ref group: string = null;

    /** True if editing a group of global views, false for owned. */
    @observable isGlobal: boolean = false;

    @bindable leaf: string = null;
    @bindable nestUnder: string = null;

    get isValid(): boolean {
        const leaf = this.leaf?.trim();
        return !!leaf && !leaf.includes(VIEW_GROUP_DELIMITER);
    }

    constructor(parent: ManageDialogModel) {
        super();
        makeObservable(this);
        this.parent = parent;
    }

    @action
    open(group: string, isGlobal: boolean) {
        this.group = group;
        this.isGlobal = isGlobal;
        this.leaf = getGroupLeaf(group);
        this.nestUnder = getGroupParent(group);
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    async saveAsync() {
        const {parent, group, isGlobal, nestUnder, leaf, isValid} = this;
        if (!isValid) return;

        const to = normalizeGroupPath(composeGroupPath(nestUnder, leaf));
        if (to !== group) {
            await parent.renameGroupAsync(group, to, isGlobal);
        }
        this.close();
    }
}
