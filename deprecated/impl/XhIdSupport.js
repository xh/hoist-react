/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {applyMixin} from './ClassUtils';

/**
 * @private
 */
export function XhIdSupport(C) {
    return applyMixin(C, {
        name: 'XhIdSupport',

        provides: {
            xhId: {
                get() {
                    if (!this._xhId) this._xhId = XH.genId();
                    return this._xhId;
                }
            }
        }
    });
}
