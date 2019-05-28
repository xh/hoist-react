/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {Component} from 'react';
import {truncate} from 'lodash';

import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {box, filler, hbox} from '@xh/hoist/cmp/layout';
import {div} from '@xh/hoist/cmp/layout/Tags';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {spinner} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';


import './LoadingIndicator.scss';

/**
 * LoadingIndicator with optional spinner and text - can be explicitly shown or bound to a PendingTaskModel.
 *
 * Note that the Panel component's `mask` prop provides a common and convenient method for masking
 * sections of the UI without needing to manually create or manage this component.
 */
@HoistComponent
export class LoadingIndicator extends Component {

    static modelClass = PendingTaskModel;

    static propTypes = {

        /** True to display mask. */
        isDisplayed: PT.bool,

        /** Optional text to be displayed. */
        message: PT.string,

        /** The max number of characters allowed in the message,
         *  after which the message is truncated with an ellipsis
         *  Default: 30
         */
        messageMaxLength: PT.number,

        /** True to display a spinning image.  Default false. */
        spinner: PT.bool,

        /** Click handler **/
        onClick: PT.func,

        /** The panel corner in which the indicator will appear
         *  tl
         *  tr
         *  bl
         *  br (default)
         */
        corner: PT.string
    };

    baseClassName = 'xh-loading-indicator';
    
    render() {
        const {props} = this,
            {model} = props,
            isDisplayed = withDefault(props.isDisplayed, model && model.isPending, false);

        if (!isDisplayed) return null;

        const message = withDefault(props.message, model && model.message),
            showSpinner = withDefault(props.spinner, false),
            onClick = props.onClick,
            hasMessageCls = message ? 'hasMessage' : null,
            corner = withDefault(props.corner, 'br');

        if (!showSpinner && !message) return null;

        return div({
            className: this.getClassName(corner, hasMessageCls),
            onClick,
            item: hbox(this.hBoxItems(corner))
        });
    }

    hBoxItems(corner) {
        const {props} = this,
            {model} = props,
            message = withDefault(props.message, model && model.message),
            showSpinner = withDefault(props.spinner, false),
            messageMaxLength = withDefault(props.messageMaxLength, 40);

        if (!message) return [spinner()];

        const msgBox = box({
                className: 'xh-loading-indicator__message',
                item: truncate(message, {length: messageMaxLength, separator: ' '})
            }),
            spinnerEl = showSpinner ? spinner() : null;

        switch (corner) {
            case 'tl':
            case 'bl': return [
                spinnerEl,
                msgBox
            ];
            case 'tr':
            case 'br': return [
                msgBox,
                filler(),
                spinnerEl
            ];
        }
    }
}
export const loadingIndicator = elemFactory(LoadingIndicator);


