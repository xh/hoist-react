/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div, filler} from '@xh/hoist/cmp/layout';
import {dialog as onsenDialog} from '@xh/hoist/kit/onsen';

import './Dialog.scss';

/**
 * A wrapper around Onsen's dialog, with support for standard layout + styling, titles and buttons
 */
@HoistComponent()
class Dialog extends Component {

    render() {
        const {isOpen, onCancel, icon, title, content, className, buttons = []} = this.props,
            baseCls = 'xh-dialog';

        if (!isOpen) return null;

        return onsenDialog({
            isOpen: true,
            isCancelable: true,
            onCancel: onCancel,
            cls: className ? `${baseCls} ${className}` : baseCls,
            items: [
                div({
                    cls: `${baseCls}__title`,
                    items: [icon, title]
                }),
                div({
                    cls: `${baseCls}__inner`,
                    item: content
                }),
                div({
                    cls: `${baseCls}__toolbar`,
                    omit: !buttons.length,
                    items: [
                        filler(),
                        ...buttons
                    ]
                })
            ]
        });
    }

}
export const dialog = elemFactory(Dialog);