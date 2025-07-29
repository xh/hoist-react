/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {MessageModel} from '@xh/hoist/appcontainer/MessageModel';
import {form} from '@xh/hoist/cmp/form';
import {filler, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput, checkbox} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import {executeIfFunction, withDefault} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import './Message.scss';

/**
 * A preconfigured dialog component used to render modal messages.
 * @see XHClass.message()
 * @internal
 */
export const message = hoistCmp.factory({
    model: uses(MessageModel),
    className: 'xh-message',

    render({model, className, ...props}) {
        if (!model.isOpen) return null;

        return dialog({
            isOpen: true,
            isCloseButtonShown: false,
            title: model.title,
            icon: model.icon,
            className: classNames(className, model.className),
            items: [dialogBody(model.message, formCmp()), bbar()],
            onClose: () => model.doEscape(),
            ...props
        });
    }
});

const formCmp = hoistCmp.factory<MessageModel>(({model}) => {
    const {formModel, input, suppressOpts} = model,
        items = [];

    if (!formModel) return null;
    if (input) {
        items.push(
            formField({
                field: 'value',
                item: withDefault(
                    input.item,
                    textInput({
                        autoFocus: true,
                        selectOnFocus: true,
                        onKeyDown: evt => {
                            if (evt.key === 'Enter') model.doConfirmAsync();
                        }
                    })
                )
            })
        );
    }
    if (suppressOpts) {
        let {label} = suppressOpts,
            {suppressExpiryLabel} = model;
        label = executeIfFunction(label);
        label ??= !suppressExpiryLabel
            ? `Don't show this message again`
            : `Don't show this message again for ${suppressExpiryLabel}`;
        items.push(vspacer(20));
        items.push(formField({field: 'suppress', item: checkbox({label})}));
    }

    return form({
        model: formModel,
        fieldDefaults: {commitOnChange: true, minimal: true, label: null},
        items
    });
});

const bbar = hoistCmp.factory<MessageModel>(({model}) => {
    const {confirmProps, cancelProps, cancelAlign, formModel} = model,
        ret = [];

    if (cancelProps) {
        ret.push(button(cancelProps));
    }

    if (cancelAlign === 'left') {
        ret.push(filler());
    } else {
        ret.unshift(filler());
    }

    if (confirmProps) {
        // Merge in formModel.isValid here in render stage to get reactivity.
        ret.push(
            formModel
                ? button({...confirmProps, disabled: !formModel.isValid})
                : button(confirmProps)
        );
    }

    return toolbar(ret);
});
