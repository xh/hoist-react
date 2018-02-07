/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory} from 'hoist';
import {input, checkbox, button} from 'hoist/kit/semantic';
import {observer} from 'hoist/mobx';
import {hbox} from 'hoist/layout';

@observer
class LogViewerToolbar extends Component {

    render() {
        const {startLine, maxLines, pattern, tail} = this.model;

        return hbox({
            cls: 'toolbar',
            items: [
                input({
                    label: 'Start Line',
                    type: 'number',
                    name: 'startLine',
                    value: startLine,
                    min: 1,
                    max: maxLines,
                    size: 'mini',
                    onChange: this.handleChange,
                    input: {style: {width: '70px'}}
                }),
                input({
                    label: 'Max Lines',
                    type: 'number',
                    name: 'maxLines',
                    value: maxLines,
                    min: startLine,
                    size: 'mini',
                    onChange: this.handleChange,
                    input: {style: {width: '70px'}}
                }),
                input({
                    placeholder: 'Search...',
                    name: 'pattern',
                    value: pattern,
                    icon: 'search',
                    size: 'mini',
                    onChange: this.handleChange
                }),
                button({
                    type: 'submit',
                    icon: 'refresh',
                    size: 'mini',
                    onClick: this.onSubmitClick
                }),
                checkbox({
                    label: 'Tail',
                    size: 'mini',
                    name: 'tail',
                    checked: tail,
                    onChange: this.handleChange
                })
            ]
        });
    }

    onSubmitClick = () => {
        this.model.loadLines();
    };

    handleChange = (e, {name, value, checked}) => {
        this.model.setDisplayOption(name, name === 'tail' ? checked : value);
    };

    //-----------------------------
    // Implementation
    //-----------------------------
    get model() {return this.props.model}
}
export const logViewerToolbar = elemFactory(LogViewerToolbar);