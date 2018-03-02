/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {loadMask, message} from 'hoist/cmp';
import {filler, vframe, hbox} from 'hoist/layout';
import {observer} from 'hoist/mobx';
import {fmtDateTime} from 'hoist/format';
import {Icon} from 'hoist/icon';

import {
    Classes, button, checkbox, dialog, dialogBody,
    dialogFooter, dialogFooterActions, controlGroup, inputGroup,
    label, menuItem, numericInput, suggest, textArea
} from 'hoist/kit/blueprint';

@hoistComponent()
export class RestForm extends Component {

    render() {
        const {record, isAdd} = this.model;
        if (!record) return null;

        return dialog({
            title: isAdd ? 'Add Record' : 'Edit Record',
            icon: isAdd ? Icon.add : Icon.edit,
            cls: this.darkTheme ? 'xh-dark' : '',
            isOpen: true,
            isCloseButtonShown: false,
            items: this.getDialogItems()
        });
    }

    //------------------------
    // Implementation
    //------------------------
    getDialogItems() {
        const model = this.model;
        return [
            dialogBody(this.getForm()),
            dialogFooter(
                dialogFooterActions(this.getButtons())
            ),
            message({model: model.messageModel}),
            loadMask({model: model.loadModel})
        ];
    }

    getButtons() {
        const {isFormValid, isWritable, isAdd, actionEnabled} = this.model;

        return [
            button({
                text: 'Delete',
                icon: Icon.delete,
                intent: 'danger',
                onClick: this.onDeleteClick,
                omit: !actionEnabled.del || isAdd
            }),
            filler(),
            button({
                text: 'Cancel',
                onClick: this.onCloseClick
            }),
            button({
                text: 'Save',
                icon: Icon.check,
                intent: 'success',
                disabled: !isFormValid,
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
            model.messageModel.confirm({
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
            model.messageModel.confirm({
                message: warning,
                onConfirm: () => model.saveRecord()
            });
        } else {
            model.saveRecord();
        }
    }

    getForm() {
        const rows = this.model.getInputProps().map(props => {
            return hbox({
                cls: 'xh-mb',
                items: [
                    restLabel(props),
                    //  Needed to stretch control, and also avoid focus clipping?
                    controlGroup({
                        fill: true,
                        style: {flex: 1, margin: 1},
                        item: this.getControl(props)
                    })
                ]
            });
        });
        return vframe(rows);
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
            value = value ? fmtDateTime(value) : '';
        }
        return label({text: value});
    }
));

const restDropdown = elemFactory(observer(
    class extends Component {
        render() {
            const {model, value, disabled, fieldSpec, fieldName} = this.props,
                options = fieldSpec.lookupValues;
            if (!model.record) return null;

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
                    className: model.isFieldValid(fieldName) ? '' : 'pt-intent-danger',
                    disabled,
                    onChange: this.onChange
                }
            });
        }

        onChange = (ev) => {
            const {model, fieldName} = this.props;
            model.setValue(fieldName, ev.target.value);
        }

        onItemSelect = (val) => {
            if (val) {
                const {model, fieldName} = this.props;
                model.setValue(fieldName, val);
            }
        }
    }
));

const restCheckbox = elemFactory(observer(
    class extends Component {
        render() {
            const {model, value, disabled, fieldName} = this.props;
            if (!model.record) return null;

            if (!model.isFieldValid(fieldName)) {
                console.warn('Required boolean fields should provide a defaultValue' +
                    ' If boolean field is nullable please use a dropdown.');
            }

            return checkbox({
                checked: !!value,
                disabled,
                onChange: this.onChange
            });
        }

        onChange = (ev) => {
            const {model, fieldName} = this.props;
            model.setValue(fieldName, ev.target.checked);
        }
    }
));

const restNumericInput = elemFactory(observer(
    class extends Component {
        render() {
            const {model, value, disabled, fieldName} = this.props;
            if (!model.record) return null;

            return numericInput({
                cls: 'pt-fill',
                intent: model.isFieldValid(fieldName) ? 'none' : 'danger',
                buttonPosition: 'none',
                value: value,
                disabled,
                onValueChange: this.onValueChange
            });
        }

        onValueChange = (val, valAsString) => {
            const {model, fieldName} = this.props;
            val = (valAsString === '') ? null : val;
            model.setValue(fieldName, val);
        }
    }
));

const restTextArea = elemFactory(observer(
    class extends Component {
        render() {
            const {model, value, disabled, fieldName} = this.props,
                cls = model.isFieldValid(fieldName) ? 'pt-fill' : 'pt-fill pt-intent-danger';
            if (!model.record) return null;

            return textArea({
                cls: cls,
                value: value || '',
                disabled,
                onChange: this.onChange
            });
        }

        onChange = (ev) => {
            const {model, fieldName} = this.props;
            model.setValue(fieldName, ev.target.value);
        }
    }
));

const restTextInput = elemFactory(observer(
    class extends Component {
        render() {
            const {model, value, disabled, fieldName} = this.props,
                cls = model.isFieldValid(fieldName) ? 'pt-fill' : 'pt-fill pt-intent-danger';
            if (!model.record) return null;

            return inputGroup({
                cls: cls,
                type: 'text',
                value: value || '',
                disabled,
                onChange: this.onChange
            });
        }

        onChange = (ev) => {
            const {model, fieldName} = this.props;
            model.setValue(fieldName, ev.target.value);
        }
    }
));