/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Position, Toaster} from 'hoist/kit/blueprint';

export const ToastManager = {

    _toasters: {},

    /**
     * Get a toaster instance.  If the instance doesn't exist, it will be made.
     * This method lets you get/create toasters by their Position enum values.
     * Other toaster options cannot be set via this method.

     * If non-default values are needed for a toaster, a different method must be used.
     *
     * @param position a Blueprintjs Position enum. Optional.
     */
    getToaster(position = Position.BOTTOM_RIGHT) {
        const toasters = this._toasters;

        if (position in toasters) return toasters[position];

        return toasters[position] = Toaster.create({position});
    }
};