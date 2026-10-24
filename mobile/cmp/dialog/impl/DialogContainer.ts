/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import {useEffect} from 'react';
import './DialogContainer.scss';

export interface DialogContainerProps extends HoistProps {
    /** True to call `onCancel` when the backdrop is tapped or the Escape key is pressed. */
    isCancelable?: boolean;
    onCancel?: () => void;
}

/**
 * Full-screen backdrop with a centered frame for a dialog's content. `Dialog` and `DialogPanel`
 * render their content within this container - it has no chrome of its own.
 *
 * @internal
 */
export const dialogContainer = hoistCmp.factory<DialogContainerProps>({
    displayName: 'DialogContainer',
    model: false,
    memo: false,
    observer: false,

    render({className, isCancelable, onCancel, children}) {
        const cancel = isCancelable && onCancel ? onCancel : null;

        useEffect(() => {
            if (!cancel) return;
            const onKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') cancel();
            };
            document.addEventListener('keydown', onKeyDown);
            return () => document.removeEventListener('keydown', onKeyDown);
        }, [cancel]);

        return div({
            className,
            items: [
                div({className: 'xh-dialog__mask', onClick: cancel}),
                div({
                    className: 'xh-dialog__frame',
                    item: div({className: 'xh-dialog__container', items: children})
                })
            ]
        });
    }
});
