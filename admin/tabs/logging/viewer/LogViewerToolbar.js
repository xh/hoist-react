/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button} from '@xh/hoist/kit/blueprint';
import {checkField, label, numberField, textField} from '@xh/hoist/cmp/form';
import {toolbar} from '@xh/hoist/cmp/toolbar';
import {filler} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';

/**
 * @private
 */
@HoistComponent()
export class LogViewerToolbar extends Component {
    
    render() {
        const {model} = this;
        return toolbar({
            items: [
                label('Start Line:'),
                numberField({
                    model,
                    field: 'startLine',
                    min: 0,
                    width: 80,
                    disabled: model.tail,
                    onCommit: this.onCommit
                }),
                label('Max Lines:'),
                numberField({
                    model,
                    field: 'maxLines',
                    min: 1,
                    width: 80,
                    onCommit: this.onCommit
                }),
                textField({
                    model,
                    field: 'pattern',
                    placeholder: 'Search...',
                    width: 150,
                    onCommit: this.onCommit
                }),
                checkField({
                    model,
                    field: 'tail',
                    text: 'Tail'
                }),
                filler(),
                button({icon: Icon.refresh(), onClick: this.onSubmitClick})
            ]
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    onSubmitClick = () => {
        this.model.loadLines();
    }

    onCommit = () => {
        this.model.loadLines();
    }
}
export const logViewerToolbar = elemFactory(LogViewerToolbar);