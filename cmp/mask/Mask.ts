/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {
    hoistCmp,
    HoistModel,
    HoistProps,
    Some,
    TaskObserver,
    useLocalModel,
    XH
} from '@xh/hoist/core';
import {maskImpl as desktopMaskImpl} from '@xh/hoist/dynamics/desktop';
import {maskImpl as mobileMaskImpl} from '@xh/hoist/dynamics/mobile';
import {withDefault} from '@xh/hoist/utils/js';
import {ReactNode, MouseEvent} from 'react';

export interface MaskProps extends HoistProps {
    /** Task(s) that should be monitored to determine if the mask should be displayed. */
    bind?: Some<TaskObserver>;
    /** True (default) to contain mask within its parent, false to fill the viewport. Desktop only. */
    inline?: boolean;
    /** True to display mask. */
    isDisplayed?: boolean;
    /** Optional text to be displayed. */
    message?: ReactNode;
    /** Click handler **/
    onClick?: (e: MouseEvent) => void;
    /** True to display a spinning image.  Default false. */
    spinner?: boolean;
}

/**
 * Mask with optional spinner and text.
 *
 * The mask can be explicitly controlled via props or bound to a Task.
 *
 * Note that the Panel component's `mask` prop provides a common and convenient method for masking
 * sections of the UI without needing to manually create or manage this component.
 */
export const [Mask, mask] = hoistCmp.withFactory<MaskProps>({
    displayName: 'Mask',
    className: 'xh-mask',

    render({isDisplayed, message, onClick, inline = true, spinner = false, className}) {
        const impl = useLocalModel(MaskLocalModel);

        isDisplayed = withDefault(isDisplayed, impl.task?.isPending);
        message = withDefault(message, impl.task?.message);

        if (!isDisplayed) return null;
        return XH.isMobileApp
            ? mobileMaskImpl({message, onClick, spinner, className})
            : desktopMaskImpl({message, onClick, inline, spinner, className});
    }
});

class MaskLocalModel extends HoistModel {
    override xhImpl = true;

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
