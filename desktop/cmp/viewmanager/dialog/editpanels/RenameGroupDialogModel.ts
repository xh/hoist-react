/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p, strong} from '@xh/hoist/cmp/layout';
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
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {every, partition} from 'lodash';
import {ManageDialogModel} from '../ManageDialogModel';

/**
 * Backing model for the RenameGroupDialog - rename/re-nest a single selected group in place,
 * cascading to all views within it. Opened via the grids' "Rename Group" context-menu item.
 */
export class RenameGroupDialogModel extends HoistModel {
    parent: ManageDialogModel;

    @managed formModel: FormModel;

    /** True to display the dialog. */
    @bindable isRenameDialogOpen = false;

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
        makeObservable(this);

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

    /** @returns true if changes were applied (or none were pending), false if blocked. */
    async saveAsync(): Promise<boolean> {
        const {parent, group, isGlobal, canEditGroup, formModel} = this;

        if (!formModel.isDirty) return true;
        if (!(await formModel.validateAsync())) return false;

        const {name} = formModel.getData(),
            to = normalizeGroupPath(composeGroupPath(getGroupParent(group), name)),
            renamePending = canEditGroup && to !== group;

        // Run all confirms up front, before applying any changes.
        if (renamePending && !(await this.confirmGlobalRenameAsync())) return false;
        if (renamePending && !(await this.confirmMergeIfExistsAsync(to))) return false;
        if (renamePending) await parent.renameGroupAsync(group, to, isGlobal);
        return true;
    }

    //------------------------
    // Implementation
    //------------------------
    /**
     * Confirm before renaming a global group - the rename re-groups global views within every
     * user's menu, not just the current user's.
     */
    private async confirmGlobalRenameAsync(): Promise<boolean> {
        const {isGlobal, group, parent} = this;
        if (!isGlobal) return true;

        const {viewManagerModel} = parent,
            {globalDisplayName, typeDisplayName} = viewManagerModel,
            globalViews = viewManagerModel.globalViews.filter(
                v => v.isGlobal && isGroupSameOrDescendant(v.group, group)
            );

        if (!globalViews.length) return true;

        const countStr = pluralize(
            `${globalDisplayName} ${typeDisplayName}`,
            globalViews.length,
            true
        );
        return XH.confirm({
            message: fragment(
                p(
                    `This will rename the group across ${countStr} for all other ${XH.appName} users.`
                ),
                p(strong('Are you sure you want to proceed?'))
            ),
            confirmProps: {
                text: 'Yes, rename',
                outlined: true,
                autoFocus: false,
                intent: 'primary'
            }
        });
    }

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
