/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ToastModel} from '@xh/hoist/appcontainer/ToastModel';
import {ToastSourceModel} from '@xh/hoist/appcontainer/ToastSourceModel';
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, lookup, useLocalModel, uses} from '@xh/hoist/core';
import type {ToasterPosition} from '@xh/hoist/kit/blueprint';
import {OverlayToaster} from '@xh/hoist/kit/blueprint';
import {wait} from '@xh/hoist/promise';
import {getOrCreate} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isElement, map} from 'lodash';

/**
 * Shows toasts with Blueprint's OverlayToaster, for apps that set
 * `ToastSource.defaults.useBlueprint`. Renders no content itself.
 * @internal
 */
export const legacyToastSource = hoistCmp.factory({
    displayName: 'LegacyToastSource',
    model: uses(ToastSourceModel),

    render() {
        useLocalModel(LegacyToastSourceLocalModel);
        return null;
    }
});

class LegacyToastSourceLocalModel extends HoistModel {
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
                    icon: div({className: 'xh-toast__icon', children: icon}),
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

    /** Get or create the toaster for a position within a container. */
    async getToasterAsync(position: ToasterPosition, container: HTMLElement) {
        if (container && !isElement(container)) {
            this.logWarn('Ignoring invalid containerRef for Toast - must be a DOM element');
            container = null;
        }
        const className = `xh-toast-container ${container ? 'xh-toast-container--anchored' : ''}`;

        container = container ?? document.body;

        const toasterMap = this._toasterMap,
            toasters = getOrCreate(toasterMap, container, () => ({}));
        if (!toasters[position]) {
            toasters[position] = await OverlayToaster.create({position, className}, {container});
        }
        return toasters[position];
    }
}
