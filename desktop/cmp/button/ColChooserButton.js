/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {div, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {colChooser} from '@xh/hoist/desktop/cmp/grid/impl/colchooser/ColChooser';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {stopPropagation, withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import {button, Button} from './Button';

/**
 * A convenience button to trigger the display of a ColChooser for user selection and discovery of
 * available Grid columns. For use by applications when a button is desired in addition to the
 * context menu item built into the Grid component directly.
 *
 * Requires the `GridModel.colChooserModel` config option. Set to true for default implementation.
 */
export const [ColChooserButton, colChooserButton] = hoistCmp.withFactory({
    displayName: 'ColChooserButton',
    model: false,

    render({icon, title, gridModel, popoverPosition, disabled, ...rest}, ref) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));

        const colChooserModel = gridModel?.colChooserModel;

        if (!gridModel) {
            console.error("No GridModel available to ColChooserButton.  Provide via a 'gridModel' prop, or context.");
            disabled = true;
        }

        if (!colChooserModel) {
            console.error('No ColChooserModel available on bound GridModel - enable via GridModel.colChooserModel config.');
            disabled = true;
        }

        return popover({
            popoverClassName: 'xh-col-chooser-popover xh-popup--framed',
            position: withDefault(popoverPosition, 'auto'),
            isOpen: colChooserModel.isPopoverOpen,
            target: button({
                icon: withDefault(icon, Icon.gridPanel()),
                title: withDefault(title, 'Choose grid columns...'),
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
            onInteraction: (willOpen) => {
                if (willOpen) {
                    colChooserModel.openPopover();
                } else {
                    colChooserModel.close();
                }
            }
        });
    }
});

ColChooserButton.propTypes = {
    ...Button.propTypes,

    /** GridModel of the grid for which this button should show a chooser. */
    gridModel: PT.instanceOf(GridModel),

    /** Position for chooser popover, as per Blueprint docs. */
    popoverPosition: PT.oneOf([
        'top-left', 'top', 'top-right',
        'right-top', 'right', 'right-bottom',
        'bottom-right', 'bottom', 'bottom-left',
        'left-bottom', 'left', 'left-top',
        'auto'
    ])
};


