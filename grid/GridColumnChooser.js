/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from 'hoist/core';
import {filler, frame} from 'hoist/layout';
import {button, dialog} from 'hoist/kit/blueprint/';
import {toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon/';
import {leftRightChooser} from 'hoist/cmp/leftRightChooser';

@HoistComponent()
export class GridColumnChooser extends Component {

    render() {
        const {isOpen, lrModel} = this.model;

        if (!isOpen) return null;

        return dialog({
            icon: Icon.grid(),
            title: 'Choose Columns',
            cls: 'xh-grid-column-chooser',
            isOpen: true,
            onClose: this.onClose,
            items: [
                frame({
                    height: 300,
                    item: leftRightChooser({model: lrModel})
                }),
                toolbar(
                    filler(),
                    button({
                        text: 'Cancel',
                        onClick: this.onClose
                    }),
                    button({
                        text: 'Save',
                        icon: Icon.check({cls: 'xh-green'}),
                        onClick: this.onOK
                    })
                )
            ]});
    }

    onClose = () => {this.model.close()};

    onOK = () => {
        this.model.commit();
        this.onClose();
    }
}

export const gridColumnChooser =  elemFactory(GridColumnChooser);