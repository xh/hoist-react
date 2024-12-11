/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p, strong} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {ManageDialogModel} from './ManageDialogModel';
import {makeObservable, action, observable} from '@xh/hoist/mobx';
import {ViewInfo} from '@xh/hoist/cmp/viewmanager';
import {ReactNode} from 'react';

/**
 * Backing model for EditForm
 */
export class EditFormModel extends HoistModel {
    parent: ManageDialogModel;

    @managed formModel: FormModel;
    @observable.ref view: ViewInfo;

    @action
    setView(view: ViewInfo) {
        const {formModel} = this;
        this.view = view;
        if (view) {
            formModel.init(view);
            formModel.readonly = !view.isEditable;
        }
    }

    get loadTask(): TaskObserver {
        return this.parent.loadModel;
    }

    constructor(parent: ManageDialogModel) {
        super();
        makeObservable(this);
        this.formModel = this.createFormModel();
        this.parent = parent;
    }

    async saveAsync() {
        const {parent, view, formModel} = this,
            {name, group, description, isDefaultPinned, isShared} = formModel.getData(),
            isValid = await formModel.validateAsync(),
            isDirty = formModel.isDirty;

        if (!isValid || !isDirty) return;

        if (view.isOwned && view.isShared != isShared) {
            const msg: ReactNode = !isShared
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

        await parent.updateAsync(view, {
            name,
            group,
            description,
            isShared,
            isDefaultPinned
        });
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
                {name: 'group'},
                {name: 'description'},
                {name: 'isShared'},
                {name: 'isDefaultPinned'}
            ]
        });
    }
}
