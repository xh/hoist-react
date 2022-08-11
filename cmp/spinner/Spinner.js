/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {img} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import PT from 'prop-types';
import compactSpinnerImg from './spinner-20px.png';
import spinnerImg from './spinner-50px.png';

/**
 * Returns an img-based spinner in one of two sizes - default 50px spinner or smaller 20px spinner
 * when `compact: true`. Used for the platform-specific `Mask` and `LoadingIndicator` components.
 *
 * Note that the source images are animated PNGs generated via https://loading.io. These are used
 * in place of SVG-based options to reduce rendering overhead, especially when accessing an app
 * via a remote desktop technology such as Citrix (where the spinners bundled with e.g. Blueprint
 * were observed to cause unpredictable and unexpectedly severe performance issues).
 */
export const [Spinner, spinner] = hoistCmp.withFactory({
    displayName: 'Spinner',
    className: 'xh-spinner',
    model: false,
    observer: false,

    render({compact, className, ...props}) {
        const pxSize = compact ? '20px' : '50px';
        return img({
            src: compact ? compactSpinnerImg : spinnerImg,
            width: pxSize,
            height: pxSize,
            className,
            ...props
        });
    }
});

Spinner.propTypes = {
    /** Additional custom className. */
    className: PT.string,

    /** True to return a smaller 20px image vs default 50px. */
    compact: PT.bool
};
