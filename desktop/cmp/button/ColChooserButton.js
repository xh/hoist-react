/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {Component} from 'react';
import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import {button, Button} from '@xh/hoist/desktop/cmp/button';


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
        ...Button.propTypes,

        /** GridModel of the grid for which this button should show a chooser. */
        gridModel: PT.instanceOf(GridModel).isRequired
    };

    render() {
        const {icon, title, onClick, gridModel, ...rest} = this.props;

        return button({
            icon: withDefault(icon, Icon.gridPanel()),
            title: withDefault(title, 'Choose grid columns...'),
            onClick: withDefault(onClick, this.showChooser),
            ...rest
        });
    }

    showChooser = () => {
        this.props.gridModel.showColChooser();
    }

}
export const colChooserButton = elemFactory(ColChooserButton);