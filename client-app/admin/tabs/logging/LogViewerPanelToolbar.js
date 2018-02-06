/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory} from 'hoist';
import {input, checkbox, button} from 'hoist/kit/semantic';
import {action, observer} from 'hoist/mobx';
import {hbox} from 'hoist/layout';

@observer
class LogViewerPanelToolbar extends Component {
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
                    input: {
                        style: {
                            width: '70px'
                        }
                    }
                }),
                input({
                    label: 'Max Lines',
                    type: 'number',
                    name: 'maxLines',
                    value: maxLines,
                    min: startLine,
                    size: 'mini',
                    onChange: this.handleChange,
                    input: {
                        style: {
                            width: '70px'
                        }
                    }
                }),
                input({
                    placeholder: 'Search...',
                    name: 'pattern',
                    value: pattern,
                    icon: {name: 'search'},
                    size: 'mini',
                    onChange: this.handleChange
                }),
                button({
                    type: 'submit',
                    icon: {name: 'refresh'},
                    size: 'mini',
                    onClick: this.refreshValues
                }),
                checkbox({
                    label: 'Tail',
                    size: 'mini',
                    checked: tail
                })
            ]
        });
    }

    refreshValues = () => {
        this.model.loadLines();
    };

    @action
    handleChange = (e, {name, value}) => {
        this.model[name] = value;
    };

    //-----------------------------
    // Implementation
    //-----------------------------
    get model() {return this.props.model}
}

export const logViewerPanelToolbar = elemFactory(LogViewerPanelToolbar);