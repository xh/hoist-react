/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {label, numberInput, textInput, switchInput} from '@xh/hoist/desktop/cmp/form';
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
                    field: 'startLine',
                    min: 0,
                    width: 80,
                    disabled: model.tail,
                    displayWithCommas: true,
                    onCommit: this.onCommit
                }),
                label('Max lines:'),
                numberInput({
                    model,
                    field: 'maxLines',
                    min: 1,
                    width: 80,
                    displayWithCommas: true,
                    onCommit: this.onCommit
                }),
                toolbarSep(),
                textInput({
                    model,
                    field: 'pattern',
                    placeholder: 'Search...',
                    width: 150,
                    onCommit: this.onCommit
                }),
                toolbarSep(),
                switchInput({
                    model,
                    field: 'tail',
                    label: 'Tail mode'
                })
            ]
        });
    }

    onCommit = () => {
        this.model.loadLines();
    }
}
export const logViewerToolbar = elemFactory(LogViewerToolbar);