/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {filler, frame} from 'hoist/layout';
import {button, dialog} from 'hoist/kit/blueprint/';
import {toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon/';
import {leftRightChooser} from 'hoist/cmp/leftRightChooser';

@hoistComponent()
export class GridColumnChooser extends Component {

    render() {
        const model = this.model,
            onClose = () => {model.setIsOpen(false)},
            {isOpen, leftRightChooserModel} = model;

        return dialog({
            icon: Icon.gears(),
            title: 'Column Chooser',
            cls: 'xh-grid-column-chooser',
            isOpen: isOpen,
            onClose: onClose,
            items: [
                frame({
                    height: 300,
                    item: leftRightChooser({model: leftRightChooserModel})
                }),
                toolbar({
                    items: [
                        filler(),
                        button({text: 'OK',
                            onClick: () => {
                                model.commit();
                                onClose();
                            }
                        }),
                        button({
                            text: 'Cancel',
                            onClick: onClose
                        })
                    ]
                })
            ]});
    }
}

export const gridColumnChooser =  elemFactory(GridColumnChooser);