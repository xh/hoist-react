/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {dockContainerImpl as desktopDockContainerImpl} from '@xh/hoist/dynamics/desktop';
import {DockContainerModel} from './DockContainerModel';

export interface DockContainerProps extends HoistProps<DockContainerModel> {
    /** True to style docked headers with reduced padding and font-size. */
    compactHeaders?: boolean;
}

/**
 * DockContainer provides a user-friendly way to render multiple child components "docked" to its
 * bottom edge. Each view is rendered with a configurable header and controls to allow the user to
 * expand it, collapse it, or optionally "pop it out" into a modal dialog.
 *
 * This mirrors the behavior of the familiar Gmail "compose" window and is intended for similar
 * use-cases such as detail panels and forms, where the user might wish to open multiple children
 * in a non-modal and unobtrusive manner.
 *
 * Docked views are sized according to their content. It is recommended to provide the docked
 * content with a fixed size.
 *
 * DockContainerModel configures all aspects of this container, including its views. See that class
 * for more details.
 *
 * @see DockContainerModel
 */
export const [DockContainer, dockContainer] = hoistCmp.withFactory<DockContainerProps>({
    model: uses(DockContainerModel),
    className: 'xh-dock-container',
    render(props, ref) {
        return desktopDockContainerImpl(props, ref);
    }
});
