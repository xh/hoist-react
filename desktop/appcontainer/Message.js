/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {filler, fragment, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {MessageModel} from '@xh/hoist/appcontainer/MessageModel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {dialog} from '@xh/hoist/desktop/cmp/dialog';
import {withDefault} from '@xh/hoist/utils/js';

import './Message.scss';

/**
 * A preconfigured dialog component used to render modal messages.
 * Not intended for direct application use. {@see XHClass#message()} and related for the public API.
 * @private
 */
export const message = hoistCmp.factory({
    model: uses(m => m instanceof MessageModel),
    className: 'xh-message',

    render({model, ...props}) {

        return dialog({
            title: model.title,
            icon: model.icon,
            ...props
        });
    }
});

export const messageContent = hoistCmp.factory({
    model: uses(m => m instanceof MessageModel),
    render({model}) {
        return fragment(
            vframe({
                margin: '20px',
                items: [
                    model.message,
                    inputCmp()
                ]
            }),
            bbar()
        );
    }
});

const inputCmp = hoistCmp.factory(
    ({model}) => {
        const {formModel, input} = model;
        if (!formModel) return null;
        return form({
            model: formModel,
            fieldDefaults: {commitOnChange: true, minimal: true, label: null},
            item: formField({
                field: 'value',
                item: withDefault(input.item, textInput({
                    autoFocus: true,
                    selectOnFocus: true,
                    onKeyDown: evt => {if (evt.key == 'Enter') model.doConfirmAsync();}
                }))
            })
        });
    }
);

const bbar = hoistCmp.factory(
    ({model}) => {
        const {confirmProps, cancelProps, formModel} = model,
            ret = [filler()];

        if (cancelProps) {
            ret.push(button(cancelProps));
        }

        if (confirmProps) {
            // Merge in formModel.isValid here in render stage to get reactivity.
            ret.push(formModel ?
                button({...confirmProps, disabled: !formModel.isValid}) :
                button(confirmProps)
            );
        }

        return toolbar(ret);
    }
);
