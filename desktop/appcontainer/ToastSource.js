/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import React from 'react';
import {HoistModel, uses, hoistCmp, useLocalModel} from '@xh/hoist/core';
import {defaultTo, defaults, isElement} from 'lodash';
import {withDefault} from '@xh/hoist/utils/js';
import {Position, Toaster} from '@xh/hoist/kit/blueprint';

import {ToastSourceModel} from '@xh/hoist/appcontainer/ToastSourceModel';

import './Toast.scss';

/**
 *  Support for showing Toasts in a  application.
 *
 *  Unusually, this component does not actually render any content, declaratively,
 *  but for technical reasons, (primarily symmetry with mobile) it remains a component.
 *
 *  @private
 */
export const toastSource = hoistCmp.factory({
    displayName: 'ToastSource',
    model: uses(ToastSourceModel),

    render({model}) {
        useLocalModel(() => new LocalModel(model));

        return null;
    }
});


@HoistModel
class LocalModel {

    _toasterMap = new Map();

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
        const toasterMap = this._toasterMap,
            container = containerRef ? containerRef : document.body,
            className = `xh-toast-container ${containerRef ? 'xh-toast-container--anchored' : ''}`;

        position = withDefault(position, 'top');

        // We want to just memoize this by two args (one object)?  Is there a library for this?
        const toasters = toasterMap.get(container) || {};
        if (!toasters[position]) toasters[position] = Toaster.create({position, className}, container);
        toasterMap.set(container, toasters);
        return toasters[position];
    }

    getStyledIcon(icon) {
        const props = {};

        props.style = defaultTo(icon.props.style, {});
        defaults(props.style, {alignSelf: 'center', marginLeft: '5px'});

        return React.cloneElement(icon, props);
    }
}