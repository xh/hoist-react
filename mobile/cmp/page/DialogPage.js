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

import './DialogPage.scss';
import {page, Page} from './Page';

/**
 * Wraps a Page in a fullscreen Dialog.
 *
 * These pages do not participate in navigation or routing, and are used for showing fullscreen
 * views outside of the Navigator / TabContainer context.
 *
 * Todo: Replace with DialogPanel once Panel is merged?
 */
@HoistComponent
export class DialogPage extends Component {

    static propTypes = {
        ...Page.propTypes,

        /** Is the dialog page shown.  */
        isOpen: PT.bool
    };

    render() {
        const {isOpen, children, ...rest} = this.props;

        if (!isOpen) return null;

        return dialog({
            isOpen: true,
            isCancelable: false,
            className: 'xh-dialog xh-dialog-page',
            items: page({
                items: castArray(children),
                ...rest
            })
        });
    }
}

export const dialogPage = elemFactory(DialogPage);