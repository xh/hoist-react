/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {hbox} from '@xh/hoist/cmp/layout';
import {div} from '@xh/hoist/cmp/layout/Tags';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {progressCircular} from '@xh/hoist/kit/onsen';
import {withDefault} from '@xh/hoist/utils/js';
import {truncate} from 'lodash';

import './LoadingIndicator.scss';


/**
 * A minimal / unobtrusive LoadingIndicator displaying an optional spinner and/or message to signal
 * that a longer-running operation is in progress, without using a modal Mask. Can be explicitly
 * shown or bound to a PendingTaskModel.
 *
 * Note that the Panel component's `loadingIndicator` prop provides a common and convenient way to
 * add an indicator to a Panel without needing to manually create or manage this component.
 */
@HoistComponent
export class LoadingIndicator extends Component {

    static modelClass = PendingTaskModel;

    static propTypes = {

        /** Position of the indicator relative to its containing component. */
        corner: PT.oneOf(['tl', 'tr', 'bl', 'br']),

        /** True to display the indicator. */
        isDisplayed: PT.bool,

        /**  Max characters allowed in message, after which it will be elided. Default 30. */
        maxMessageLength: PT.number,

        /** Optional text to be displayed - can also be sourced from bound PendingTaskModel. */
        message: PT.string,

        /** Optional model for reactively showing the indicator while tasks are pending. */
        model: PT.instanceOf(PendingTaskModel),

        /** True (default) to display with an animated spinner. */
        spinner: PT.bool

    };

    baseClassName = 'xh-loading-indicator';
    spinnerSize = 20;

    render() {
        const {props, model, message, showSpinner, corner} = this,
            isDisplayed = withDefault(props.isDisplayed, model && model.isPending, false);

        if (!isDisplayed || (!showSpinner && !message)) return null;

        const hasMessageCls = message ? 'xh-loading-indicator--has-message' : null,
            hasSpinnerCls = showSpinner ? 'xh-loading-indicator--has-spinner' : null,
            cornerCls = `xh-loading-indicator--${corner}`;

        return div({
            className: this.getClassName(hasMessageCls, hasSpinnerCls, cornerCls),
            item: hbox(this.renderInnerItems())
        });
    }


    //------------------------
    // Implementation
    //------------------------
    renderInnerItems() {
        const {corner, message, showSpinner} = this,
            spinnerEl = progressCircular({indeterminate: true});

        if (!message) return [spinnerEl];

        const msgBox = div({
            className: `${this.baseClassName}__message`,
            item: message
        });

        switch (corner) {
            case 'tl':
            case 'bl': return [showSpinner ? spinnerEl : null, msgBox];
            case 'tr':
            case 'br': return [msgBox, showSpinner ? spinnerEl : null];
        }
    }

    get message() {
        const {message, model} = this.props;
        return truncate(withDefault(message, model && model.message), {length: this.maxMessageLength});
    }

    get maxMessageLength() {
        return withDefault(this.props.maxMessageLength, 30);
    }

    get showSpinner() {
        return withDefault(this.props.spinner, true);
    }

    get corner() {
        return withDefault(this.props.corner, 'br');
    }

}
export const loadingIndicator = elemFactory(LoadingIndicator);
