/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */



import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {div, filler, frame} from 'hoist/layout';
import {button, dialog} from 'hoist/kit/blueprint/';
import {toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon/';
import {leftRightChooser} from 'hoist/cmp/leftRightChooser';


//import './GridColumnEditor.scss';

@hoistComponent()
export class GridColumnEditor extends Component {

    render() {
        const {isOpen, onClose, leftRightChooserModel} = this.model;

        return dialog({
            icon: Icon.gears(),
            title: 'Column Chooser Test',
            cls: 'xh-grid-column-chooser',
            isOpen: isOpen,
            onClose: onClose,
            items: [
                frame({item:leftRightChooser({model: leftRightChooserModel})}),
                toolbar({
                    items: [
                        filler(),
                        button({text: 'Apply', onClick: onClose})
                    ]
                })
            ]});
    }
}

export const gridColumnEditor =  elemFactory(GridColumnEditor);