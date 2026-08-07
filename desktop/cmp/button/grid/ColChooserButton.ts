/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {div, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {colChooser} from '@xh/hoist/desktop/cmp/grid/impl/colchooser/ColChooser';
import {ColChooserModalModel} from '@xh/hoist/desktop/cmp/grid/impl/colchooser/ColChooserModalModel';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {popover, Position} from '@xh/hoist/kit/blueprint';
import {logError, stopPropagation, withDefault} from '@xh/hoist/utils/js';
import {button, ButtonProps} from '../Button';

export interface ColChooserButtonProps extends ButtonProps {
    /** GridModel to which this button should bind. Will find nearest in context if not provided. */
    gridModel?: GridModel;

    /**
     * How the chooser is presented when triggered (default 'popover'). 'dialog' and 'popover' bind
     * to the grid's `colChooserModel`; 'panel' binds to its `colChooserPanelModel`.
     */
    target?: 'dialog' | 'popover' | 'panel';

    /** Position for chooser popover, as per Blueprint docs. Only applies when `target` is 'popover'. */
    popoverPosition?: Position;
}

/**
 * A convenience button to trigger the display of a ColChooser for user selection and discovery of
 * available Grid columns. For use by applications when a button is desired in addition to the
 * context menu item built into the Grid component directly.
 *
 * Requires {@link GridConfig.colChooserModel} (for 'dialog'/'popover' targets) or
 * {@link GridConfig.colChooserPanelModel} (for the 'panel' target) on the bound GridModel.
 */
export const [ColChooserButton, colChooserButton] = hoistCmp.withFactory<ColChooserButtonProps>({
    displayName: 'ColChooserButton',
    className: 'xh-col-chooser-button',
    model: false,

    render(
        {className, icon, title, gridModel, target, popoverPosition, disabled, onClick, ...rest},
        ref
    ) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));
        target = withDefault(target, 'popover');

        const chooserModel =
            target === 'panel' ? gridModel?.colChooserPanelModel : gridModel?.colChooserModel;

        icon = withDefault(icon, Icon.gridPanel());
        title = withDefault(
            title,
            target === 'panel' ? 'Toggle column panel' : 'Choose grid columns...'
        );

        // Validate bound model available and suitable for use. Render a plain disabled button
        // (no popover) when unusable - the popover config below dereferences chooserModel.
        if (!gridModel || !chooserModel) {
            logError(
                !gridModel
                    ? 'No GridModel available - provide via a `gridModel` prop or context - button will be disabled.'
                    : `ColChooser not enabled on bound GridModel for target '${target}' - button will be disabled.`,
                ColChooserButton
            );
            return button({ref, icon, title, className, disabled: true, ...rest});
        }

        if (target !== 'popover') {
            return button({
                ref,
                icon,
                title,
                className,
                disabled,
                onClick: e => {
                    onClick?.(e);
                    target === 'panel' ? chooserModel.toggle() : chooserModel.open();
                },
                ...rest
            });
        }

        const modalModel = chooserModel as ColChooserModalModel;
        return popover({
            popoverClassName: 'xh-col-chooser-popover',
            position: withDefault(popoverPosition, 'auto'),
            isOpen: modalModel.isPopoverOpen,
            item: button({icon, title, className, disabled, onClick, ...rest}),
            disabled,
            content: vbox({
                onClick: stopPropagation,
                onDoubleClick: stopPropagation,
                items: [
                    div({ref, className: 'xh-popup__title', item: 'Choose Columns'}),
                    // Self-sizes to its buckets + library; no explicit width/height needed.
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
