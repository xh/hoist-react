/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistCmp} from '@xh/hoist/core';
import {hbox} from '@xh/hoist/cmp/layout';
import {div} from '@xh/hoist/cmp/layout/Tags';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {progressCircular} from '@xh/hoist/kit/onsen';
import {truncate} from 'lodash';
import classNames from 'classnames';

import './LoadingIndicator.scss';

/**
 * A minimal / unobtrusive LoadingIndicator displaying an optional spinner and/or message to signal
 * that a longer-running operation is in progress, without using a modal Mask. Can be explicitly
 * shown or bound to a PendingTaskModel.
 *
 * Note that the Panel component's `loadingIndicator` prop provides a common and convenient way to
 * add an indicator to a Panel without needing to manually create or manage this component.
 */
export const [LoadingIndicator, loadingIndicator] = hoistCmp.withFactory({
    displayName: 'LoadingIndicator',
    className: 'xh-loading-indicator',

    render({
        model,
        message = model?.message || null,
        spinner = true,
        corner = 'br',
        maxMessageLength = 30,
        isDisplayed = model?.isPending || false,
        className
    }) {

        message = truncate(message, {length: maxMessageLength});
        if (!isDisplayed || (!spinner && !message)) return null;

        const innerItems = () =>  {
            const spinnerEl = progressCircular({indeterminate: true});
            if (!message) return [spinnerEl];
            const msgBox = div({className: `$xh-loading-indicator__message`, item: message});

            return corner === 'tl' || corner === 'bl' ?
                [spinner ? spinnerEl : null, msgBox] :
                [msgBox, spinner ? spinnerEl : null];
        };

        const hasMessageCls = message ? 'xh-loading-indicator--has-message' : null,
            hasSpinnerCls = spinner ? 'xh-loading-indicator--has-spinner' : null,
            cornerCls = `xh-loading-indicator--${corner}`;

        return div({
            className: classNames(className, hasMessageCls, hasSpinnerCls, cornerCls),
            item: hbox(innerItems())
        });
    }
});

LoadingIndicator.propTypes = {

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
