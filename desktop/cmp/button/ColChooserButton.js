/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {div, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {colChooser} from '@xh/hoist/desktop/cmp/grid/impl/ColChooser';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import {cloneElement} from 'react';
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

    render({icon, title, gridModel, popoverPosition, ...rest}, ref) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));

        const colChooserModel = gridModel?.colChooserModel;

        const displayButton = button({
            icon: withDefault(icon, Icon.gridPanel()),
            title: withDefault(title, 'Choose grid columns...'),
            ...rest
        });

        if (!gridModel) {
            console.error("No GridModel available to ColChooserButton.  Provide via a 'gridModel' prop, or context.");
            return cloneElement(displayButton, {disabled: true});
        }

        if (!colChooserModel) {
            console.error('No ColChooserModel available on bound GridModel - enable via GridModel.colChooserModel config.');
            return cloneElement(displayButton, {disabled: true});
        }

        return popover({
            popoverClassName: 'xh-col-chooser-popover xh-popup--framed',
            placement: withDefault(popoverPosition, 'auto'),
            isOpen: colChooserModel.isPopoverOpen,
            item: displayButton,
            content: vbox(
                div({
                    ref,
                    className: 'xh-popup__title',
                    item: 'Choose Columns'
                }),
                colChooser({
                    model: colChooserModel
                })
            ),
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
        'top', 'top-start', 'top-end', 
        'bottom', 'bottom-start', 'bottom-end', 
        'right', 'right-start', 'right-end', 
        'left', 'left-start', 'left-end', 
        'auto', 'auto-start', 'auto-end'
    ])
};


