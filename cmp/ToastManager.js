/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React from 'react';
import {defaultTo, defaults} from 'lodash';
import {Position, Toaster} from 'hoist/kit/blueprint';
import {Icon} from 'hoist/icon';
import {SECONDS} from 'hoist/utils/DateTimeUtils';

export const ToastManager = {

    _toasters: {},
    _defaultIconStyles: {
        alignSelf: 'center',
        marginLeft: '5px'
    },

    /**
     * Show a 'Toast' message.
     *
     * @param {string} message - the message to show in the toast.
     * @param {element} icon - icon to be displayed
     * @param {number} timeout - time in milliseconds to display the message.
     * @param {string} intent - the Blueprint intent.
     * @param {string} position - position in viewport to display. See Blueprint Position enum. 
     * @returns {string} - the unique key of the toast shown.
     */
    show({
        message,
        icon = Icon.check(),
        timeout = 3 * SECONDS,
        intent = 'success',
        position = Position.BOTTOM_RIGHT
    }) {
        return this.getToaster(position).show({
            message,
            icon: this.getStyledIcon(icon),
            timeout,
            intent
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
    },

    //---------------------------
    // Implementation
    //---------------------------
    getStyledIcon(icon) {
        const props = {};

        props.style = defaultTo(icon.props.style, {});
        defaults(props.style, this._defaultIconStyles);

        return React.cloneElement(icon, props);
    }
};
