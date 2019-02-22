/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';

import {ColChooserModel} from './ColChooserModel';

/**
 * Hoist UI for user selection and discovery of available Grid columns, enabled via the
 * GridModel.enableColChooser config option.
 *
 * Todo: Complete doc once done
 *
 * Todo: See Drag and Drop example here: https://codesandbox.io/s/k260nyxq9v
 */
@HoistComponent
export class ColChooser extends Component {

    static modelClass = ColChooserModel;

    render() {
        const {isOpen} = this.model;
        if (!isOpen) return null;
        return 'Col Chooser';
    }

    onClose = () => {
        this.model.close();
    };

    onOK = () => {
        this.model.commit();
        this.onClose();
    };

    restoreDefaults = () => {
        const {model} = this,
            {stateModel} = model.gridModel;

        stateModel.resetStateAsync().then(() => {
            model.syncChooserData();
        });
    }

}

export const colChooser = elemFactory(ColChooser);