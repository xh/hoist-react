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
import {button} from '@xh/hoist/mobile/cmp/button';

/**
 * A convenience button to trigger the display of a ColChooser for user selection,
 * discovery and reordering of available Grid columns.
 *
 * Requires the `GridModel.enableColChooser` config option to be true.
 */
@HoistComponent
export class ColChooserButton extends Component {

    static propTypes = {
        /** GridModel of the grid for which this button should show a chooser. */
        model: PT.instanceOf(GridModel)
    };

    static modelClass = GridModel;

    render() {
        const {icon, onClick, model, ...rest} = this.props;

        return button({
            icon: withDefault(icon, Icon.gridPanel()),
            onClick: withDefault(onClick, this.showChooser),
            ...rest
        });
    }

    showChooser = () => {
        this.model.showColChooser();
    }

}

export const colChooserButton = elemFactory(ColChooserButton);