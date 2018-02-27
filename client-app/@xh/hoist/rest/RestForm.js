/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {loadMask, confirm} from 'hoist/cmp';
import {filler, vframe, hbox} from 'hoist/layout';
import {observer} from 'hoist/mobx';
import {fmtDateTime} from 'hoist/format';

import {
    Classes, button, checkbox, dialog, dialogBody,
    dialogFooter, dialogFooterActions, controlGroup, inputGroup,
    label, menuItem, numericInput, select, suggest, textArea
} from 'hoist/kit/blueprint';

@hoistComponent()
export class RestForm extends Component {

    render() {
        const {record, isAdd} = this.model;
        if (!record) return null;

        return dialog({
            title: isAdd ? 'Add Record' : 'Edit Record',
            icon: isAdd ? 'plus' : 'edit',
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
            confirm({model: model.confirmModel}),
            loadMask({model: model.loadModel})
        ];
    }

    getButtons() {
        const {isValid, isWritable, isAdd, actionEnabled} = this.model;

        return [
            button({
                text: 'Delete',
                icon: 'cross',
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
                icon: 'tick',
                intent: 'success',
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
            case 'select':
                return restSelect(props);
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

const restSelect = elemFactory(observer(
    class extends Component {
        render() {
            const {value, disabled, fieldSpec} = this.props,
                options = fieldSpec.lookupValues;

            return select({
                popoverProps: {popoverClassName: Classes.MINIMAL},
                $items: options,
                onItemSelect: this.onItemSelect,
                itemRenderer: (item, itemProps) => {
                    return menuItem({key: item, text: item, onClick: itemProps.handleClick, disabled});
                },
                filterable: false,
                items: button({text: value || options[0]}),
                disabled
            });
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