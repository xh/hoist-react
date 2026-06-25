/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ToastModel} from '@xh/hoist/appcontainer/ToastModel';
import {ToastSourceModel} from '@xh/hoist/appcontainer/ToastSourceModel';
import {hoistCmp, uses} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {head} from 'lodash';
import {toast} from './Toast';

/**
 * Support for rendering Toast alerts.
 * This component uses a queue based approach, ensuring only one toast is showing at a time.
 * @internal
 */
export const toastSource = hoistCmp.factory({
    displayName: 'ToastSource',
    model: uses(ToastSourceModel),

    render({model}) {
        const pending: ToastModel[] = model.toastModels.filter(it => it.isOpen),
            next = head(pending);

        if (!next) return null;

        if (!(next as any).dismissIsPending) {
            wait(next.timeout).then(() => next.dismiss());
            (next as any).dismissIsPending = true;
        }
        return toast({model: next, key: next.xhId});
    }
});
