/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from './Button';


/**
 * A convenience button to trigger the display of a ColChooser for user selection and discovery of
 * available Grid columns. For use by applications when a button is desired in addition to the
 * context menu item built into the Grid component directly.
 *
 * Requires the `GridModel.enableColChooser` config option to be true.
 */
@HoistComponent
export class ColChooserButton extends Component {

    static propTypes = {
        /** GridModel of the grid for which this button should show a chooser. */
        gridModel: PT.object
    };

    render() {
        return button({
            icon: Icon.gridPanel(),
            title: 'Choose grid columns...',
            onClick: this.showChooser
        });
    }

    showChooser = () => {
        this.props.gridModel.showColChooser();
    }

}
export const colChooserButton = elemFactory(ColChooserButton);