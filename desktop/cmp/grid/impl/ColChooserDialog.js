/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';

import {colChooser} from './ColChooser';
import {ColChooserModel} from './ColChooserModel';

@HoistComponent
export class ColChooserDialog extends Component {

    static modelClass = ColChooserModel;

    render() {
        const {model} = this;
        if (!model.isOpen) return null;

        return dialog({
            icon: Icon.gridPanel(),
            title: 'Choose Columns',
            className: 'xh-grid-column-chooser',
            transitionName: 'none',
            isOpen: true,
            onClose: this.onClose,
            item: colChooser({model})
        });
    }

    onClose = () => {this.model.close()};

}

export const colChooserDialog = elemFactory(ColChooserDialog);