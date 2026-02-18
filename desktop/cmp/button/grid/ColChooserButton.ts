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
import {ColChooserModel} from '@xh/hoist/desktop/cmp/grid/impl/colchooser/ColChooserModel';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {popover, Position} from '@xh/hoist/kit/blueprint';
import {logError, stopPropagation, withDefault} from '@xh/hoist/utils/js';
import {button, ButtonProps} from '../Button';

export interface ColChooserButtonProps extends ButtonProps {
    /** GridModel to which this button should bind. Will find nearest in context if not provided. */
    gridModel?: GridModel;

    /** Position for chooser popover, as per Blueprint docs. */
    popoverPosition?: Position;
}

/**
 * A convenience button to trigger the display of a ColChooser for user selection and discovery of
 * available Grid columns. For use by applications when a button is desired in addition to the
 * context menu item built into the Grid component directly.
 *
 * Requires {@link GridConfig.colChooserModel} to be configured on the bound GridModel.
 */
export const [ColChooserButton, colChooserButton] = hoistCmp.withFactory<ColChooserButtonProps>({
    displayName: 'ColChooserButton',
    className: 'xh-col-chooser-button',
    model: false,

    render({className, icon, title, gridModel, popoverPosition, disabled, ...rest}, ref) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));
        const colChooserModel = gridModel?.colChooserModel as ColChooserModel;

        // Validate bound model available and suitable for use.
        if (!gridModel) {
            logError(
                'No GridModel available - provide via a `gridModel` prop or context - button will be disabled.',
                ColChooserButton
            );
            disabled = true;
        } else if (!colChooserModel) {
            logError(
                'ColChooser not enabled on bound GridModel - button will be disabled.',
                ColChooserButton
            );
            disabled = true;
        }

        return popover({
            popoverClassName: 'xh-col-chooser-popover xh-popup--framed',
            position: withDefault(popoverPosition, 'auto'),
            isOpen: colChooserModel.isPopoverOpen,
            item: button({
                icon: withDefault(icon, Icon.gridPanel()),
                title: withDefault(title, 'Choose grid columns...'),
                className,
                disabled,
                ...rest
            }),
            disabled,
            content: vbox({
                onClick: stopPropagation,
                onDoubleClick: stopPropagation,
                items: [
                    div({ref, className: 'xh-popup__title', item: 'Choose Columns'}),
                    colChooser({model: colChooserModel})
                ]
            }),
            onInteraction: willOpen => {
                if (willOpen) {
                    colChooserModel.openPopover();
                } else {
                    colChooserModel.close();
                }
            }
        });
    }
});
