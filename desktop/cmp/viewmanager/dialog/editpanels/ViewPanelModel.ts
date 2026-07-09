/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p, strong} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {capitalize} from 'lodash';
import {ReactNode} from 'react';
import {ManageDialogModel} from '../ManageDialogModel';
import {
    composeGroupPath,
    normalizeGroupPath,
    VIEW_GROUP_DELIMITER,
    ViewInfo
} from '@xh/hoist/cmp/viewmanager';

/**
 * Backing model for EditForm
 */
export class ViewPanelModel extends HoistModel {
    parent: ManageDialogModel;

    @managed formModel: FormModel;

    /** True to show the text input naming a new group to create under the selected group. */
    @bindable isAddingNewGroup: boolean = false;

    get view(): ViewInfo {
        return this.parent.selectedView;
    }

    /** The single edited view as a list, for the shared {@link formButtons}. */
    get views(): ViewInfo[] {
        const {view} = this;
        return view ? [view] : [];
    }

    get allEditable(): boolean {
        return !!this.view?.isEditable;
    }

    get loadTask(): TaskObserver {
        return this.parent.loadObserver;
    }

    constructor(parent: ManageDialogModel) {
        super();
        makeObservable(this);

        this.parent = parent;
        this.formModel = this.createFormModel();

        this.addReaction({
            track: () => this.view,
            run: view => {
                this.isAddingNewGroup = false;
                if (view) {
                    const {formModel} = this;
                    formModel.init({
                        ...view,
                        visibility: view.isShared ? 'shared' : view.isGlobal ? 'global' : 'private',
                        owner: view.owner ?? capitalize(parent.viewManagerModel.globalDisplayName),
                        newGroup: null
                    });
                    formModel.readonly = !view.isEditable;
                }
            },
            fireImmediately: true
        });
    }

    reset() {
        this.formModel.reset();
        this.isAddingNewGroup = false;
    }

    async saveAsync() {
        const {parent, view, formModel} = this,
            updates = formModel.getData(true),
            isValid = await formModel.validateAsync(),
            isDirty = formModel.isDirty,
            visibilityField = formModel.fields.visibility;

        if (!isValid || !isDirty) return;

        const newGroup = formModel.values.newGroup?.trim();
        if (updates.hasOwnProperty('group') || newGroup) {
            const base = normalizeGroupPath(formModel.values.group);
            updates.group = newGroup ? composeGroupPath(base, newGroup) : base;
        }
        delete updates.newGroup;

        if (visibilityField.isDirty) {
            const visibility = visibilityField.value;
            updates.isShared = visibility === 'shared';
            updates.isGlobal = visibility === 'global';

            const msgs: ReactNode[] = [strong('Are you sure you want to proceed?')];
            switch (visibility) {
                case 'private':
                    msgs.unshift(
                        `Your ${view.typedName} will no longer be available to all other ${XH.appName} users.`
                    );
                    break;
                case 'global':
                    msgs.unshift(
                        `Your ${view.typedName} will become globally visible to all other ${XH.appName} users.`
                    );
                    break;
                case 'shared':
                    view.isGlobal
                        ? msgs.unshift(
                              `Your ${view.typedName} will no longer be globally visible to all other ${XH.appName} users.`
                          )
                        : msgs.unshift(
                              `Your ${view.typedName} will become available to all other ${XH.appName} users.`
                          );
            }

            const confirmed = await XH.confirm({
                message: fragment(msgs.map(m => p(m))),
                confirmProps: {
                    text: 'Yes, update visibility',
                    outlined: true,
                    autoFocus: false,
                    intent: 'primary'
                }
            });
            if (!confirmed) return;
        }

        await parent.updateAsync(view, updates);
    }

    //------------------------
    // Implementation
    //------------------------
    private createFormModel(): FormModel {
        return new FormModel({
            fields: [
                {
                    name: 'name',
                    rules: [
                        async ({value}, {visibility}) => {
                            return this.parent.viewManagerModel.validateViewNameAsync(
                                value,
                                this.view,
                                visibility === 'global'
                            );
                        }
                    ]
                },
                {name: 'owner'},
                {name: 'group'},
                {
                    name: 'newGroup',
                    displayName: 'New Group',
                    rules: [
                        ({value}) =>
                            value?.includes(VIEW_GROUP_DELIMITER)
                                ? `Group name may not contain "${VIEW_GROUP_DELIMITER}".`
                                : null
                    ]
                },
                {name: 'description'},
                {name: 'visibility'}
            ]
        });
    }
}
