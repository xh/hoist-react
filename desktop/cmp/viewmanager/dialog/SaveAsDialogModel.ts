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
    normalizeGroupPath,
    VIEW_GROUP_DELIMITER,
    ViewManagerModel
} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {some} from 'lodash';

/**
 * Backing model for ViewManagerModel's SaveAs
 */
export class SaveAsDialogModel extends HoistModel {
    readonly parent: ViewManagerModel;

    @managed readonly formModel: FormModel;
    @observable isOpen: boolean = false;

    /** True to show the text input naming a new group to create under the selected group. */
    @bindable isAddingSubgroup: boolean = false;

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
            subgroup: null,
            // Do not copy description or visibility from source view
            description: null,
            visibility: 'private',
            isPinned: !!src.info?.isPinned
        });

        this.isAddingSubgroup = false;
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
                {
                    name: 'subgroup',
                    displayName: 'Sub Group',
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

    private async doSaveAsAsync() {
        let {formModel, parent} = this,
            {typeDisplayName, globalDisplayName} = parent,
            {name, group, subgroup, description, visibility} = formModel.getData(),
            isValid = await formModel.validateAsync(),
            isGlobal = visibility === 'global',
            isShared = visibility === 'shared';

        if (!isValid) return;

        if (isGlobal) {
            const confirmed = await XH.confirm({
                message: fragment(
                    p(
                        `This ${typeDisplayName} will become a ${globalDisplayName} ${typeDisplayName} visible to all other ${XH.appName} users.`
                    ),
                    p(strong('Are you sure you want to proceed?'))
                ),
                confirmProps: {
                    text: `Yes, save ${globalDisplayName} ${typeDisplayName}`,
                    outlined: true,
                    autoFocus: false,
                    intent: 'primary'
                }
            });
            if (!confirmed) return;
        }

        const base = normalizeGroupPath(group),
            trimmedSubgroup = subgroup?.trim();

        await parent.saveAsAsync({
            name: name.trim(),
            group: trimmedSubgroup ? composeGroupPath(base, trimmedSubgroup) : base,
            description: description?.trim(),
            isGlobal,
            isShared,
            value: parent.getValue()
        });
        this.close();
    }
}
