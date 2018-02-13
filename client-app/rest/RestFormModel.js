/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {forOwn} from 'lodash';
import {observable, computed, action} from 'hoist/mobx';
import {Classes, button, dialog, dialogBody, dialogFooter, dialogFooterActions, inputGroup, label, menuItem, numericInput, select, suggest, textArea} from 'hoist/kit/blueprint';
import {span, vbox, filler} from 'hoist/layout';
import {fmtDateTime} from 'hoist/format';
import {ConfirmModel} from 'hoist/cmp/confirm/ConfirmModel';

export class RestFormModel {

    //---------------
    // Properties
    //----------------
    enableAdd = true;
    enableEdit = true;
    enableDelete = true;

    recordSpec = null;
    editors = [];

    confirmModel = new ConfirmModel();

    // If not null, this will be displayed in a modal dialogs
    @observable formRecord = null;

    @computed
    get formIsAdd() {
        const rec = this.formRecord;
        return (rec && rec.id === null);
    }

    @computed
    get formIsValid() {
        const fieldSpecs = this.recordSpec.fields;
        let valid = true;
        forOwn(this.formRecord, (v, k) => {
            const spec = fieldSpecs.find(it => it.name === k);
            if (spec && !spec.allowNull && (v == null || v === '')) valid = false;
        });
        return valid;
    }

    @computed
    get formIsWritable() {
        const {formIsAdd, enableAdd, enableEdit} = this;
        return (formIsAdd && enableAdd) || (!formIsAdd  && enableEdit);
    }

    constructor(
        enableAdd,
        enableEdit,
        enableDelete,
        recordSpec,
        editWarning,
        editors
    ) {
        this.enableAdd = enableAdd;
        this.enableEdit = enableEdit;
        this.enableDelete = enableDelete;
        this.editors = editors;
        this.recordSpec = recordSpec; // need this?
        this.editWarning = editWarning;
    }

