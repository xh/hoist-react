/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p, strong} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {capitalize, isUndefined} from 'lodash';
import {ManageDialogModel} from './ManageDialogModel';
import {makeObservable} from '@xh/hoist/mobx';
import {ViewInfo} from '@xh/hoist/cmp/viewmanager';
import {ReactNode} from 'react';

/**
 * Backing model for EditForm
 */
export class ViewPanelModel extends HoistModel {
    parent: ManageDialogModel;

    @managed formModel: FormModel;

    get view(): ViewInfo {
        return this.parent.selectedView;
    }

    get loadTask(): TaskObserver {
        return this.parent.loadModel;
    }

    constructor(parent: ManageDialogModel) {
        super();
        makeObservable(this);

        this.parent = parent;
        this.formModel = this.createFormModel();

        this.addReaction({
            track: () => this.view,
            run: view => {
                if (view) {
                    const {formModel} = this;
                    formModel.init({
                        ...view,
                        owner: view.owner ?? capitalize(parent.viewManagerModel.globalDisplayName)
                    });
                    formModel.readonly = !view.isEditable;
                }
            },
            fireImmediately: true
        });
    }

    async saveAsync() {
        const {parent, view, formModel} = this,
            updates = formModel.getData(true),
            isValid = await formModel.validateAsync(),
            isDirty = formModel.isDirty;

        if (!isValid || !isDirty) return;

        if (view.isOwned && !isUndefined(updates.isShared)) {
            const msg: ReactNode = !updates.isShared
                ? `Your ${view.typedName} will no longer be visible to all other ${XH.appName} users.`
                : `Your ${view.typedName} will become visible to all other ${XH.appName} users.`;
            const msgs = [msg, strong('Are you sure you want to proceed?')];

            const confirmed = await XH.confirm({
                message: fragment(msgs.map(m => p(m))),
                confirmProps: {
                    text: 'Yes, update sharing',
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
                        async ({value}) => {
                            return this.parent.viewManagerModel.validateViewNameAsync(
                                value,
                                this.view
                            );
                        }
                    ]
                },
                {name: 'owner'},
                {name: 'group'},
                {name: 'description'},
                {name: 'isShared'},
                {name: 'isDefaultPinned'}
            ]
        });
    }
}
