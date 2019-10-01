/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistCmp} from '@xh/hoist/core';
import {div, vbox, vspacer, box} from '@xh/hoist/cmp/layout';
import {progressCircular} from '@xh/hoist/kit/onsen';

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
    }) {
        if (!isDisplayed) return null;

        return div({
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