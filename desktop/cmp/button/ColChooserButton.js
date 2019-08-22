/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import PT from 'prop-types';
import {hoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from './Button';
import {popover} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {div, vbox} from '@xh/hoist/cmp/layout';
import {colChooser} from '@xh/hoist/desktop/cmp/grid';

/**
 * A convenience button to trigger the display of a ColChooser for user selection and discovery of
 * available Grid columns. For use by applications when a button is desired in addition to the
 * context menu item built into the Grid component directly.
 *
 * Requires the `GridModel.enableColChooser` config option to be true.
 */
export const ColChooserButton = hoistComponent({
    displayName: 'ColChooserButton',
    render({icon, title, gridModel, popoverPosition, chooserWidth, chooserHeight, ...rest}) {
        const {colChooserModel} = gridModel;

        return popover({
            popoverClassName: 'xh-col-chooser-popover xh-popup--framed',
            position: withDefault(popoverPosition, 'auto'),
            isOpen: colChooserModel.isPopoverOpen,
            target: button({
                icon: withDefault(icon, Icon.gridPanel()),
                title: withDefault(title, 'Choose grid columns...'),
                ...rest
            }),
            content: vbox(
                div({
                    className: 'xh-popup__title',
                    item: 'Choose Columns'
                }),
                colChooser({
                    model: colChooserModel,
                    width: chooserWidth,
                    height: chooserHeight
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
    gridModel: PT.instanceOf(GridModel).isRequired,

    /** Position for chooser popover, as per Blueprint docs. */
    popoverPosition: PT.oneOf([
        'top-left', 'top', 'top-right',
        'right-top', 'right', 'right-bottom',
        'bottom-right', 'bottom', 'bottom-left',
        'left-bottom', 'left', 'left-top',
        'auto'
    ]),

    /** Width for the opened chooser */
    chooserWidth: PT.number,

    /** Height for the opened chooser */
    chooserHeight: PT.number
};

export const colChooserButton = elemFactory(ColChooserButton);


