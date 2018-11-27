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
import {withDefault} from '@xh/hoist/utils/js';


import './Dialog.scss';

/**
 * A wrapper around Onsen's dialog, with support for standard layout + styling, titles and buttons
 */
@HoistComponent
export class Dialog extends Component {

    render() {
        const {isOpen, onCancel, icon, title, content, className, buttons = []} = this.props,
            baseClassName = 'xh-dialog';

        if (!isOpen) return null;

        return onsenDialog({
            isOpen: true,
            isCancelable: true,
            onCancel: onCancel,
            className: className ? `${baseClassName} ${className}` : baseClassName,
            items: [
                div({
                    className: `${baseClassName}__title`,
                    items: [icon, title]
                }),
                div({
                    className: `${baseClassName}__inner`,
                    item: content
                }),
                div({
                    className: `${baseClassName}__toolbar`,
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