    getForm() {
        const {editors, recordSpec, formRecord} = this,
            fields = recordSpec.fields,
            items = [];

        editors.forEach(editor => {
            const fieldSpec = fields.find(it => it.name === editor.field);
            if (fieldSpec.typeField) fieldSpec.type = this.getTypeFromValueField(formRecord, fields, fieldSpec);

            const inputConfig = this.getInputConfig(fieldSpec, editor, formRecord),
                inputType = this.getInputType(fieldSpec, editor);

            items.push(this.createFieldLabel(fieldSpec, inputConfig));
            switch (inputType) {
                case 'display':
                    items.push(this.createDisplayField(inputConfig));
                    break;
                case 'dropdown':
                    items.push(this.createDropdown(inputConfig));
                    break;
                case 'boolean':
                    items.push(this.createBooleanDropdown(inputConfig));
                    break;
                case 'number':
                    items.push(this.createNumberInput(inputConfig));
                    break;
                case 'textarea':
                    items.push(this.createTextAreaInput(inputConfig));
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

    createFieldLabel(fieldSpec, inputConfig) {
        const text = fieldSpec.label || fieldSpec.name,
            suffix = (inputConfig.editor.additionsOnly && inputConfig.defaultValue) ? '(Read Only)' : '';
        return label({text: text + suffix, style: {width: '115px', paddingBottom: 5}});
    }

    createDisplayField(config) {
        if (['lastUpdated', 'dateCreated'].includes(config.fieldSpec.name)) config.defaultValue = fmtDateTime(config.defaultValue);
        return span({item: config.defaultValue, style: {marginBottom: 5, padding: '5 0'}});
    }

    createDropdown(config) {
        const options = config.fieldSpec.lookupValues,
            handler = this.getMemoizedHandler(config.field, 'onValueChange');

        // 'hack' to allow additions(not built in), overrides itemPredicate, see note above handleAdditions function
        // const itemListPredicate = config.editor.allowAdditions ? this.handleAdditions : null;

        return suggest({
            className: 'rest-form-dropdown-blueprint',
            popoverProps: {popoverClassName: Classes.MINIMAL},
            // itemListPredicate: itemListPredicate,
            itemPredicate: (q, v, index) => !v || v.includes(q),
            $items: options,
            onItemSelect: handler,
            itemRenderer: ({handleClick, isActive, item}) => {
                return menuItem({key: item, onClick: handleClick, text: item});
            },
            inputValueRenderer: s => s,
            inputProps: { // TODO: still allowing additions without adding to the drop down.
                defaultValue: config.defaultValue,
                // TODO need to somehow set current value on visible component
                value: undefined, // console warning dictated this undefined if I want to use default val
                style: {marginBottom: 5},
                disabled: config.isDisabled
            }
        });
    }

    createBooleanDropdown(config) {
        const currentText = config.defaultValue.toString(),
            handler = this.getMemoizedHandler(config.field, 'onBoolChange');

        return select({
            className: 'rest-form-dropdown-blueprint',
            popoverProps: {popoverClassName: Classes.MINIMAL},
            filterable: false,
            $items: ['true', 'false'],
            items: button({text: currentText, rightIconName: 'caret-down', style: {marginBottom: 5}}),
            onItemSelect: handler,
            itemRenderer: ({handleClick, isActive, item}) => {
                return menuItem({key: item, onClick: handleClick, text: item});
            },
            disabled: config.isDisabled
        });
    }

    createNumberInput(config) {
        const handler = this.getMemoizedHandler(config.field, 'onValueChange');
        return numericInput({
            style: {marginBottom: 5},
            value: config.defaultValue,
            onValueChange: handler,
            disabled: config.isDisabled
        });
    }

    createTextAreaInput(config) {
        const handler = this.getMemoizedHandler(config.field, 'onValueChange');
        return textArea({
            style: {marginBottom: 5},
            defaultValue: config.defaultValue,
            onChange: handler,
            disabled: config.isDisabled
        });
    }

    createTextInput(config) {
        const handler = this.getMemoizedHandler(config.field, 'onValueChange');
        return inputGroup({
            defaultValue: config.defaultValue,
            className: `xhField-${config.field}`,
            onChange: handler,
            type: 'text',
            style: {marginBottom: 5},
            disabled: config.isDisabled
        });
    }

    // one problem is that this fires on each keystroke, makes for a funky list of choices, ie: n, ne, new
    // input group allows input without this, it's just not added to the dropdown or set as the value
    // once the general value setting problem is solved this may be unneeded
    handleAdditions(query, list, index) {
        if (query && !list.includes(query)) list.push(query);
        const ret = list.filter(it => it.includes(query));
        return query ? ret : list;
    }

    onValueChange = (value, field) => {
        this.setFormValue(field, value);
    }

    onBoolChange = (value, field) => {
        this.setFormValue(field, value === 'true');
    }

    getInputConfig(fieldSpec, editor, formRecord) {
        const defaultValue = formRecord[fieldSpec.name],
            isDisabled = fieldSpec.readOnly || (editor.additionsOnly && !this.formIsAdd);

        return {
            editor: editor,
            fieldSpec: fieldSpec,
            field: fieldSpec.name,
            defaultValue: defaultValue == null ? '' : defaultValue,
            isDisabled: isDisabled
        };
    }

    getInputType(fieldSpec, editor) {
        if (editor.type === 'displayField') return 'display';
        if (fieldSpec.lookupValues) return 'dropdown';
        if (fieldSpec.type === 'bool' || fieldSpec.type === 'boolean') return 'boolean';
        if (fieldSpec.type === 'int') return 'number';
        if (editor.type === 'textarea' || fieldSpec.type === 'json') return 'textarea';
        return 'text';
    }

    getTypeFromValueField(formRecord, fields, fieldSpec) {
        return formRecord[fields.find(it => it.name === fieldSpec.typeField).name];
    }

    getMemoizedHandler(field, handlerName) {
        if (this[field + 'Handler']) return this[field + 'Handler'];
        const handler = (valOrEvent) => {
            const val = (typeof valOrEvent === 'object') ? valOrEvent.target.value : valOrEvent;
            this[handlerName](val, field);
        };
        this[field + 'Handler'] = handler;
        return handler;
    }

    //-----------------
    // Actions
    //------------------
    @action
    closeForm() {
        this.formRecord = null;
    }

    @action
    openAddForm() {
        const newRec = {id: null},
            fieldSpecs = this.recordSpec.fields;

        // must start with full formed dummy rec for validation purposes
        // from MobX: a computed property won't re-run if none of the data used in the previous computation changed.
        fieldSpecs.forEach(spec => {
            newRec[spec.name] = null;
        });

        this.formRecord = newRec;
    }

    @action
    openEditForm(rec)  {
        console.log('adding rec');
        this.formRecord = Object.assign({}, rec);
    }

    @action
    setFormValue = (field, value) => {
        this.formRecord[field] = value;
    }

}