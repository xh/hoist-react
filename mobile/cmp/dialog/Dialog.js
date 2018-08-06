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
            className: className ? `${baseCls} ${className}` : baseCls,
            items: [
                div({
                    className: `${baseCls}__title`,
                    items: [icon, title]
                }),
                div({
                    className: `${baseCls}__inner`,
                    item: content
                }),
                div({
                    className: `${baseCls}__toolbar`,
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