/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {dialog as onsenDialog} from '@xh/hoist/kit/onsen';

import './Dialog.scss';

/**
 * A wrapper around Onsen's dialog, with support for standard layout + styling, titles and buttons
 */
@HoistComponent
export class Dialog extends Component {

    baseClassName = 'xh-dialog';

    render() {
        const {isOpen, onCancel, icon, title, content, buttons = []} = this.props;

        if (!isOpen) return null;

        return onsenDialog({
            isOpen: true,
            isCancelable: true,
            onCancel: onCancel,
            className: this.getClassName(),
            items: [
                div({
                    className: 'xh-dialog__title',
                    items: [icon, title]
                }),
                div({
                    className: 'xh-dialog__inner',
                    item: content
                }),
                div({
                    className: 'xh-dialog__toolbar',
                    omit: !buttons.length,
                    items: [
                        ...buttons
                    ]
                })
            ]
        });
    }

}
export const dialog = elemFactory(Dialog);