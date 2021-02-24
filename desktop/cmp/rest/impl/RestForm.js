/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {form} from '@xh/hoist/cmp/form';
import {div, filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {RestFormModel} from '@xh/hoist/desktop/cmp/rest/impl/RestFormModel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
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
            item: panel({
                item: formDisplay(),
                bbar: tbar(),
                mask: 'onLoad'
            })
        });
    }
});

const formDisplay = hoistCmp.factory(
    ({model}) => {
        const formFields = model.editors.map(editor => restFormField({editor}));

        return form({
            fieldDefaults: {
                commitOnChange: true,
                minimal: true,
                inline: true,
                labelWidth: 120,
                labelAlign: 'right'
            },
            item: div({
                className: 'xh-rest-form__body',
                items: formFields
            })
        });
    }
);

const tbar = hoistCmp.factory(
    ({model}) => {
        const {formModel, actions, currentRecord, gridModel} = model;
        return toolbar(
            recordActionBar({
                actions,
                gridModel,
                record: currentRecord
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
