/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p, strong} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {makeObservable} from '@xh/hoist/mobx';
import {capitalize, isEmpty} from 'lodash';
import {ReactNode} from 'react';
import {ManageDialogModel} from '../ManageDialogModel';
import {ViewInfo} from '@xh/hoist/cmp/viewmanager';
import {normalizeGroupValue} from '../Utils';
import {GroupFieldModel, newGroupNameField} from './GroupFieldModel';

/**
 * Backing model for EditForm
 */
export class ViewPanelModel extends HoistModel {
    parent: ManageDialogModel;

    @managed formModel: FormModel;
    @managed groupFieldModel: GroupFieldModel;

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
        this.groupFieldModel = new GroupFieldModel({
            formModel: this.formModel,
            viewManagerModel: parent.viewManagerModel,
            context: 'single'
        });

        this.addReaction({
            track: () => this.view,
            run: view => {
                if (view) {
                    const {formModel} = this;
                    formModel.init({
                        ...view,
                        visibility: view.isShared ? 'shared' : view.isGlobal ? 'global' : 'private',
                        owner: view.owner ?? capitalize(parent.viewManagerModel.globalDisplayName),
                        newGroupName: null
                    });
                    this.groupFieldModel.init(view.group);
                    formModel.readonly = !view.isEditable;
                }
            },
            fireImmediately: true
        });
    }

    reset() {
        this.formModel.reset();
        this.groupFieldModel.reset();
    }

    async saveAsync() {
        const {parent, view, formModel} = this,
            updates = formModel.getData(true),
            isValid = await formModel.validateAsync(),
            isDirty = formModel.isDirty,
            visibilityField = formModel.fields.visibility;

        if (!isValid || !isDirty) return;

        if (updates.hasOwnProperty('group')) {
            updates.group = normalizeGroupValue(formModel.values.group);
        }
        delete updates.newGroupName;

        // An abandoned new-group name can dirty the form without producing any real updates.
        if (isEmpty(updates)) return;

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
                newGroupNameField(),
                {name: 'description'},
                {name: 'visibility'}
            ]
        });
    }
}
