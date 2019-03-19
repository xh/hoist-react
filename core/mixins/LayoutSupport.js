/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {applyMixin} from '@xh/hoist/utils/js';
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';

/**
 * Supports accepting an enumerated set of core CSS styles as top-level props of a Component.
 *
 * @see getLayoutProps for supported properties and overall documentation on this system, including
 * important notes on what Components must do to ensure layout props are actually applied.
 */
export function LayoutSupport(C) {
    return applyMixin(C, {
        name: 'LayoutSupport',

        provides: {

            getLayoutProps() {
                return getLayoutProps(this.props);
            },

            getNonLayoutProps() {
                return getNonLayoutProps(this.props);
            }
        }
    });
}
