/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import {hoistComponent, useProvidedModel} from '@xh/hoist/core';
import {filler} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';

import {MessageModel} from '@xh/hoist/core/appcontainer/MessageModel';

/**
 * A modal dialog that supports imperative alert/confirm.
 *
 * @private
 */
export const [Message, message] = hoistComponent(props => {
    const model = useProvidedModel(MessageModel, props),
        isOpen = model && model.isOpen;

    if (!isOpen) return null;

    return dialog({
        isOpen: true,
        isCloseButtonShown: false,
        title: model.title,
        icon: model.icon,
        items: [
            dialogBody(model.message),
            toolbar(getButtons(model))
        ],
        ...props
    });
});


function getButtons(model) {
    const {confirmText, cancelText, confirmIntent, cancelIntent} = model;
    return [
        filler(),
        button({
            text: cancelText,
            omit: !cancelText,
            intent: cancelIntent,
            onClick: () => model.doCancel()
        }),
        button({
            text: confirmText,
            intent: confirmIntent,
            onClick: () => model.doConfirm()
        })
    ];
}
