/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p} from '@xh/hoist/cmp/layout';
import {
    composeGroupPath,
    getAllGroupPaths,
    getGroupLeaf,
    getGroupParent,
    isGroupSameOrDescendant,
    normalizeGroupPath,
    VIEW_GROUP_DELIMITER,
    ViewInfo
} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {required, StoreRecord} from '@xh/hoist/data';
import {pluralize} from '@xh/hoist/utils/js';
import {every, partition} from 'lodash';
import {ManageDialogModel} from '../ManageDialogModel';

/**
 * Backing model for editing a single selected group - rename the group itself, plus
 * bulk pinning updates across all views within it.
 */
export class GroupPanelModel extends HoistModel {
    parent: ManageDialogModel;

    @managed formModel: FormModel;

    get groupRecord(): StoreRecord {
        return this.parent.selectedGroupRecord;
    }

    /** Path of the group under edit - null for the shared tab's synthetic owner rows. */
    get group(): string {
        return this.groupRecord?.data.group ?? null;
    }

    /** Views within the group, respecting any active grid filter. */
    get views(): ViewInfo[] {
        return this.parent.selectedViews;
    }

    get allEditable(): boolean {
        return every(this.views, 'isEditable');
    }

    /** True if the group itself can be renamed/re-nested by the current user. */
    get canEditGroup(): boolean {
        return this.group != null && this.allEditable;
    }

    get isGlobal(): boolean {
        return this.parent.gridType === 'global';
    }

    constructor(parent: ManageDialogModel) {
        super();

        this.parent = parent;
        this.formModel = this.createFormModel();

        this.addReaction({
            track: () => [this.groupRecord, this.views],
            run: () => {
                const {formModel, group, allEditable} = this;
                formModel.init({
                    name: getGroupLeaf(group)
                });
                formModel.readonly = !allEditable;
            },
            fireImmediately: true
        });
    }

    reset() {
        this.formModel.reset();
    }

    async saveAsync() {
        const {parent, group, isGlobal, canEditGroup, formModel} = this;

        if (!formModel.isDirty) return;
        if (!(await formModel.validateAsync())) return;

        const {name} = formModel.getData(),
            to = normalizeGroupPath(composeGroupPath(getGroupParent(group), name)),
            renamePending = canEditGroup && to !== group;

        // Run all confirms up front, before applying any changes.
        if (renamePending && !(await this.confirmMergeIfExistsAsync(to))) return;
        if (renamePending) await parent.renameGroupAsync(group, to, isGlobal);
    }

    //------------------------
    // Implementation
    //------------------------
    /**
     * If the target path already exists as a group in its own right, the rename will merge this
     * group's views into it - confirm with the user before proceeding.
     */
    private async confirmMergeIfExistsAsync(to: string): Promise<boolean> {
        const {parent, group, isGlobal} = this,
            {viewManagerModel} = parent,
            views = isGlobal ? viewManagerModel.globalViews : viewManagerModel.ownedViews,
            [movingViews, otherViews] = partition(views, v =>
                isGroupSameOrDescendant(v.group, group)
            );

        if (!getAllGroupPaths(otherViews).includes(to)) return true;

        return XH.confirm({
            message: fragment(
                p(`Group "${to}" already exists.`),
                p(
                    `You will be adding ${pluralize(viewManagerModel.typeDisplayName, movingViews.length, true)} to this group.`
                )
            ),
            confirmProps: {
                text: 'Yes, merge groups',
                outlined: true,
                autoFocus: false,
                intent: 'primary'
            }
        });
    }

    private createFormModel(): FormModel {
        return new FormModel({
            fields: [
                {
                    name: 'name',
                    displayName: 'Group Name',
                    rules: [
                        required,
                        ({value}) =>
                            value?.includes(VIEW_GROUP_DELIMITER)
                                ? `Group name may not contain "${VIEW_GROUP_DELIMITER}".`
                                : null
                    ]
                }
            ]
        });
    }
}
