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
import {jsonEditor} from 'hoist/cmp';

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
        this.model.getInputConfigs().forEach(inputConfig => {
            items.push(this.createFieldLabel(inputConfig));
            switch (inputConfig.type) {
                case 'display':
                    items.push(this.createDisplayField(inputConfig));
                    break;
                case 'dropdown':
                    items.push(this.createDropdown(inputConfig));
                    break;
                case 'boolean':
                    items.push(this.createCheckbox(inputConfig));
                    break;
                case 'number':
                    items.push(this.createNumberInput(inputConfig));
                    break;
                case 'textarea':
                    items.push(this.createTextAreaInput(inputConfig));
                    break;
                case 'jsonEditor':
                    items.push(this.createJsonEditor(inputConfig));
                    break;
                case 'text':
                default:
                    items.push(this.createTextInput(inputConfig));
            }
        });

        return vbox({
            cls: 'rest-form',
            width: 400,
            padding: 10,
            items
        });
    }

    createFieldLabel(config) {
        const fieldSpec = config.fieldSpec,
            editor = config.editor,
            text = fieldSpec.label || fieldSpec.name,
            suffix = (editor.additionsOnly && config.defaultValue) ? '(Read Only)' : '';
        return label({text: text + suffix, style: {width: '115px', marginBottom: 5}});
    }

    createDisplayField(config) {
        if (['lastUpdated', 'dateCreated'].includes(config.fieldSpec.name)) config.defaultValue = fmtDateTime(config.defaultValue);
        return span({item: config.defaultValue, style: {marginBottom: 10, padding: '5 0'}});
    }

    createDropdown(config) {
        const options = config.fieldSpec.lookupValues,
            handler = this.getMemoizedHandler(config);

        // 'hack' to allow additions(not built in), overrides itemPredicate, see note above handleAdditions function
        // const itemListPredicate = config.editor.allowAdditions ? this.handleAdditions : null;

        return suggest({
            className: 'rest-form-dropdown-blueprint',
            popoverProps: {popoverClassName: Classes.MINIMAL},
            // itemListPredicate: itemListPredicate,
            itemPredicate: (q, v, index) => !v || v.includes(q),
            $items: options,
            onItemSelect: handler,
            itemRenderer: (item, itemProps) => {
                return menuItem({key: item, onClick: itemProps.handleClick, text: item}); // can I use handleClick to update inputField's display
            },
            inputValueRenderer: s => s,
            inputProps: { // TODO: still allowing additions without adding to the drop down.
                defaultValue: config.defaultValue,
                // TODO need to somehow set current value on visible component
                // maybe helpful: you can pass value and onChange here to override Suggest's own behavior. might help with addtions
                value: undefined, // console warning dictated this undefined if I want to use default val
                style: {marginBottom: 5},
                disabled: config.isDisabled
            }
        });
    }

    createCheckbox(config) {
        const handler = this.getMemoizedHandler(config);

        return checkbox({
            defaultChecked: config.defaultValue,
            onChange: handler,
            disabled: config.isDisabled
        });
    }

    createNumberInput(config) {
        const handler = this.getMemoizedHandler(config);
        return numericInput({
            style: {marginBottom: 10},
            value: config.defaultValue,
            onValueChange: handler,
            disabled: config.isDisabled
        });
    }

    createTextAreaInput(config) {
        const handler = this.getMemoizedHandler(config);
        return textArea({
            style: {marginBottom: 10},
            defaultValue: config.defaultValue,
            onChange: handler,
            disabled: config.isDisabled
        });
    }

    createJsonEditor(config) {
        const handler = this.getMemoizedHandler(config);
        return jsonEditor({
            options: {
                mode: {
                    name: 'application/javascript',
                    json: true
                }
            },
            style: {marginBottom: 10},
            value: config.defaultValue,
            onChange: handler,
            disabled: config.isDisabled
        });
    }

    createTextInput(config) {
        const handler = this.getMemoizedHandler(config);
        return inputGroup({
            style: {marginBottom: 10},
            defaultValue: config.defaultValue,
            onChange: handler,
            type: 'text',
            disabled: config.isDisabled
        });
    }

    getMemoizedHandler(config) {
        const type = config.type,
            field = config.field,
            handlerName = type + field + 'Handler'; // including type allows for new handlers to be created for fields whose type may change e.g. config's prodValue

        if (this[handlerName]) return this[handlerName];

        const handler = (valOrEvent) => {
            let val = valOrEvent;
            if (typeof valOrEvent === 'object') val = valOrEvent.target.value;
            if (type === 'boolean') val = valOrEvent.target.checked;
            this.model.setValue(field, val);
        };

        this[handlerName] = handler;
        return handler;
    }

    // one problem is that this fires on each keystroke, makes for a funky list of choices, ie: n, ne, new
    // input group allows input without this, it's just not added to the dropdown or set as the value
    // once the general value setting problem is solved this may be unneeded
    handleAdditions(query, list, index) {
        if (query && !list.includes(query)) list.push(query);
        const ret = list.filter(it => it.includes(query));
        return query ? ret : list;
    }
}
export const restForm = elemFactory(RestForm);