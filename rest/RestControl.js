/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React, {Component} from 'react';
import {hoistComponent, hoistComponentFactory, elemFactory} from 'hoist/core';
import {jsonEditor} from 'hoist/cmp';
import {fmtDateTime} from 'hoist/format';
import {hbox} from 'hoist/layout';
import {Icon} from 'hoist/icon';
import {clone} from 'lodash';

import {
    Classes, button, checkbox, inputGroup,
    label, menuItem, numericInput, select,
    suggest, textArea, controlGroup
} from 'hoist/kit/blueprint';


@hoistComponent()
export class RestControl extends Component {

    render() {
        const ctl = this.getSubControl();
        return hbox({
            cls: 'xh-mb',
            items: [
                restLabel(this.props),
                //  Needed to stretch control, and also avoid focus clipping?
                controlGroup({
                    fill: true,
                    style: {flex: 1, margin: 1},
                    item: ctl ? ctl(this.props) : null
                })
            ]
        });
    }

    getSubControl() {
        const {field, editor, type, isEditable} = this.model,
            editorType = editor.type;

        if (type == null) return null;

        if (type === 'json') {
            return restJsonEditor;
        }

        if (editorType === 'textarea') {
            return restTextArea;
        }

        if (!isEditable) return restDisplayField;
        
        if (field.lookup) {
            return field.lookupStrict ? restSelect : restDropdown;
        } else if (type === 'bool') {
            return restSelect;
        } else if (type === 'number') {
            return restNumericInput;
        } else {
            return restTextInput;
        }
    }
}
export const restControl = elemFactory(RestControl);

//------------------------
// Sub - Controls
//------------------------
const restLabel = hoistComponentFactory(
    class extends Component {
        render() {
            const lbl =  this.model.field.label,
                isValid = this.model.isValid,
                text = <span>{lbl} <span style={{color:'red'}}>{!isValid ? '*' : ''}</span> </span>;

            return label({text, style: {width: '115px'}});
        }
    }
);

const restDisplayField = hoistComponentFactory(
    class extends Component {
        render() {
            let {field, value, type} = this.model;
            if (type === 'date') {
                value = value ? fmtDateTime(value) : '';
            }
            return label({text: value});
        }
    }
);

const restDropdown = hoistComponentFactory(
    class extends Component {
        render() {
            const {value, isEditable, field, isValid} = this.model;
            const options = clone(field.lookup);

            options.unshift(null);

            return suggest({
                popoverProps: {popoverClassName: Classes.MINIMAL},
                $items: options,
                onItemSelect: this.onItemSelect,
                itemRenderer: (item, itemProps) => {
                    const text = item === null ? '-' : item.toString();
                    return menuItem({key: item, text, onClick: itemProps.handleClick});
                },
                inputValueRenderer: s => s,
                inputProps: {
                    placeholder: 'Select',
                    value: value === null ? '' : value.toString(),
                    disabled: !isEditable,
                    onChange: this.onChange
                }
            });
        }

        onChange = (ev) => {
            this.model.value = ev.target.value;
        }

        onItemSelect = (val) => {
            this.model.value = val;
        }
    }
);

const restSelect = hoistComponentFactory(
    class extends Component {
        render() {
            const {value, isEditable, field, isValid, type} = this.model;

            let options = [];
            if (field.lookup) {
                options = clone(field.lookup);
            } else if (type == 'bool') {
                options = [true, false];
            }

            options.unshift(null);

            return select({
                popoverProps: {popoverClassName: Classes.MINIMAL},
                $items: options,
                onItemSelect: this.onItemSelect,
                itemRenderer: (item, itemProps) => {
                    const text = item === null ? '-' : item.toString();
                    return menuItem({key: item, text, onClick: itemProps.handleClick});
                },
                filterable: false,
                item: button({
                    rightIcon: 'caret-down',
                    text: value === null ? 'Select' : value.toString()
                }),
                disabled: !isEditable
            });
        }

        onItemSelect = (val) => {
            this.model.value = val;
        }
    }
);

const restNumericInput = hoistComponentFactory(
    class extends Component {
        render() {
            const {value, isEditable, field, isValid} = this.model;

            return numericInput({
                cls: 'pt-fill',
                buttonPosition: 'none',
                value,
                disabled: !isEditable,
                onValueChange: this.onValueChange
            });
        }

        onValueChange = (val, valAsString) => {
            val = (valAsString === '') ? null : val;
            this.model.value = val;
        }
    }
);

const restTextArea = hoistComponentFactory(
    class extends Component {
        render() {
            const {value, isEditable, field, isValid} = this.model;
            return textArea({
                cls: 'pt-fill',
                value: value || '',
                disabled: !isEditable,
                onChange: this.onChange
            });
        }

        onChange = (ev) => {
            this.model.value = ev.target.value;
        }
    }
);

const restTextInput = hoistComponentFactory(
    class extends Component {
        render() {
            const {value, isEditable, field, isValid} = this.model;
            return inputGroup({
                cls: 'pt-fill',
                type: 'text',
                value: value || '',
                disabled: !isEditable,
                onChange: this.onChange
            });
        }

        onChange = (ev) => {
            this.model.value = ev.target.value;
        }
    }
);

const restJsonEditor = hoistComponentFactory(
    class extends Component {
        render() {
            const {value, disabled} = this.props;
            return jsonEditor({
                value: value || '',
                onChange: this.onChange,
                // setting size appears to be the only way to get scrollbars
                width: 343,
                height: 150,
                codeMirrorOptions: {
                    readOnly: disabled
                }
            });
        }

        onChange = (editor, data, value) => {
            try {
                JSON.parse(value);
            } catch (e) {
                // say form invalid
            }
        }
    }
);