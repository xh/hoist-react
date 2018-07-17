/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React from 'react';
import {HoistModel} from '@xh/hoist/core';
import {defaultTo, defaults} from 'lodash';
import {Position, Toaster} from '@xh/hoist/kit/blueprint';

/**
 *  Support for showing global Toasts in an application.
 *  Automatically created and installed by AppContainer.
 *  @private
 */
@HoistModel()
export class ToastManager {

    model = null;

    _toasters = {};

    /**
     * @param {ToastManagerModel} model
     */
    constructor({model}) {
        this.model = model;
        this.addReaction({
            track: () => this.model.toastModels,
            run: (models) => this.displayToastsReaction(models)
        });
    }

    //-----------------------------------
    // Implementation
    //------------------------------------
    displayToastsReaction(models) {
        // Show any pending Toast.
        models.forEach(model => {
            const {isShown, isDismissed, icon, position, ...rest} = model;
            if (isShown || isDismissed) return;

            this.getToaster(position).show({
                icon: this.getStyledIcon(icon),
                onDismiss: () => model.onDismiss(),
                ...rest
            });

            model.onShow();
        });
    }

    /**
     * Get a toaster instance.  If the instance doesn't exist, it will be made.
     * This method lets you get/create toasters by their Position enum values.
     * Other toaster options cannot be set via this method.

     * If non-default values are needed for a toaster, a different method must be used.
     *
     * @param {string} [position] - see Blueprint Position enum for allowed values.
     */
    getToaster(position = Position.BOTTOM_RIGHT) {
        const toasters = this._toasters;

        if (position in toasters) return toasters[position];

        return toasters[position] = Toaster.create({position});
    }

    getStyledIcon(icon) {
        const props = {};

        props.style = defaultTo(icon.props.style, {});
        defaults(props.style, {alignSelf: 'center', marginLeft: '5px'});

        return React.cloneElement(icon, props);
    }

}