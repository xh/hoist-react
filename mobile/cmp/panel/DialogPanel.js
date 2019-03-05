/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {dialog} from '@xh/hoist/kit/onsen';
import {castArray} from 'lodash';

import './DialogPanel.scss';
import {panel, Panel} from './Panel';

/**
 * Wraps a Panel in a fullscreen Dialog.
 *
 * These views do not participate in navigation or routing, and are used for showing fullscreen
 * views outside of the Navigator / TabContainer context.
 */
@HoistComponent
export class DialogPanel extends Component {

    static propTypes = {
        ...Panel.propTypes,

        /** Is the dialog panel shown.  */
        isOpen: PT.bool
    };

    render() {
        const {isOpen, children, ...rest} = this.props;

        if (!isOpen) return null;

        return dialog({
            isOpen: true,
            isCancelable: false,
            className: 'xh-dialog xh-dialog-panel',
            items: panel({
                items: castArray(children),
                ...rest
            })
        });
    }
}

export const dialogPanel = elemFactory(DialogPanel);