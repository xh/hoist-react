/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory} from 'hoist';
import {inputGroup, numericInput, checkbox, button, label} from 'hoist/kit/blueprint';
import {observer} from 'hoist/mobx';
import {hbox, filler, hspacer} from 'hoist/layout';

@observer
class LogViewerToolbar extends Component {
    
    render() {
        const {startLine, maxLines, pattern, tail} = this.model;

        return hbox({
            style: {background: '#106ba3'},
            padding: 3,
            alignItems: 'center',
            items: [
                this.label('Start Line:'),
                hspacer(10),
                numericInput({
                    style: {width: 50},
                    value: startLine,
                    buttonPosition: 'none',
                    min: 1,
                    max: maxLines,
                    onValueChange: this.onStartLineChange
                }),
                hspacer(10),
                this.label('Max Lines:'),
                hspacer(10),
                numericInput({
                    style: {width: 50},
                    value: maxLines,
                    buttonPosition: 'none',
                    min: 1,
                    onValueChange: this.onMaxLineChange
                }),
                hspacer(10),
                inputGroup({
                    placeholder: 'Search...',
                    style: {width: 150},
                    value: pattern,
                    onChange: this.onSearchChange
                }),
                hspacer(10),
                checkbox({
                    label: this.label('Tail'),
                    name: 'tail',
                    checked: tail,
                    onChange: this.onTailChange
                }),
                filler(),
                hspacer(10),
                button({
                    iconName: 'refresh',
                    onClick: this.onSubmitClick
                })
            ]
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    onSubmitClick = () => {
        this.model.loadLines();
    };

    onStartLineChange = (value) => {
        this.model.setDisplayOption('startLine', value);
    }

    onMaxLinesChange = (value) => {
        this.model.setDisplayOption('maxLines', value);
    }

    onPatternChange = (e) => {
        this.model.setDisplayOption('pattern', e.target.value);
    }

    onTailChange = (e) => {
        this.model.setDisplayOption('tail', e.target.checked);
    }
    
    label(txt) {
        return label({text: txt, style: {color: 'white', whiteSpace: 'nowrap'}});
    }

    get model() {return this.props.model}
}
export const logViewerToolbar = elemFactory(LogViewerToolbar);