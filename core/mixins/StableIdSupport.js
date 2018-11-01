/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {provideMethods, overrideMethods, markClass, withDefault} from '@xh/hoist/utils/js';

/**
 * Mixin to add ability to generate globally unique ids for a component that are
 * stable within multiple invocations of render()
 */
export function StableIdSupoort(C) {

    markClass(C, 'hasStableIdSupport');

    overrideMethods(C, {
        render(existing)  {
            return function() {
                this._renderUniqueId = 0;
                return existing.call(this);
            };
        }
    });

    provideMethods(C, {
        stableId() {
            this._componentUniqueId = withDefault(this._componentUniqueId || XH.genId());
            this._renderUniqueId = withDefault(this._renderUniqueId, 0);
            return this._componentUniqueId + '_' + this._renderUniqueId;
        }
    });

    return C;
}