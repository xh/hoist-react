/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {button} from 'hoist/kit/blueprint';
import {vframe} from 'hoist/layout';
import {leftRightChooser, toolbar} from 'hoist/cmp';
import {LeftRightChooserModel} from 'hoist/cmp/leftRightChooser';
import {leftRightChooserFilter} from 'hoist/cmp';

@hoistComponent()
export class ReadmePanel extends Component {
    leftRightModel = new LeftRightChooserModel({
        data: [{
            text: 'Apple',
            value: 0,
            description: 'An apple'
        }, {
            text: 'Banana',
            value: 2,
            description: 'A Banana'
        }, {
            text: 'Cherry',
            value: 3
        }, {
            text: 'Lime',
            value: 4,
            description: 'A Lime'
        }, {
            text: 'Mango',
            value: 5
        }, {
            text: 'Orange',
            value: 6,
            side: 'right'
        }, {
            text: 'Kiwi',
            value: 7,
            side: 'right',
            description: 'A Kiwi, and it\'s locked',
            locked: true
        }, {
            text: 'Pineapple',
            value: 8
        }, {
            text: 'Strawberry',
            value: 9
        }]
    });

    render() {
        const leftRightModel = this.leftRightModel,
            {value} = leftRightModel;

        return vframe(
            leftRightChooser({
                model: leftRightModel
            }),
            toolbar(
                leftRightChooserFilter({
                    fields: ['text'],
                    model: leftRightModel
                }),
                button({
                    text: 'Chooser Value',
                    disabled: !value.length,
                    onClick: () => {
                        console.log(value);
                        console.log(leftRightModel.leftModel.selection.count);
                    }
                })
            )
        );
    }
}