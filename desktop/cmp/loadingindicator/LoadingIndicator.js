/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hbox} from '@xh/hoist/cmp/layout';
import {div} from '@xh/hoist/cmp/layout/Tags';
import {spinner as spinnerCmp} from '@xh/hoist/cmp/spinner';
import {hoistCmp, useLocalModel, HoistModel, TaskObserver} from '@xh/hoist/core';
import classNames from 'classnames';
import {truncate} from 'lodash';
import PT from 'prop-types';
import './LoadingIndicator.scss';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * A minimal / unobtrusive LoadingIndicator displaying an optional spinner and/or message to signal
 * that a longer-running operation is in progress, without using a modal Mask. Can be explicitly
 * shown or bound to one or more TaskObservers
 *
 * Note that the Panel component's `loadingIndicator` prop provides a common and convenient way to
 * add an indicator to a Panel without needing to manually create or manage this component.
 */
export const [LoadingIndicator, loadingIndicator] = hoistCmp.withFactory({
    displayName: 'LoadingIndicator',
    className: 'xh-loading-indicator',

    render({
        isDisplayed,
        message,
        maxMessageLength = 30,
        spinner = true,
        corner = 'br',
        className
    }) {
        const impl = useLocalModel(LocalMaskModel);

        isDisplayed = withDefault(isDisplayed, impl.task?.isPending);
        message = withDefault(message,  impl.task?.message);
        message = truncate(message, {length: maxMessageLength});

        if (!isDisplayed || (!spinner && !message)) return null;

        const hasMessageCls = message ? 'xh-loading-indicator--has-message' : null,
            hasSpinnerCls = spinner ? 'xh-loading-indicator--has-spinner' : null,
            cornerCls = `xh-loading-indicator--${corner}`;

        const innerItems = () => {
            let spinnerEl = spinnerCmp({compact: true});

            if (!message) return [spinnerEl];

            const msgBox = div({className: `xh-loading-indicator__message`, item: message});
            if (!spinner) spinnerEl = null;
            return corner === 'tl' || corner === 'bl' ? [spinnerEl, msgBox] : [msgBox, spinnerEl];
        };

        return div({
            className: classNames(className, hasMessageCls, hasSpinnerCls, cornerCls),
            item: hbox(innerItems())
        });
    }
});

LoadingIndicator.propTypes = {

    /** TaskObserver(s) that should be monitored to determine if the Indicator should be displayed. */
    bind: PT.oneOfType([PT.instanceOf(TaskObserver), PT.arrayOf(PT.instanceOf(TaskObserver))]),

    /** Position of the indicator relative to its containing component. */
    corner: PT.oneOf(['tl', 'tr', 'bl', 'br']),

    /** True to display the indicator. */
    isDisplayed: PT.bool,

    /**  Max characters allowed in message, after which it will be elided. Default 30. */
    maxMessageLength: PT.number,

    /** Optional text to be displayed - can also be sourced from bound TaskObserver. */
    message: PT.string,

    /** True (default) to display with an animated spinner. */
    spinner: PT.bool
};


class LocalMaskModel extends HoistModel {
    task;

    onLinked() {
        const {bind} = this.componentProps;
        if (bind) {
            this.task = bind instanceof TaskObserver ?
                bind :
                this.markManaged(TaskObserver.trackAll({tasks: bind}));
        }
    }
}
