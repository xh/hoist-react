/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {form} from '@xh/hoist/cmp/form';
import {filler, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {RestFormModel} from '@xh/hoist/desktop/cmp/rest/impl/RestFormModel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import './RestForm.scss';
import {restFormField} from './RestFormField';

export const restForm = hoistCmp.factory({
    displayName: 'RestForm',
    model: uses(RestFormModel),
    className: 'xh-rest-form',

    render({model, className}) {
        const {isAdd, readonly, isOpen} = model;
        if (!isOpen) return null;

        return dialog({
            title: isAdd ? 'Add Record' : (!readonly ? 'Edit Record' : 'View Record'),
            icon: isAdd ? Icon.add() : Icon.edit(),
            className,
            isOpen: true,
            isCloseButtonShown: false,
            items: [
                formDisplay(),
                tbar(),
                mask({model: model.loadModel, spinner: true})
            ]
        });
    }
});

const formDisplay = hoistCmp.factory(
    ({model}) => {
        const formFields = model.editors.map(editor => restFormField({editor}));

        return dialogBody(
            form({
                fieldDefaults: {
                    commitOnChange: true,
                    minimal: true,
                    inline: true,
                    labelWidth: 120,
                    labelAlign: 'right'
                },
                item: vframe(formFields)
            })
        );
    }
);

const tbar = hoistCmp.factory(
    ({model}) => {
        const {formModel} = model;
        return toolbar(
            recordActionBar({
                actions: model.actions,
                record: model.currentRecord,
                gridModel: model.parent.gridModel
            }),
            filler(),
            button({
                text: formModel.readonly ? 'Close' : 'Cancel',
                onClick: () => model.close()
            }),
            button({
                text: 'Save',
                icon: Icon.check(),
                intent: 'success',
                disabled: !model.isAdd && !formModel.isDirty,
                onClick: () => model.validateAndSaveAsync(),
                omit: formModel.readonly
            })
        );
    }
);