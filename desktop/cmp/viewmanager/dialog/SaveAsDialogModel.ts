/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {p, strong} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {makeObservable, action, observable} from '@xh/hoist/mobx';
import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {some} from 'lodash';

/**
 * Backing model for ViewManagerModel's SaveAs
 */
export class SaveAsDialogModel extends HoistModel {
    readonly parent: ViewManagerModel;

    @managed readonly formModel: FormModel;
    @observable isOpen: boolean = false;

    constructor(parent: ViewManagerModel) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.formModel = this.createFormModel();
    }

    @action
    open() {
        const {parent, formModel} = this,
            src = parent.view,
            name = some(parent.ownedViews, {name: src.name}) ? `Copy of ${src.name}` : src.name;

        formModel.init({
            name,
            group: src.group,
            description: src.description,
            visibility: 'private',
            isPinned: src.info.isPinned
        });

        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    async saveAsAsync() {
        try {
            await this.doSaveAsAsync().linkTo(this.parent.saveTask);
        } catch (e) {
            XH.handleException(e);
        }
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
                        ({value}, {visibility}) => {
                            return this.parent.validateViewNameAsync(
                                value,
                                null,
                                visibility === 'global'
                            );
                        }
                    ]
                },
                {name: 'group'},
                {name: 'description'},
                {name: 'isPinned'},
                {name: 'visibility'}
            ]
        });
    }

    private async doSaveAsAsync() {
        let {formModel, parent} = this,
            {name, group, description, visibility, isPinned} = formModel.getData(),
            isValid = await formModel.validateAsync(),
            isGlobal = visibility === 'global',
            isShared = visibility === 'shared';

        if (!isValid) return;

        if (isGlobal) {
            const message = [
                p(
                    `This ${parent.typeDisplayName} will become a ${parent.globalDisplayName} ${parent.typeDisplayName} visible to all other ${XH.appName} users.`
                ),
                p(strong('Are you sure you want to proceed?'))
            ];
            const confirmed = await XH.confirm({
                message,
                confirmProps: {
                    outlined: true,
                    autoFocus: false,
                    intent: 'primary'
                }
            });
            if (!confirmed) return;
        }

        await parent.saveAsAsync({
            name: name.trim(),
            group: group?.trim(),
            description: description?.trim(),
            isPinned,
            isGlobal,
            isShared,
            value: parent.getValue()
        });
        this.close();
    }
}
