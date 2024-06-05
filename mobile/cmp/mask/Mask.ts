/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {box, div, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {spinner as spinnerCmp} from '@xh/hoist/cmp/spinner';
import {hoistCmp, HoistModel, HoistProps, Some, TaskObserver, useLocalModel} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import {withDefault} from '@xh/hoist/utils/js';
import {ReactNode, MouseEvent, RefAttributes} from 'react';
import './Mask.scss';

export interface MaskProps extends HoistProps, RefAttributes<HTMLDivElement> {
    /** Task(s) that should be monitored to determine if the mask should be displayed. */
    bind?: Some<TaskObserver>;
    /** True to display the mask. */
    isDisplayed?: boolean;
    /** Text to be displayed under the loading spinner image */
    message?: ReactNode;
    /** Callback when mask is tapped, relayed to underlying div element. */
    onClick?: (e: MouseEvent) => void;
    /** True (default) to display a spinning image. */
    spinner?: boolean;
}

/**
 * Mask with optional spinner and text.
 *
 * The mask can be explicitly controlled via props or bound to a TaskObserver.
 *
 * Note that the Panel component's `mask` prop provides a common and convenient method for masking
 * sections of the UI without needing to manually create or manage this component.
 */
export const [Mask, mask] = hoistCmp.withFactory<MaskProps>({
    displayName: 'Mask',
    className: 'xh-mask',

    render({isDisplayed, message, spinner = false, onClick, className}, ref) {
        const impl = useLocalModel(LocalMaskModel);

        isDisplayed = isDisplayed ?? impl.task?.isPending;
        message = withDefault(message, impl.task?.message);

        if (!isDisplayed) return null;
        return div({
            ref,
            onClick,
            className,
            item: vbox({
                className: 'xh-mask-body',
                items: [
                    spinner ? spinnerCmp() : null,
                    spinner ? vspacer(10) : null,
                    message ? box({className: 'xh-mask-text', item: message}) : null
                ]
            })
        });
    }
});

class LocalMaskModel extends HoistModel {
    task;

    override onLinked() {
        const {bind} = this.componentProps;
        if (bind) {
            this.task =
                bind instanceof TaskObserver
                    ? bind
                    : this.markManaged(TaskObserver.trackAll({tasks: bind}));
        }
    }
}
