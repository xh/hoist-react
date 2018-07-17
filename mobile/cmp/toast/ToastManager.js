/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {toast} from './Toast';

/**
 *  Support for showing global Toasts in an application.
 *  Automatically created and installed by AppContainer.
 *  @private
 */
@HoistComponent()
export class ToastManager extends Component {

    render() {
        const models = this.model.toastModels,
            model = models.length ? models[0] : null;

        if (!model || model.isDismissed) return null;

        if (!model.isShown) {
            model.onShow();
            setTimeout(() => model.onDismiss(), model.timeout);
        }

        return toast({model});
    }

}

export const toastManager = elemFactory(ToastManager);