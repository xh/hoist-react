/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {box, div, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {spinner as spinnerCmp} from '@xh/hoist/cmp/spinner';
import {hoistCmp, HoistModel, useLocalModel, TaskObserver} from '@xh/hoist/core';
import {withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import './Mask.scss';

/**
 * Mask with optional spinner and text.
 *
 * The mask can be explicitly controlled via props or bound to a TaskObserver.
 *
 * Note that the Panel component's `mask` prop provides a common and convenient method for masking
 * sections of the UI without needing to manually create or manage this component.
 */
export const [Mask, mask] = hoistCmp.withFactory({
    displayName: 'Mask',
    className: 'xh-mask',
    model: false,

    render({
        bind,
        isDisplayed,
        message,
        spinner = false,
        onClick,
        className,
        model
    }, ref) {
        const impl = useLocalModel(() => new LocalMaskModel(bind));

        isDisplayed = isDisplayed ?? impl.task?.isPending;
        message = withDefault(message, impl.task?.message);

        if (!isDisplayed) return null;
        return div({
            ref,
            onClick,
            className,
            item: vbox({
                className: 'xh-mask-body',
                items: [
                    spinner ? spinnerCmp() : null,
                    spinner ? vspacer(10) : null,
                    message ? box({className: 'xh-mask-text', item: message}) : null
                ]
            })
        });
    }
});

Mask.propTypes = {

    /** Task(s) that should be monitored to determine if the mask should be displayed. */
    bind: PT.oneOfType([PT.instanceOf(TaskObserver), PT.arrayOf(PT.instanceOf(TaskObserver))]),

    /** True to display the mask. */
    isDisplayed: PT.bool,

    /** Text to be displayed under the loading spinner image */
    message: PT.string,

    /** Callback when mask is tapped, relayed to underlying div element. */
    onClick: PT.func,

    /** True (default) to display a spinning image. */
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