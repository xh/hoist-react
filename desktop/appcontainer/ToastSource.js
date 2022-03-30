/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {ToastSourceModel} from '@xh/hoist/appcontainer/ToastSourceModel';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel, uses, lookup} from '@xh/hoist/core';
import {Toaster} from '@xh/hoist/kit/blueprint';
import {isElement, map} from 'lodash';
import {wait} from '../../promise';
import './Toast.scss';

/**
 *  Support for showing Toasts in an application. This component does not render any content
 *  directly, but for technical reasons (primarily symmetry with mobile) it remains a component.
 *  @private
 */
export const toastSource = hoistCmp.factory({
    displayName: 'ToastSource',
    model: uses(ToastSourceModel),

    render() {
        useLocalModel(LocalModel);
        return null;
    }
});


class LocalModel extends HoistModel {

    /** @member {ToastSourceModel} */
    @lookup(ToastSourceModel) sourceModel;

    _toasterMap = new Map();

    onLinked() {
        const {sourceModel} = this;
        this.addReaction({
            track: () => [sourceModel.toastModels, map(sourceModel.toastModels, 'isOpen')],
            run: ([models]) => this.displayPendingToasts(models)
        });
    }

    /** @param {ToastModel[]} models */
    displayPendingToasts(models) {
        models.forEach(model => {
            let {bpId, isOpen, icon, actionButtonProps, position, containerRef, ...rest} = model;

            // 1) If toast is visible and sent to bp, or already obsolete -- nothing to do
            if ((!!bpId) === isOpen) return;

            // 2) ...otherwise this toast needs to be shown or hidden with bp api
            let toaster = this.getToaster(position, containerRef);
            if (!bpId) {
                model.bpId = toaster.show({
                    className: 'xh-toast',
                    icon: div({className: 'xh-toast__icon', item: icon}),
                    action: actionButtonProps,
                    onDismiss: () => wait(0).then(() => model.dismiss()),
                    ...rest
                });
            } else {
                toaster.dismiss(bpId);
            }
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

        // We want to just memoize this by two args (one object)?  Is there a library for this?
        const toasters = toasterMap.get(container) || {};
        if (!toasters[position]) toasters[position] = Toaster.create({position, className}, container);
        toasterMap.set(container, toasters);
        return toasters[position];
    }
}
