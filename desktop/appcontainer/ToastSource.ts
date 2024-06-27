/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {OverlayToasterProps} from '@blueprintjs/core';
import {ToastModel} from '@xh/hoist/appcontainer/ToastModel';
import {ToastSourceModel} from '@xh/hoist/appcontainer/ToastSourceModel';
import {div} from '@xh/hoist/cmp/layout';
import {
    elementFactory,
    hoistCmp,
    HoistModel,
    lookup,
    PlainObject,
    useLocalModel,
    uses,
    XH
} from '@xh/hoist/core';
import {OverlayToaster, ToasterPosition} from '@xh/hoist/kit/blueprint';
import {getOrCreate} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isElement, map} from 'lodash';
import {RefAttributes} from 'react';
import {createRoot} from 'react-dom/client';
import {wait} from '../../promise';
import './Toast.scss';

/**
 *  Support for showing Toasts in an application. This component does not render any content
 *  directly, but for technical reasons (primarily symmetry with mobile) it remains a component.
 *  @internal
 */
export const toastSource = hoistCmp.factory({
    displayName: 'ToastSource',
    model: uses(ToastSourceModel),

    render() {
        useLocalModel(ToastSourceLocalModel);
        return null;
    }
});

class ToastSourceLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(ToastSourceModel)
    sourceModel: ToastSourceModel;

    _toasterMap = new Map();

    override onLinked() {
        const {sourceModel} = this;
        this.addReaction({
            track: () => [sourceModel.toastModels, map(sourceModel.toastModels, 'isOpen')] as const,
            run: ([models]) => this.displayPendingToastsAsync(models)
        });
    }

    async displayPendingToastsAsync(models: ToastModel[]) {
        for (const model of models) {
            const {isOpen, icon, intent, actionButtonProps, position, containerRef, ...rest} =
                model;

            const bpId = model['bpId'];

            // 1) If toast is visible and sent to bp, or already obsolete -- nothing to do
            if (!!bpId === isOpen) continue;

            // 2) ...otherwise this toast needs to be shown or hidden with bp api
            let toaster = await this.getToasterAsync(position as ToasterPosition, containerRef);
            if (!bpId) {
                model['bpId'] = toaster.show({
                    className: classNames('xh-toast', `xh-bg-intent-${intent}`),
                    icon: div({className: 'xh-toast__icon', item: icon}),
                    action: actionButtonProps,
                    onDismiss: () => wait(0).then(() => model.dismiss()),
                    intent,
                    ...rest
                });
            } else {
                toaster.dismiss(bpId);
            }
        }
    }

    /**
     * Get a toaster instance. If the instance doesn't exist, it will be made.
     * This method lets you get/create toasters by their Position enum values.
     * Other toaster options cannot be set via this method.

     * If non-default values are needed for a toaster, a different method must be used.
     *
     * @param position - position on screen where toast should appear.
     * @param container - DOM Element used to position (contain) the toast.
     */
    async getToasterAsync(position: ToasterPosition, container: HTMLElement) {
        if (container && !isElement(container)) {
            this.logWarn('Ignoring invalid containerRef for Toast - must be a DOM element');
            container = null;
        }
        const className = `xh-toast-container ${container ? 'xh-toast-container--anchored' : ''}`;

        container = container ?? document.body;

        // We want to just memoize this by two args, one of which is an object?
        const toasterMap = this._toasterMap,
            toasters = getOrCreate(toasterMap, container, () => ({}));
        if (!toasters[position]) {
            toasters[position] = await this.createToaster({position, className}, container);
        }
        return toasters[position];
    }

    /**
     * Workaround to avoid calling OverlayToaster.create(). It uses ReactDOM.render
     * that gives a warning because it is deprecated in React 18.
     *
     * The use of ReactDOM.render set to be removed from OverlayToaster.create() in Blueprint v6.0
     * https://github.com/palantir/blueprint/issues/5212#issuecomment-1294958195
     */
    private createToaster(props: PlainObject, container: HTMLElement): Promise<OverlayToaster> {
        const containerElement = document.createElement('div');
        container.appendChild(containerElement);
        const root = createRoot(containerElement);
        return new Promise((resolve, reject) => {
            root.render(
                overlayToaster({
                    ...props,
                    usePortal: false,
                    ref: instance => {
                        instance
                            ? resolve(instance)
                            : reject(XH.exception('Unable to create Blueprint toaster.'));
                    }
                })
            );
        });
    }
}

// `OverlayToasterProps` does not include `ref` prop, so we need to add it manually
const overlayToaster = elementFactory<any, OverlayToasterProps & RefAttributes<OverlayToaster>>(
    OverlayToaster
);
