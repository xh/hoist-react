/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {Classes, button, checkbox, dialog, dialogBody, dialogFooter, dialogFooterActions, controlGroup, inputGroup, label, menuItem, numericInput, suggest, textArea} from 'hoist/kit/blueprint';
import {elemFactory} from 'hoist';
import {filler, vframe, hbox} from 'hoist/layout';
import {observer} from 'hoist/mobx';
import {fmtDateTime} from 'hoist/format';

import {confirm} from 'hoist/cmp/confirm/Confirm.js';

@observer
export class RestForm extends Component {

    render() {
        const {record, isAdd} = this.model;
        if (!record) return null;

        return dialog({
            title: isAdd ? 'Add Record' : 'Edit Record',
            icon: 'inbox',
            isOpen: true,
            isCloseButtonShown: false,
            items: this.getDialogItems()
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    get model() {return this.props.model}

    getDialogItems() {
        return [
            dialogBody(
                this.getForm()
            ),
            dialogFooter(
                dialogFooterActions(this.getButtons())
            ),
            confirm({model: this.model.confirmModel})
        ];
    }

    getButtons() {
        const {isValid, isWritable, isAdd, actionEnabled} = this.model;

        return [
            button({
                text: 'Close',
                icon: 'cross',
                onClick: this.onCloseClick
            }),
            filler(),
            button({
                text: 'Delete',
                icon: 'cross',
                disabled: !isValid,
                onClick: this.onDeleteClick,
                omit: !actionEnabled.del || isAdd
            }),
            button({
                text: 'Save',
                icon: 'tick',
                disabled: !isValid,
                onClick: this.onSaveClick,
                omit: !isWritable
            })
        ];
    }

    onCloseClick = () => {
        this.model.close();
    }

    onDeleteClick = () => {
        const model = this.model,
            warning = model.actionWarning.del;
        if (warning) {
            model.confirmModel.show({
                message: warning,
                onConfirm: () => model.deleteRecord()
            });
        } else {
            model.deleteRecord();
        }
    }

    onSaveClick = () => {
        const model = this.model,
            isAdd = model.isAdd,
            warning = model.actionWarning[isAdd ? 'add' : 'edit'];
        if (warning) {
            model.confirmModel.show({
                message: warning,
                onConfirm: () => model.saveRecord()
            });
        } else {
            model.saveRecord();
        }
    }

    getForm() {
        return vframe(this.getControlRows());
    }

    getControlRows() {
        return this.model.getInputProps().map(props => {
            return hbox({
                items: [
                    restLabel(props),
                    //  Needed to stretch control, and also avoid focus clipping?
                    controlGroup({
                        fill: true,
                        style: {flex: 1, margin: 1},
                        item: this.getControl(props)
                    })
                ],
                marginBottom: 10
            });
        });
    }

    getControl(props) {
        switch (props.type) {
            case 'display':
                return restDisplayField(props);
            case 'dropdown':
                return restDropdown(props);
            case 'boolean':
                return restCheckbox(props);
            case 'number':
                return restNumericInput(props);
            case 'textarea':
                return restTextArea(props);
            case 'text':
            default:
                return restTextInput(props);
        }
    }
}
export const restForm = elemFactory(RestForm);

//------------------------
// Controls
//------------------------
const restLabel = elemFactory(observer(
    ({fieldSpec, editor, value}) => {
        const text = fieldSpec.label || fieldSpec.name;
        return label({text, style: {width: '115px'}});
    }
));

const restDisplayField = elemFactory(observer(
    ({fieldName, value}) => {
        if (['lastUpdated', 'dateCreated'].includes(fieldName)) {
            value = fmtDateTime(value);
        }
        return label({text: value});
    }
));

const restDropdown = elemFactory(observer(
    class extends Component {
        render() {
            const {value, disabled, fieldSpec} = this.props,
                options = fieldSpec.lookupValues;

            return suggest({
                popoverProps: {popoverClassName: Classes.MINIMAL},
                itemPredicate: (q, v, index) => !v || v.includes(q),
                $items: options,
                onItemSelect: this.onItemSelect,
                itemRenderer: (item, itemProps) => {
                    return menuItem({key: item, text: item, onClick: itemProps.handleClick});
                },
                inputValueRenderer: s => s,
                inputProps: {
                    value: value || '',
                    disabled,
                    onChange: this.onChange
                }
            });
        }

        onChange = (ev) => {
            this.props.setValue(ev.target.value);
        }

        onItemSelect = (val) => {
            if (val) {
                this.props.setValue(val);
            }
        }

    }
));

const restCheckbox = elemFactory(observer(
    class extends Component {
        render() {
            const {value, disabled} = this.props;
            return checkbox({
                checked: !!value,
                disabled,
                onChange: this.onChange
            });
        }

        onChange = (ev) => {
            this.props.setValue(ev.target.checked);
        }
    }
));

const restNumericInput = elemFactory(observer(
    class extends Component {
        render() {
            const {value, disabled} = this.props;
            return numericInput({
                cls: 'pt-fill',
                buttonPosition: 'none',
                value: value,
                disabled,
                onValueChange: this.onValueChange
            });
        }

        onValueChange = (val, valAsString) => {
            val = (valAsString === '') ? null : val;
            this.props.setValue(val);
        }
    }
));

const restTextArea = elemFactory(observer(
    class extends Component {
        render() {
            const {value, disabled} = this.props;
            return textArea({
                cls: 'pt-fill',
                value: value || '',
                disabled,
                onChange: this.onChange
            });
        }

        onChange = (ev) => {
            this.props.setValue(ev.target.value);
        }
    }
));

const restTextInput = elemFactory(observer(
    class extends Component {
        render() {
            const {value, disabled} = this.props;
            return inputGroup({
                cls: 'pt-fill',
                type: 'text',
                value: value || '',
                disabled,
                onChange: this.onChange
            });
        }

        onChange = (ev) => {
            this.props.setValue(ev.target.value);
        }
    }
));