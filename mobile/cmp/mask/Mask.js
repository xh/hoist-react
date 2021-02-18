/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {box, div, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {progressCircular} from '@xh/hoist/kit/onsen';
import PT from 'prop-types';
import './Mask.scss';

/**
 * Mask with optional spinner and text.
 *
 * The mask can be explicitly shown or reactively bound to a PendingTaskModel.
 */
export const [Mask, mask] = hoistCmp.withFactory({
    displayName: 'Mask',
    className: 'xh-mask',

    render({
        model,
        className,
        message = model?.message,
        isDisplayed = model?.isPending || false,
        spinner = false,
        onClick
    }, ref) {
        if (!isDisplayed) return null;

        return div({
            ref,
            onClick,
            className,
            item: vbox({
                className: 'xh-mask-body',
                items: [
                    spinner ? progressCircular({indeterminate: true}) : null,
                    spinner ? vspacer(10) : null,
                    message ? box({className: 'xh-mask-text', item: message}) : null
                ]
            })
        });
    }
});

Mask.propTypes = {
    /** True to display the mask. */
    isDisplayed: PT.bool,

    /** Text to be displayed under the loading spinner image */
    message: PT.string,

    /** Callback when mask is tapped, relayed to underlying div element. */
    onClick: PT.func,

    /** True (default) to display a spinning image. */
    spinner: PT.bool
};
