/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {CubeGridModel} from '@xh/hoist/cmp/cubegrid';
import {div, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {colChooser} from '@xh/hoist/desktop/cmp/grid/impl/colchooser/ColChooser';
import type {ModalColChooserModel} from '@xh/hoist/desktop/cmp/grid/impl/colchooser/ModalColChooserModel';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import type {Position} from '@xh/hoist/kit/blueprint';
import {popover} from '@xh/hoist/kit/blueprint';
import {logError, stopPropagation, withDefault} from '@xh/hoist/utils/js';
import type {ButtonProps} from '../Button';
import {button} from '../Button';

export interface ColChooserButtonProps extends ButtonProps {
    /**
     * GridModel or CubeGridModel to which this button should bind. Will find the nearest in
     * context if not provided. A ZoneGridModel has no column chooser - see `zoneMapperButton`.
     */
    gridModel?: GridModel | CubeGridModel;

    /**
     * Overlay to show a modal chooser in (default 'popover'). Ignored by a chooser configured with
     * `mode: 'docked'`, which this button toggles in place.
     */
    modalTarget?: 'dialog' | 'popover';

    /**
     * Position for chooser popover, as per Blueprint docs. Only applies when `modalTarget` is
     * 'popover'.
     */
    popoverPosition?: Position;
}

/**
 * A convenience button to trigger the display of a ColChooser for user selection and discovery of
 * available Grid columns. For use by applications when a button is desired in addition to the
 * context menu item built into the Grid component directly.
 *
 * Requires {@link GridConfig.colChooserModel} on the bound GridModel.
 */
export const [ColChooserButton, colChooserButton] = hoistCmp.withFactory<ColChooserButtonProps>({
    displayName: 'ColChooserButton',
    className: 'xh-col-chooser-button',
    model: false,

    render(
        {
            className,
            icon,
            title,
            gridModel: boundModel,
            modalTarget,
            popoverPosition,
            disabled,
            onClick,
            ...rest
        },
        ref
    ) {
        const contextModel = useContextModel<GridModel | CubeGridModel>(
                it => it instanceof GridModel || it instanceof CubeGridModel
            ),
            gridModel = withDefault(boundModel, contextModel)?.innerGridModel;
        modalTarget = withDefault(modalTarget, 'popover');

        const chooserModel = gridModel?.colChooserModel,
            isDocked = chooserModel?.mode === 'docked';

        icon = withDefault(icon, Icon.gridPanel());
        title = withDefault(title, isDocked ? 'Toggle column panel' : 'Choose grid columns...');

        // Return a plain disabled button rather than falling through - the popover config below
        // dereferences chooserModel.
        if (!gridModel || !chooserModel) {
            logError(
                !gridModel
                    ? 'No GridModel available - provide via a `gridModel` prop or context - button will be disabled.'
                    : 'ColChooser not enabled on bound GridModel - button will be disabled.',
                ColChooserButton
            );
            return button({ref, icon, title, className, disabled: true, ...rest});
        }

        if (isDocked || modalTarget === 'dialog') {
            return button({
                ref,
                icon,
                title,
                className,
                disabled,
                onClick: e => {
                    onClick?.(e);
                    isDocked ? chooserModel.toggle() : chooserModel.open();
                },
                ...rest
            });
        }

        const modalModel = chooserModel as ModalColChooserModel;
        return popover({
            popoverClassName: 'xh-col-chooser-popover',
            position: withDefault(popoverPosition, 'auto'),
            isOpen: modalModel.isPopoverOpen,
            item: button({
                icon,
                title,
                className,
                disabled,
                active: modalModel.isPopoverOpen,
                onClick,
                ...rest
            }),
            disabled,
            content: vbox({
                onClick: stopPropagation,
                onDoubleClick: stopPropagation,
                items: [
                    div({ref, className: 'xh-popup__title', item: 'Choose Columns'}),
                    colChooser({model: modalModel})
                ]
            }),
            onInteraction: willOpen => {
                if (willOpen) {
                    modalModel.openPopover();
                } else {
                    modalModel.closeConfirmAsync().catchDefault();
                }
            }
        });
    }
});
