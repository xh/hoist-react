/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, hoistComponent} from 'hoist/core';
import {button} from 'hoist/kit/blueprint';
import {textField, checkField, numberField, label, toolbar} from 'hoist/cmp';
import {filler} from 'hoist/layout';
import {Icon} from 'hoist/icon';

@hoistComponent()
export class LogViewerToolbar extends Component {
    
    render() {
        const model = this.model;
        return toolbar({
            alignItems: 'center',
            style: {flex: 'none'},
            items: [
                label('Start Line:'),
                numberField({model, field: 'startLine', min: 0, width: 80}),
                label('Max Lines:'),
                numberField({model, field: 'maxLines', min: 1, width: 80}),
                textField({model, field: 'pattern', placeholder: 'Search...', width: 200}),
                checkField({model, field: 'tail', text: 'Tail'}),
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
}
export const logViewerToolbar = elemFactory(LogViewerToolbar);