/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {ToastSourceModel} from '@xh/hoist/appcontainer/ToastSourceModel';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel, uses} from '@xh/hoist/core';
import {Position, Toaster} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {isElement} from 'lodash';

import './Toast.scss';

/**
 *  Support for showing Toasts in a application. This component does not render any content
 *  directly, but for technical reasons (primarily symmetry with mobile) it remains a component.
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

    //------------------------
    // Implementation
    //------------------------
    displayPendingToasts(models) {
        models.forEach(model => {
            let {wasShown, isOpen, icon, position, containerRef, ...rest} = model;
            if (wasShown || !isOpen) return;

            position = position || Position.BOTTOM_RIGHT;
            this.getToaster(position, containerRef).show({
                className: 'xh-toast',
                icon: div({className: 'xh-toast__icon', item: icon}),
                onDismiss: () => model.dismiss(),
                ...rest
            });

            model.wasShown = true;
        });
    }

    /**
     * Get a toaster instance. If the instance doesn't exist, it will be made.
     * This method lets you get/create toasters by their Position enum values.
     * Other toaster options cannot be set via this method.

     * If non-default values are needed for a toaster, a different method must be used.
     *
     * @param {string} [position] - see Blueprint Position enum for allowed values.
     * @param {HTMLElement} [containerRef] - DOM Element used to position (contain) the toast.
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
}
