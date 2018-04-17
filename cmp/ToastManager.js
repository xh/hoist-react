/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Position, Toaster} from 'hoist/kit/blueprint';
import {Icon} from 'hoist/icon';
import {SECONDS} from 'hoist/utils/DateTimeUtils';

export const ToastManager = {

    _toasters: {},

    /**
     * Convenience method to show a toast.
     * The defaults can be overridden.
     *
     * @param {string} message - the message to show in the toast.
     *
     * Returns the unique key of the toast shown.
     */
    show({
        message,
        intent = 'success',
        icon = Icon.check({style: {alignSelf: 'center', marginLeft: '5px'}}),
        timeout = 3 * SECONDS,
        position = Position.BOTTOM_RIGHT
    } = {}
    ) {
        return this.getToaster(position).show({
            intent: intent,
            message: message,
            icon: icon,
            timeout: timeout
        });
    },

    /**
     * Get a toaster instance.  If the instance doesn't exist, it will be made.
     * This method lets you get/create toasters by their Position enum values.
     * Other toaster options cannot be set via this method.

     * If non-default values are needed for a toaster, a different method must be used.
     *
     * @param {string} position - see Blueprintjs Position enum for allowed values. Optional.
     */
    getToaster(position = Position.BOTTOM_RIGHT) {
        const toasters = this._toasters;

        if (position in toasters) return toasters[position];

        return toasters[position] = Toaster.create({position});
    }
};