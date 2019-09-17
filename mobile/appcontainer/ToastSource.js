/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {head} from 'lodash';
import {hoistCmp, uses} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {toast} from './Toast';
import {ToastSourceModel} from '@xh/hoist/appcontainer/ToastSourceModel';

/**
 *  Support for popping global Toasts into the DOM.
 *
 *  This component uses a queue based approach, and will
 *  ensure only one toast is showing at a time.
 *
 *  @private
 */
export const toastSource = hoistCmp.factory({
    displayName: 'ToastSource',
    model: uses(ToastSourceModel),

    render({model}) {
        const pending = model.toastModels.filter(it => it.isOpen),
            next = head(pending);

        if (!next) return null;

        if (!next.dismissIsPending) {
            wait(next.timeout).then(() => next.dismiss());
            next.dismissIsPending = true;
        }
        return toast({model: next, key: next.xhId});
    }
});