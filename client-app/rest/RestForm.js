/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {Classes, button, checkbox, dialog, dialogBody, dialogFooter, dialogFooterActions, inputGroup, label, menuItem, numericInput, suggest, textArea} from 'hoist/kit/blueprint';
import {elemFactory} from 'hoist';
import {filler, span, vbox} from 'hoist/layout';
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
        const items = [];
        this.model.getInputProps().forEach(props => {
            items.push(restLabel(props));
            items.push(this.getControl(props));
        });

        // TODO:  This should be a (potentially) scrollable table, as in hoist-sencha.
        // Dialog itself needs to have a max height so buttons are always available.
        return vbox({
            cls: 'rest-form',
            width: 400,
            padding: 10,
            items
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
        const text = fieldSpec.label || fieldSpec.name,
            suffix = (editor.additionsOnly && value) ? ' (Read Only)' : '';
        return label({text: text + suffix, style: {width: '115px', marginBottom: 5}});
    }
));

const restDisplayField = elemFactory(observer(
    ({fieldName, value}) => {
        if (['lastUpdated', 'dateCreated'].includes(fieldName)) {
            value = fmtDateTime(value);
        }
        return span({item: value, style: {marginBottom: 10, padding: '5 0'}});
    }
));

const restDropdown = elemFactory(observer(
    class extends Component {
        render() {
            const {value, disabled, fieldSpec} = this.props,
                options = fieldSpec.lookupValues;

            return suggest({
                className: 'rest-form-dropdown-blueprint',
                popoverProps: {popoverClassName: Classes.MINIMAL},
                itemPredicate: (q, v, index) => !v || v.includes(q),
                $items: options,
                onItemSelect: this.onItemSelect,
                itemRenderer: (item, itemProps) => {
                    return menuItem({key: item, text: item, onClick: itemProps.handleClick});
                },
                inputValueRenderer: s => s,
                inputProps: {
                    style: {marginBottom: 5},
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
                style: {marginBottom: 10},
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
                style: {marginBottom: 10},
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
                type: 'text',
                style: {marginBottom: 10},
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