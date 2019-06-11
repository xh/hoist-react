/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {div, vbox} from '@xh/hoist/cmp/layout';
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import PT from 'prop-types';
import {GridModel} from '@xh/hoist/cmp/grid';
import {popover} from '@xh/hoist/kit/blueprint';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {colChooser} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';


/**
 * A convenience button to trigger the display of a ColChooser for user selection and discovery of
 * available Grid columns. For use by applications when a button is desired in addition to the
 * context menu item built into the Grid component directly.
 *
 * Requires the `GridModel.colChooser` config option to be set.
 */
@HoistComponent
export class ColChooserButton extends Component {

    static propTypes = {
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

    render() {
        const {icon, title, gridModel, popoverPosition, chooserWidth, chooserHeight, ...rest} = this.props,
            {colChooserModel} = gridModel;

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

}
export const colChooserButton = elemFactory(ColChooserButton);