/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

@HoistComponent()
export class ColChooserButton extends Component {

    static propTypes = {
        /** Grid model of the grid for which this button should show a chooser. */
        gridModel: PT.object
    };

    render() {
        return button({
            icon: Icon.grid(),
            onClick: this.showChooser
        });
    }

    showChooser = () => {
        this.props.gridModel.showColChooser();
    }

}
export const colChooserButton = elemFactory(ColChooserButton);