/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {label} from '@xh/hoist/cmp/layout';
import {numberInput, textInput, switchInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';

/**
 * @private
 */
@HoistComponent
export class LogViewerToolbar extends Component {
    
    render() {
        const {model} = this;
        return toolbar({
            items: [
                label('Start line:'),
                numberInput({
                    model,
                    bind: 'startLine',
                    min: 0,
                    width: 80,
                    disabled: model.tail,
                    displayWithCommas: true
                }),
                label('Max lines:'),
                numberInput({
                    model,
                    bind: 'maxLines',
                    min: 1,
                    width: 80,
                    displayWithCommas: true
                }),
                toolbarSep(),
                textInput({
                    model,
                    bind: 'pattern',
                    placeholder: 'Search...',
                    width: 150
                }),
                toolbarSep(),
                switchInput({
                    model,
                    bind: 'tail',
                    label: 'Tail mode'
                })
            ]
        });
    }
}
export const logViewerToolbar = elemFactory(LogViewerToolbar);