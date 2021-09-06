/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hbox} from '@xh/hoist/cmp/layout';
import {div} from '@xh/hoist/cmp/layout/Tags';
import {hoistCmp, useLocalModel, HoistModel, TaskObserver} from '@xh/hoist/core';
import {spinner as spinnerCmp} from '@xh/hoist/cmp/spinner';
import {withDefault, apiRemoved} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {truncate} from 'lodash';
import PT from 'prop-types';
import './LoadingIndicator.scss';

/**
 * A minimal / unobtrusive LoadingIndicator displaying an optional spinner and/or message to signal
 * that a longer-running operation is in progress, without using a modal Mask. Can be explicitly
 * shown or bound to one or more tasks.
 *
 * Note that the Panel component's `loadingIndicator` prop provides a common and convenient way to
 * add an indicator to a Panel without needing to manually create or manage this component.
 */
export const [LoadingIndicator, loadingIndicator] = hoistCmp.withFactory({
    displayName: 'LoadingIndicator',
    className: 'xh-loading-indicator',
    model: false,

    render({
        bind,
        isDisplayed,
        message,
        spinner = true,
        corner = 'br',
        maxMessageLength = 30,
        className,
        model
    }, ref) {
        apiRemoved('LoadingIndicator.model', {test: model, msg: "Use 'bind' instead", v: 'v44'});

        const impl = useLocalModel(() => new LocalMaskModel(bind));

        isDisplayed = withDefault(isDisplayed, impl.task?.isPending);
        message = withDefault(message, impl.task?.message);
        message = truncate(message, {length: maxMessageLength});

        if (!isDisplayed || (!spinner && !message)) return null;

        const innerItems = () =>  {
            const spinnerEl = spinnerCmp({compact: true});
            if (!message) return [spinnerEl];
            const msgBox = div({className: `xh-loading-indicator__message`, item: message});

            return corner === 'tl' || corner === 'bl' ?
                [spinner ? spinnerEl : null, msgBox] :
                [msgBox, spinner ? spinnerEl : null];
        };

        const hasMessageCls = message ? 'xh-loading-indicator--has-message' : null,
            hasSpinnerCls = spinner ? 'xh-loading-indicator--has-spinner' : null,
            cornerCls = `xh-loading-indicator--${corner}`;

        return div({
            ref,
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

    /** Optional text to be displayed - can also be sourced from bound TaskObserver. */
    message: PT.string,

    /** Optional model for reactively showing the indicator while tasks are pending. */
    bind: PT.oneOf([PT.instanceOf(TaskObserver), PT.arrayOf(PT.instanceOf(TaskObserver))]),

    /** True (default) to display with an animated spinner. */
    spinner: PT.bool
};

class LocalMaskModel extends HoistModel {
    task;
    constructor(bind) {
        super();
        if (bind) {
            this.task = bind instanceof TaskObserver ?
                bind :
                this.markManaged(TaskObserver.trackAll({tasks: bind}));
        }
    }
}