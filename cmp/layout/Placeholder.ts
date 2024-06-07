/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, BoxProps, setCmpErrorDisplay, HoistPropsWithRef} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';
import './Placeholder.scss';

export interface PlaceholderProps extends HoistPropsWithRef<HTMLDivElement>, BoxProps {}

/**
 * A thin wrapper around `Box` with standardized, muted styling.
 *
 * Intended as an alternative to masking or other approaches when a portion of an application's
 * layout is not yet ready to be rendered - e.g. a detail panel without a current record selection.
 */
export const [Placeholder, placeholder] = hoistCmp.withFactory<PlaceholderProps>({
    displayName: 'Placeholder',
    model: false,
    memo: false,
    observer: false,
    className: 'xh-placeholder',

    render(props, ref) {
        return box({
            ...props,
            ref
        });
    }
});
setCmpErrorDisplay(placeholder);
