/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import React from 'react';
import {HoistModel} from '@xh/hoist/core';
import {defaultTo, defaults, isElement} from 'lodash';
import {Position, Toaster} from '@xh/hoist/kit/blueprint';

import './Toast.scss';

/**
 *  Support for showing publishing Blueprint Toasts in an application.
 *
 *  @private
 */
@HoistModel
export class ToastSource {

    _toasters = {};

    constructor(toastSourceModel) {
        this.addReaction({
            track: () => toastSourceModel.toastModels,
            run: this.displayPendingToasts
        });
    }

    //-----------------------------------
    // Implementation
    //------------------------------------
    displayPendingToasts(models) {
        models.forEach(model => {
            let {wasShown, isOpen, icon, position, containerRef, ...rest} = model;
            if (wasShown || !isOpen) return;

            position = position || Position.BOTTOM_RIGHT;
            this.getToaster(position, containerRef).show({
                icon: this.getStyledIcon(icon),
                className: 'xh-toast',
                onDismiss: () => model.dismiss(),
                ...rest
            });

            model.wasShown = true;
        });
    }

    /**
     * Get a toaster instance.  If the instance doesn't exist, it will be made.
     * This method lets you get/create toasters by their Position enum values.
     * Other toaster options cannot be set via this method.

     * If non-default values are needed for a toaster, a different method must be used.
     *
     * @param {string} [position] - see Blueprint Position enum for allowed values.
     * @params {HTMLElement} [containerRef] - DOM Element used to position (contain) the toast.
     */
    getToaster(position, containerRef) {

        if (containerRef && !isElement(containerRef)) {
            console.warn('containerRef argument for Toast must be a DOM element. Argument will be ignored.');
            containerRef = null;
        }
        const toasters = this._toasters,
            container = containerRef ? containerRef : document.body,
            containerId = containerRef ? containerRef.id : 'viewport',
            className = `xh-toast-container ${containerRef ? 'xh-toast-container--anchored' : ''}`,
            toasterId = containerId + '--' + position;

        if (toasterId in toasters) return toasters[toasterId];

        return toasters[toasterId] = Toaster.create({position, className}, container);
    }

    getStyledIcon(icon) {
        const props = {};

        props.style = defaultTo(icon.props.style, {});
        defaults(props.style, {alignSelf: 'center', marginLeft: '5px'});

        return React.cloneElement(icon, props);
    }
}